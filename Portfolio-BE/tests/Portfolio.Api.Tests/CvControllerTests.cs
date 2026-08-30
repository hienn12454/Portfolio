using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Portfolio.Domain.Entities;
using Xunit;

namespace Portfolio.Api.Tests;

/// <summary>
/// Covers /api/cv (previously untested). Unlike <see cref="ApiIntegrationTests"/>, each test here
/// gets its own <see cref="CustomWebApplicationFactory"/> (own in-memory database) instead of
/// sharing one via IClassFixture — CvController operates on a single, global "most recently
/// updated" CV row, so isolated instances avoid tests stomping on each other's data.
/// </summary>
public class CvControllerTests
{
    private static async Task SeedAdminAsync(CustomWebApplicationFactory factory, string clerkUserId)
    {
        await factory.SeedAsync(db =>
        {
            db.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                ClerkUserId = clerkUserId,
                Email = "admin@example.com",
                Role = "Admin",
                IsActive = true
            });
            return Task.CompletedTask;
        });
    }

    [Fact]
    public async Task GetCv_WhenNoProfileExists_ReturnsOkWithNullBody()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/cv");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await response.Content.ReadAsStringAsync()).Trim().Should().Be("null");
    }

    [Fact]
    public async Task GetCv_ReturnsPublicProfile()
    {
        using var factory = new CustomWebApplicationFactory();
        await factory.SeedAsync(db =>
        {
            db.CvProfiles.Add(new CvProfile { Id = Guid.NewGuid(), FullName = "Nguyễn Văn A", IsPublic = true });
            return Task.CompletedTask;
        });
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/cv");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await response.Content.ReadAsStringAsync()).Should().Contain("Nguyễn Văn A");
    }

    [Fact]
    public async Task GetCvAdmin_NonAdmin_ReturnsForbidden()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", "plain-" + Guid.NewGuid());

        var response = await client.GetAsync("/api/cv/admin");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpsertCv_NonAdmin_ReturnsForbidden()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", "plain-" + Guid.NewGuid());

        var response = await client.PutAsJsonAsync("/api/cv", new { fullName = "Ai đó" });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpsertCv_MissingFullName_ReturnsBadRequestInVietnamese()
    {
        var sub = "admin-" + Guid.NewGuid();
        using var factory = new CustomWebApplicationFactory();
        await SeedAdminAsync(factory, sub);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", sub);

        var response = await client.PutAsJsonAsync("/api/cv", new { fullName = "   " });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("họ và tên");
    }

    [Fact]
    public async Task UpsertCv_InvalidEmail_ReturnsBadRequestInVietnamese()
    {
        var sub = "admin-" + Guid.NewGuid();
        using var factory = new CustomWebApplicationFactory();
        await SeedAdminAsync(factory, sub);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", sub);

        var response = await client.PutAsJsonAsync("/api/cv", new { fullName = "Nguyễn Văn A", email = "not-an-email" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("Email không hợp lệ");
    }

    [Theory]
    [InlineData("abc123")]
    [InlineData("123")]
    [InlineData("0812")]
    public async Task UpsertCv_InvalidPhone_ReturnsBadRequestInVietnamese(string badPhone)
    {
        var sub = "admin-" + Guid.NewGuid();
        using var factory = new CustomWebApplicationFactory();
        await SeedAdminAsync(factory, sub);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", sub);

        var response = await client.PutAsJsonAsync("/api/cv", new { fullName = "Nguyễn Văn A", phone = badPhone });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("Số điện thoại không hợp lệ");
    }

    [Theory]
    [InlineData("0912345678")]
    [InlineData("+84912345678")]
    [InlineData("091 234 5678")]
    public async Task UpsertCv_ValidPhone_ReturnsOk(string goodPhone)
    {
        var sub = "admin-" + Guid.NewGuid();
        using var factory = new CustomWebApplicationFactory();
        await SeedAdminAsync(factory, sub);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", sub);

        var response = await client.PutAsJsonAsync("/api/cv", new { fullName = "Nguyễn Văn A", phone = goodPhone });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpsertCv_InvalidAccentColor_ReturnsBadRequestInVietnamese()
    {
        var sub = "admin-" + Guid.NewGuid();
        using var factory = new CustomWebApplicationFactory();
        await SeedAdminAsync(factory, sub);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", sub);

        var response = await client.PutAsJsonAsync("/api/cv", new { fullName = "Nguyễn Văn A", accentColor = "blue" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("Màu chủ đạo không hợp lệ");
    }

    [Fact]
    public async Task UpsertCv_ValidPayload_CreatesProfileWithDefaults()
    {
        var sub = "admin-" + Guid.NewGuid();
        using var factory = new CustomWebApplicationFactory();
        await SeedAdminAsync(factory, sub);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", sub);

        var response = await client.PutAsJsonAsync("/api/cv", new
        {
            fullName = "Nguyễn Văn A",
            phone = "0912345678",
            email = "a@example.com"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        doc.RootElement.GetProperty("fullName").GetString().Should().Be("Nguyễn Văn A");
        doc.RootElement.GetProperty("template").GetString().Should().Be("classic");
        doc.RootElement.GetProperty("accentColor").GetString().Should().Be("#2563eb");
        doc.RootElement.GetProperty("viewCount").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task CvView_IncrementsViewCount()
    {
        using var factory = new CustomWebApplicationFactory();
        await factory.SeedAsync(db =>
        {
            db.CvProfiles.Add(new CvProfile { Id = Guid.NewGuid(), FullName = "Nguyễn Văn A", IsPublic = true, ViewCount = 4 });
            return Task.CompletedTask;
        });
        var client = factory.CreateClient();

        var response = await client.PostAsync("/api/cv/view", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        doc.RootElement.GetProperty("viewCount").GetInt32().Should().Be(5);
    }

    [Fact]
    public async Task CvView_NoPublicProfile_ReturnsNotFound()
    {
        using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsync("/api/cv/view", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
