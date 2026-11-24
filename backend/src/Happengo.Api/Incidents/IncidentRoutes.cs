using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Incidents;

internal sealed record ListIncidentsRequest([property: FromQuery(Name = "bbox")] string? Bbox);

internal static class IncidentRoutes
{
    public static RouteGroupBuilder Map(RouteGroupBuilder group)
    {
        group.MapGet("/incidents", List).AllowAnonymous().RequireRateLimiting(RateLimitPolicies.MapReads)
            .WithName("ListIncidents").WithTags("Incidents").WithSummary("List active public incidents in a map viewport.")
            .Produces<IncidentsResponse>().ProducesProblem(400).ProducesProblem(429);
        group.MapGet("/incidents/{id:guid}", Get).AllowAnonymous().RequireRateLimiting(RateLimitPolicies.MapReads)
            .WithName("GetIncident").WithTags("Incidents").Produces<IncidentResponse>().ProducesProblem(404);
        group.MapPost("/incidents", Create).AllowAnonymous().RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("CreateIncident").WithTags("Incidents").Produces<IncidentResponse>(201)
            .ProducesProblem(400).ProducesProblem(401).ProducesProblem(429);
        group.MapPost("/incidents/{id:guid}/vote", Vote).AllowAnonymous().RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("VoteIncident").WithTags("Incidents").Produces<IncidentResponse>()
            .ProducesProblem(401).ProducesProblem(404).ProducesProblem(409);
        group.MapPost("/incidents/{id:guid}/close", Close).AllowAnonymous().RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("CloseIncident").WithTags("Incidents").Produces<IncidentResponse>()
            .ProducesProblem(401).ProducesProblem(404).ProducesProblem(409);
        return group;
    }

    private static async Task<Results<Ok<IncidentsResponse>, ProblemHttpResult>> List(
        [AsParameters] ListIncidentsRequest request, HappengoDbContext db, ViewerContext viewer,
        IClock clock, CancellationToken ct)
    {
        if (!IncidentBoundingBoxParser.TryParse(request.Bbox, out var box, out var detail)) return Problems.InvalidBbox(detail);
        var now = clock.GetCurrentInstant();
        var minLng = box.MinLongitude; var minLat = box.MinLatitude; var maxLng = box.MaxLongitude; var maxLat = box.MaxLatitude;
        var incidents = await db.Incidents.FromSqlInterpolated($"""
            SELECT * FROM incidents
            WHERE location && ST_MakeEnvelope({minLng}, {minLat}, {maxLng}, {maxLat}, 4326)
            """).AsNoTracking()
            .Where(row => row.ClosedAt == null && now < row.LastConfirmedAt + Duration.FromHours(2)
                && now < row.CreatedAt + Duration.FromHours(12))
            .OrderByDescending(row => row.CreatedAt).Take(500).ToListAsync(ct);
        var incidentIds = incidents.Select(row => row.Id).ToArray();
        var counts = await db.IncidentVotes.Where(vote => incidentIds.Contains(vote.IncidentId))
            .GroupBy(vote => new { vote.IncidentId, vote.Vote })
            .Select(group => new { group.Key.IncidentId, group.Key.Vote, Count = group.Count() })
            .ToListAsync(ct);
        var countsByIncident = counts.GroupBy(item => item.IncidentId).ToDictionary(
            group => group.Key,
            group => (StillThere: group.FirstOrDefault(item => item.Vote == IncidentVoteValue.StillThere)?.Count ?? 0,
                Gone: group.FirstOrDefault(item => item.Vote == IncidentVoteValue.Gone)?.Count ?? 0));
        var myVotes = viewer.Viewer.UserId is Guid viewerId
            ? await db.IncidentVotes.Where(vote => incidentIds.Contains(vote.IncidentId) && vote.UserId == viewerId)
                .Select(vote => new { vote.IncidentId, vote.Vote }).ToDictionaryAsync(item => item.IncidentId, item => item.Vote, ct)
            : new Dictionary<Guid, IncidentVoteValue>();
        var items = incidents.Select(incident =>
        {
            var incidentCounts = countsByIncident.GetValueOrDefault(incident.Id);
            myVotes.TryGetValue(incident.Id, out var myVote);
            return incident.ToResponse(viewer.Viewer.UserId, incidentCounts.StillThere, incidentCounts.Gone,
                myVotes.ContainsKey(incident.Id) ? myVote : null, now);
        }).ToArray();
        return TypedResults.Ok(new IncidentsResponse(items));
    }

    private static async Task<Results<Ok<IncidentResponse>, ProblemHttpResult>> Get(
        Guid id, HappengoDbContext db, ViewerContext viewer, IClock clock, CancellationToken ct)
    {
        var incident = await db.Incidents.AsNoTracking().FirstOrDefaultAsync(row => row.Id == id, ct);
        if (incident is null) return Problems.NotFoundIncident();
        return TypedResults.Ok(await ResponseAsync(db, incident, viewer.Viewer.UserId, clock.GetCurrentInstant(), ct));
    }

