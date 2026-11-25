using Microsoft.AspNetCore.Http.HttpResults;

namespace Happengo.Api.Infrastructure;

internal static class Problems
{
    public static ProblemHttpResult InvalidBbox(string detail) =>
        TypedResults.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Invalid bounding box",
            detail: detail,
            type: ProblemTypes.InvalidBbox);

    public static ProblemHttpResult InvalidTags(string detail) =>
        TypedResults.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Invalid tags",
            detail: detail,
            type: ProblemTypes.InvalidTags);

    public static ProblemHttpResult InvalidDateRange(string detail) =>
        TypedResults.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Invalid date range",
            detail: detail,
            type: ProblemTypes.InvalidDateRange);

    public static ProblemHttpResult InvalidEvent(string detail) =>
        TypedResults.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Invalid event",
            detail: detail,
            type: ProblemTypes.InvalidEvent);

    public static ProblemHttpResult NotFoundEvent() =>
        TypedResults.Problem(
            statusCode: StatusCodes.Status404NotFound,
            title: "Not found",
            detail: "No visible event exists for this request.",
            type: ProblemTypes.NotFound);

    public static ProblemHttpResult NotFoundProfile() =>
        TypedResults.Problem(
            statusCode: StatusCodes.Status404NotFound,
            title: "Not found",
            detail: "The user profile does not exist.",
            type: ProblemTypes.NotFound);

    public static ProblemHttpResult InvalidProfile(string detail) =>
        TypedResults.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Invalid profile",
            detail: detail,
            type: ProblemTypes.InvalidProfile);

    public static ProblemHttpResult Unauthorized(string detail) =>
        TypedResults.Problem(
            statusCode: StatusCodes.Status401Unauthorized,
            title: "Authentication required",
            detail: detail,
            type: ProblemTypes.Unauthorized);

    public static ProblemHttpResult InvalidAttendance(string detail) =>
        TypedResults.Problem(
            statusCode: StatusCodes.Status409Conflict,
            title: "Attendance conflict",
            detail: detail,
            type: ProblemTypes.InvalidAttendance);

    public static ProblemHttpResult EventConflict(string detail) =>
        TypedResults.Problem(
            statusCode: StatusCodes.Status409Conflict,
            title: "Event conflict",
            detail: detail,
            type: ProblemTypes.EventConflict);

    public static ProblemHttpResult NotFoundIncident() => TypedResults.Problem(
        statusCode: StatusCodes.Status404NotFound, title: "Not found", detail: "No incident exists for this request.", type: ProblemTypes.NotFound);

    public static ProblemHttpResult InvalidIncident(string detail) => TypedResults.Problem(
        statusCode: StatusCodes.Status400BadRequest, title: "Invalid incident", detail: detail, type: ProblemTypes.InvalidIncident);

    public static ProblemHttpResult IncidentConflict(string detail) => TypedResults.Problem(
        statusCode: StatusCodes.Status409Conflict, title: "Incident conflict", detail: detail, type: ProblemTypes.IncidentConflict);

    public static ProblemHttpResult IncidentRateLimited(string detail) => TypedResults.Problem(
        statusCode: StatusCodes.Status429TooManyRequests, title: "Incident report limit reached", detail: detail, type: ProblemTypes.IncidentRateLimited);

    public static ProblemHttpResult InvalidReport(string detail) => TypedResults.Problem(
        statusCode: StatusCodes.Status400BadRequest, title: "Invalid report", detail: detail, type: ProblemTypes.InvalidReport);

    public static ProblemHttpResult ReportConflict() => TypedResults.Problem(
        statusCode: StatusCodes.Status409Conflict, title: "Report already submitted", detail: "You have already reported this item.", type: ProblemTypes.ReportConflict);

    public static ProblemHttpResult NotFoundReportTarget() => TypedResults.Problem(
        statusCode: StatusCodes.Status404NotFound, title: "Not found", detail: "No reportable item exists for this request.", type: ProblemTypes.NotFound);

    public static ProblemHttpResult NotFoundModeration() => TypedResults.Problem(
        statusCode: StatusCodes.Status404NotFound, title: "Not found", detail: "No moderation resource exists for this request.", type: ProblemTypes.NotFound);

    public static ProblemHttpResult InvalidModerationAction(string detail) => TypedResults.Problem(
        statusCode: StatusCodes.Status400BadRequest, title: "Invalid moderation action", detail: detail, type: ProblemTypes.InvalidModerationAction);

    public static ProblemHttpResult ModerationConflict(string detail) => TypedResults.Problem(
        statusCode: StatusCodes.Status409Conflict, title: "Moderation conflict", detail: detail, type: ProblemTypes.ModerationConflict);
}
