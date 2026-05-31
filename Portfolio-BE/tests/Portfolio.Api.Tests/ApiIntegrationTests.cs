using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Portfolio.Domain.Entities;
using Xunit;

namespace Portfolio.Api.Tests;

public class ApiIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public ApiIntegrationTests(CustomWebApplicationFactory factory) => _factory = factory;

    // ── Public endpoints ──────────────────────────────────────────

    [Fact]
    public async Task Health_ReturnsOk()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task PremiumPlans_AreAvailablePublicly()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/premium/plans");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("monthly").And.Contain("yearly");
    }

    [Theory]
    [InlineData("/api/projects")]
    [InlineData("/api/articles")]
    [InlineData("/api/skills")]
    public async Task PublicCollections_ReturnOk(string path)
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync(path);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ContactMessage_ValidPayload_ReturnsOk()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/contact-messages", new
        {
            name = "Integration Tester",
            email = "tester@example.com",
            subject = "Hi",
            message = "Hello from the integration test."
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ContactMessage_MissingFields_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/contact-messages", new { name = "", email = "", message = "" });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ProjectLike_IncrementsCount()
    {
        var projectId = Guid.NewGuid();
        await _factory.SeedAsync(db =>
        {
            db.Projects.Add(new Project { Id = projectId, Title = "Likeable", Slug = $"likeable-{projectId}" });
            return Task.CompletedTask;
        });

        var client = _factory.CreateClient();
        var response = await client.PostAsync($"/api/projects/{projectId}/like", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        doc.RootElement.GetProperty("likeCount").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task ProjectLike_UnknownId_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsync($"/api/projects/{Guid.NewGuid()}/like", null);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Authenticated endpoints ───────────────────────────────────

    [Fact]
    public async Task PremiumMe_WithoutAuth_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/premium/me");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task PremiumMe_WithAuth_ReturnsStatus()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", "user-" + Guid.NewGuid());
        client.DefaultRequestHeaders.Add("X-Test-Email", "premium-user@example.com");

        var response = await client.GetAsync("/api/premium/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        doc.RootElement.GetProperty("isPremium").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task PremiumSubscribe_WithAuth_MakesUserPremium()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", "buyer-" + Guid.NewGuid());
        client.DefaultRequestHeaders.Add("X-Test-Email", "buyer@example.com");

        var response = await client.PostAsJsonAsync("/api/premium/me/subscribe", new { plan = "monthly" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        doc.RootElement.GetProperty("isPremium").GetBoolean().Should().BeTrue();
    }

    // ── Admin endpoints ───────────────────────────────────────────

    [Fact]
    public async Task ContactAdmin_NonAdmin_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", "plain-" + Guid.NewGuid());
        var response = await client.GetAsync("/api/contact-messages/admin");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ContactAdmin_AdminUser_ReturnsOk()
    {
        var adminSub = "admin-" + Guid.NewGuid();
        await _factory.SeedAsync(db =>
        {
            db.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                ClerkUserId = adminSub,
                Email = "admin@example.com",
                Role = "Admin",
                IsActive = true
            });
            return Task.CompletedTask;
        });

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", adminSub);
        var response = await client.GetAsync("/api/contact-messages/admin");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
