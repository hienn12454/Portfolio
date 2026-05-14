using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;
using Portfolio.Domain.Entities;
using Svix;

namespace Portfolio.Api.Controllers;

[ApiController]
[Route("api/webhooks/clerk")]
public sealed class ClerkWebhooksController(
    IConfiguration configuration,
    ILogger<ClerkWebhooksController> logger,
    IApplicationDbContext dbContext)
    : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Handle(CancellationToken cancellationToken)
    {
        var webhookSecret = configuration["Clerk:WebhookSecret"];
        if (string.IsNullOrWhiteSpace(webhookSecret))
        {
            return Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Missing Clerk webhook secret configuration.");
        }

        using var reader = new StreamReader(Request.Body);
        var payload = await reader.ReadToEndAsync(cancellationToken);

        try
        {
            var svix = new Webhook(webhookSecret);
            var headers = new WebHeaderCollection
            {
                { "svix-id", Request.Headers["svix-id"].ToString() },
                { "svix-timestamp", Request.Headers["svix-timestamp"].ToString() },
                { "svix-signature", Request.Headers["svix-signature"].ToString() }
            };

            svix.Verify(payload, headers);

            using var document = JsonDocument.Parse(payload);
            var eventType = document.RootElement.GetProperty("type").GetString() ?? "unknown";
            logger.LogInformation("Clerk webhook received. Event type: {EventType}", eventType);

            var data = document.RootElement.GetProperty("data");

            switch (eventType)
            {
                case "user.created":
                case "user.updated":
                    await UpsertUserAsync(data, cancellationToken);
                    break;
                case "user.deleted":
                    await DeactivateUserAsync(data, cancellationToken);
                    break;
            }

            return Ok();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Invalid Clerk webhook signature.");
            return Unauthorized();
        }
    }

    private async Task UpsertUserAsync(JsonElement userData, CancellationToken cancellationToken)
    {
        var clerkUserId = userData.GetProperty("id").GetString();
        if (string.IsNullOrWhiteSpace(clerkUserId))
        {
            return;
        }

        var firstName = userData.TryGetProperty("first_name", out var firstNameValue)
            ? firstNameValue.GetString()
            : null;
        var lastName = userData.TryGetProperty("last_name", out var lastNameValue)
            ? lastNameValue.GetString()
            : null;
        var imageUrl = userData.TryGetProperty("image_url", out var imageUrlValue)
            ? imageUrlValue.GetString()
            : null;
        var username = userData.TryGetProperty("username", out var usernameValue)
            ? usernameValue.GetString()
            : null;

        string? email = null;
        if (userData.TryGetProperty("email_addresses", out var emailAddresses) &&
            emailAddresses.ValueKind == JsonValueKind.Array &&
            emailAddresses.GetArrayLength() > 0)
        {
            var primaryEmail = emailAddresses.EnumerateArray().FirstOrDefault();
            if (primaryEmail.ValueKind != JsonValueKind.Undefined &&
                primaryEmail.TryGetProperty("email_address", out var emailValue))
            {
                email = emailValue.GetString();
            }
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            logger.LogWarning("Skip Clerk user upsert due to missing email. ClerkUserId: {ClerkUserId}", clerkUserId);
            return;
        }

        var role = ResolveRole(userData, clerkUserId, email, username);

        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.ClerkUserId == clerkUserId, cancellationToken);
        if (user is null)
        {
            user = new User
            {
                ClerkUserId = clerkUserId
            };
            dbContext.Users.Add(user);
        }

        user.Email = email;
        user.FirstName = firstName;
        user.LastName = lastName;
        user.ImageUrl = imageUrl;
        user.Role = role;
        user.IsActive = true;

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task DeactivateUserAsync(JsonElement userData, CancellationToken cancellationToken)
    {
        var clerkUserId = userData.TryGetProperty("id", out var idValue)
            ? idValue.GetString()
            : null;

        if (string.IsNullOrWhiteSpace(clerkUserId))
        {
            return;
        }

        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.ClerkUserId == clerkUserId, cancellationToken);
        if (user is null)
        {
            return;
        }

        user.IsActive = false;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private string ResolveRole(JsonElement userData, string clerkUserId, string? email, string? username)
    {
        var adminIds = configuration["Clerk:AdminClerkUserIds"];
        if (!string.IsNullOrWhiteSpace(adminIds))
        {
            var isConfiguredAdmin = adminIds
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Any(x => string.Equals(x, clerkUserId, StringComparison.Ordinal));

            if (isConfiguredAdmin)
            {
                return "Admin";
            }
        }

        var adminEmails = configuration["Clerk:AdminEmails"];
        if (!string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(adminEmails))
        {
            var isAdminEmail = adminEmails
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Any(x => string.Equals(x, email, StringComparison.OrdinalIgnoreCase));
            if (isAdminEmail)
            {
                return "Admin";
            }
        }

        var adminUsernames = configuration["Clerk:AdminUsernames"] ?? "admin";
        if (!string.IsNullOrWhiteSpace(username))
        {
            var isAdminUsername = adminUsernames
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Any(x => string.Equals(x, username, StringComparison.OrdinalIgnoreCase));
            if (isAdminUsername)
            {
                return "Admin";
            }
        }

        if (userData.TryGetProperty("public_metadata", out var metadata) &&
            metadata.ValueKind == JsonValueKind.Object &&
            metadata.TryGetProperty("role", out var roleValue))
        {
            var metadataRole = roleValue.GetString();
            if (string.Equals(metadataRole, "admin", StringComparison.OrdinalIgnoreCase))
            {
                return "Admin";
            }
        }

        return "User";
    }
}
