using FluentAssertions;

namespace Portfolio.Api.Tests;

public class AdminPanelLogicTests
{
    private static readonly Guid EmptyGuid = Guid.Empty;

    [Fact]
    public void EmptyGuid_IsAllZeros_ShouldBeRecognized()
    {
        // The frontend EMPTY_GUID is "00000000-0000-0000-0000-000000000000"
        // This should be treated as "no ID" (create mode), not "update mode"
        var emptyGuidString = "00000000-0000-0000-0000-000000000000";
        var parsed = Guid.Parse(emptyGuidString);
        parsed.Should().Be(Guid.Empty);
        (parsed != Guid.Empty).Should().BeFalse("EMPTY_GUID should NOT trigger an update");
    }

    [Theory]
    [InlineData("/", "Homepage")]
    [InlineData("/cv", "CV Page")]
    [InlineData("/admin", "Admin Dashboard")]
    [InlineData("/auth", "Login Page")]
    [InlineData("/profile", "Profile")]
    [InlineData("/unknown", "/unknown")]
    public void PathLabel_ShouldMapKnownPaths(string path, string expected)
    {
        var result = GetPathLabel(path);
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData(7, 7)]   // 7d: -6 days to today = 7 days inclusive
    [InlineData(30, 30)] // 30d: -29 days to today = 30 days inclusive
    [InlineData(90, 90)] // 3m: -89 days to today = 90 days inclusive
    public void DateRange_DayCount_ShouldBeCorrect(int offsetDays, int expectedDays)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var start = today.AddDays(-(offsetDays - 1));
        var end = today;
        var dayCount = end.DayNumber - start.DayNumber + 1;
        dayCount.Should().Be(expectedDays);
    }

    private static string GetPathLabel(string path) => path switch
    {
        "/" => "Homepage",
        "/cv" => "CV Page",
        "/cv/edit" => "CV Editor",
        "/admin" => "Admin Dashboard",
        "/auth" => "Login Page",
        "/profile" => "Profile",
        _ => path
    };
}