    private static async Task<Results<Created<IncidentResponse>, ProblemHttpResult>> Create(
        CreateIncidentRequest request, HappengoDbContext db, ViewerContext viewer, IClock clock, CancellationToken ct)
    {
        if (viewer.Viewer.UserId is not Guid userId) return Problems.Unauthorized("A signed-in user is required to report an incident.");
        var now = clock.GetCurrentInstant();
        var utcStart = now.InUtc().Date.AtStartOfDayInZone(DateTimeZone.Utc).ToInstant();
        var utcEnd = utcStart + Duration.FromDays(1);
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock(hashtextextended({userId.ToString()}, 0))", ct);
        if (await db.Incidents.CountAsync(row => row.ReporterId == userId && row.CreatedAt >= utcStart && row.CreatedAt < utcEnd, ct) >= 5)
            return Problems.IncidentRateLimited("You can report up to 5 incidents per day.");
        var description = request.Description?.Trim() ?? "";
        var address = request.Address?.Trim() ?? "";
        if (!Enum.IsDefined(request.Category) || description.Length > 500 || address.Length is < 1 or > 500
            || !double.IsFinite(request.Longitude) || request.Longitude is < -180 or > 180
            || !double.IsFinite(request.Latitude) || request.Latitude is < -90 or > 90)
            return Problems.InvalidIncident("Category, description, address, and coordinates are invalid.");
        var row = new Incident
        {
            Id = Guid.NewGuid(), ReporterId = userId, Category = request.Category, Description = description,
            Location = GeoPoint.FromLngLat(request.Longitude, request.Latitude), Address = address,
            CreatedAt = now, LastConfirmedAt = now,
        };
        db.Incidents.Add(row);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return TypedResults.Created($"/v1/incidents/{row.Id}", row.ToResponse(userId, 0, 0, null, now));
    }

    private static async Task<Results<Ok<IncidentResponse>, ProblemHttpResult>> Vote(
        Guid id, VoteIncidentRequest request, HappengoDbContext db, ViewerContext viewer, IClock clock, CancellationToken ct)
    {
        if (viewer.Viewer.UserId is not Guid userId) return Problems.Unauthorized("A signed-in user is required to vote on an incident.");
        var row = await db.Incidents.FirstOrDefaultAsync(item => item.Id == id, ct);
        if (row is null) return Problems.NotFoundIncident();
        var now = clock.GetCurrentInstant();
        if (!IncidentActivity.IsActive(row.CreatedAt, row.LastConfirmedAt, row.ClosedAt, now)) return Problems.IncidentConflict("This incident is no longer active.");
        if (!Enum.IsDefined(request.Vote)) return Problems.InvalidIncident("Vote must be still_there or gone.");
        var vote = await db.IncidentVotes.FirstOrDefaultAsync(item => item.IncidentId == id && item.UserId == userId, ct);
        if (vote is null) db.IncidentVotes.Add(new IncidentVote { IncidentId = id, UserId = userId, Vote = request.Vote, UpdatedAt = now });
        else { vote.Vote = request.Vote; vote.UpdatedAt = now; }
        if (request.Vote == IncidentVoteValue.StillThere) row.LastConfirmedAt = now;
        await db.SaveChangesAsync(ct);
        var counts = await db.IncidentVotes.Where(item => item.IncidentId == id).GroupBy(item => item.Vote)
            .Select(items => new { Vote = items.Key, Count = items.Count() }).ToListAsync(ct);
        var stillThere = counts.FirstOrDefault(item => item.Vote == IncidentVoteValue.StillThere)?.Count ?? 0;
        var gone = counts.FirstOrDefault(item => item.Vote == IncidentVoteValue.Gone)?.Count ?? 0;
        if (gone > stillThere && gone >= 2)
        {
            row.ClosedAt = now; row.ClosedBy = null; row.CloseReason = "community";
            await db.SaveChangesAsync(ct);
        }
        return TypedResults.Ok(row.ToResponse(userId, stillThere, gone, request.Vote, now));
    }

    private static async Task<Results<Ok<IncidentResponse>, ProblemHttpResult>> Close(
        Guid id, HappengoDbContext db, ViewerContext viewer, IClock clock, CancellationToken ct)
    {
        if (viewer.Viewer.UserId is not Guid userId) return Problems.Unauthorized("A signed-in user is required to close an incident.");
        var row = await db.Incidents.FirstOrDefaultAsync(item => item.Id == id, ct);
        if (row is null) return Problems.NotFoundIncident();
        var now = clock.GetCurrentInstant();
        if (row.ReporterId != userId) return Problems.NotFoundIncident();
        if (!IncidentActivity.IsActive(row.CreatedAt, row.LastConfirmedAt, row.ClosedAt, now)) return Problems.IncidentConflict("This incident is no longer active.");
        row.ClosedAt = now; row.ClosedBy = userId; row.CloseReason = "reporter";
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(await ResponseAsync(db, row, userId, now, ct));
    }

    private static async Task<IncidentResponse> ResponseAsync(HappengoDbContext db, Incident row, Guid? viewerId, Instant now, CancellationToken ct)
    {
        var counts = await db.IncidentVotes.Where(item => item.IncidentId == row.Id).GroupBy(item => item.Vote)
            .Select(items => new { Vote = items.Key, Count = items.Count() }).ToListAsync(ct);
        var stillThere = counts.FirstOrDefault(item => item.Vote == IncidentVoteValue.StillThere)?.Count ?? 0;
        var gone = counts.FirstOrDefault(item => item.Vote == IncidentVoteValue.Gone)?.Count ?? 0;
        var myVote = viewerId is Guid userId
            ? await db.IncidentVotes.Where(item => item.IncidentId == row.Id && item.UserId == userId).Select(item => (IncidentVoteValue?)item.Vote).FirstOrDefaultAsync(ct)
            : null;
        return row.ToResponse(viewerId, stillThere, gone, myVote, now);
    }
}
