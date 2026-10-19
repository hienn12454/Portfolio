using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace Portfolio.Api.Tests;

/// <summary>
/// Covers /api/roadmap-plans (previously untested). This controller now backs the homepage's
/// Career Direction Lab wizard (skills → career → roadmap → courses), which calls
/// POST mine/generate with a specialty string like "Backend Engineer" — these tests pin down
/// that UserRoadmapPlanService.ResolveRoadmapSlug keeps matching those exact strings.
///
/// No OpenRouter API key is configured in the test host, so OpenRouterClient deterministically
/// returns its built-in Vietnamese fallback text instead of making a real network call — these
/// tests rely on that fallback behavior rather than mocking the client.
/// </summary>
public class UserRoadmapPlansControllerTests
{
    private static void AddAuth(HttpClient client, string sub, string email)
    {
        client.DefaultRequestHeaders.Add("X-Test-Sub", sub);
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
    }

    [Fact]
    public async Task GetToday_WithoutAuth_ReturnsUnauthorized()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/roadmap-plans/mine/today");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetToday_AuthenticatedWithoutEmail_ReturnsUnauthorized()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", "nouseremail-" + Guid.NewGuid());

        var response = await client.GetAsync("/api/roadmap-plans/mine/today");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GenerateMyPlan_MissingFields_ReturnsBadRequest()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();
        AddAuth(client, "user-" + Guid.NewGuid(), "a@example.com");

        var response = await client.PostAsJsonAsync("/api/roadmap-plans/mine/generate", new { track = "", specialty = "" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GenerateMyPlan_ValidRequest_ReturnsOkWithFallbackPlan()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();
        AddAuth(client, "user-" + Guid.NewGuid(), "a@example.com");

        var response = await client.PostAsJsonAsync("/api/roadmap-plans/mine/generate", new { track = "IT", specialty = "Backend Engineer" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        doc.RootElement.GetProperty("specialty").GetString().Should().Be("Backend Engineer");
        doc.RootElement.GetProperty("planMarkdown").GetString().Should().NotBeNullOrWhiteSpace();
        doc.RootElement.GetProperty("dailyTechnical").GetString().Should().NotBeNullOrWhiteSpace();
    }

    [Theory]
    [InlineData("Backend Engineer", "backend")]
    [InlineData("Frontend Engineer", "frontend")]
    [InlineData("DevOps Engineer", "devops")]
    [InlineData("Full-Stack Engineer", "full-stack")]
    public async Task GenerateMyPlan_SpecialtyResolvesToExpectedRoadmapSlug(string specialty, string expectedSlug)
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();
        AddAuth(client, "user-" + Guid.NewGuid(), "a@example.com");

        var response = await client.PostAsJsonAsync("/api/roadmap-plans/mine/generate", new { track = "IT", specialty });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        doc.RootElement.GetProperty("sourceRoadmapSlug").GetString().Should().Be(expectedSlug);
    }

    [Fact]
    public async Task GetToday_WhenNoPlanExists_AutoGeneratesOne()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();
        AddAuth(client, "user-" + Guid.NewGuid(), "a@example.com");

        var response = await client.GetAsync("/api/roadmap-plans/mine/today");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        doc.RootElement.GetProperty("track").GetString().Should().NotBeNullOrWhiteSpace();
        doc.RootElement.GetProperty("specialty").GetString().Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GetMine_ReturnsBothGeneratedPlans()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();
        AddAuth(client, "user-" + Guid.NewGuid(), "a@example.com");

        var first = await client.PostAsJsonAsync("/api/roadmap-plans/mine/generate", new { track = "IT", specialty = "Backend Engineer" });
        first.EnsureSuccessStatusCode();
        var second = await client.PostAsJsonAsync("/api/roadmap-plans/mine/generate", new { track = "IT", specialty = "Frontend Engineer" });
        second.EnsureSuccessStatusCode();

        var response = await client.GetAsync("/api/roadmap-plans/mine");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var specialties = doc.RootElement.EnumerateArray().Select(p => p.GetProperty("specialty").GetString()).ToList();
        specialties.Should().BeEquivalentTo(new[] { "Backend Engineer", "Frontend Engineer" });
    }
}
