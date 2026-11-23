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

    public static ProblemHttpResult InvalidAttendance(string detail) =>
        TypedResults.Problem(
            statusCode: StatusCodes.Status409Conflict,
            title: "Attendance conflict",
            detail: detail,
            type: ProblemTypes.InvalidAttendance);
}
