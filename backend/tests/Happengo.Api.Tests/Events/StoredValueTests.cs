using Happengo.Api.Attendance;
using Happengo.Api.Events;

namespace Happengo.Api.Tests.Events;

public sealed class StoredValueTests
{
    [Theory]
    [InlineData("private")]
    [InlineData("Public")]
    [InlineData("")]
    public void Unknown_visibility_throws(string stored)
    {
        var error = Assert.Throws<InvalidOperationException>(() => StoredVisibility.FromProvider(stored));
        Assert.Contains(stored, error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Unknown_approval_mode_throws()
    {
        Assert.Throws<InvalidOperationException>(() => StoredApprovalMode.FromProvider("closed"));
    }

    [Theory]
    [InlineData("canceled")]
    [InlineData("Attending")]
    public void Unknown_attendance_status_throws(string stored)
    {
        var error = Assert.Throws<InvalidOperationException>(() => StoredAttendanceStatus.FromProvider(stored));
        Assert.Contains(stored, error.Message, StringComparison.Ordinal);
    }
}
