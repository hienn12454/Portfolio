using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Portfolio.Application.Abstractions;

namespace Portfolio.Api.Auth;

public sealed class AdminRequirementHandler(IApplicationDbContext dbContext) : AuthorizationHandler<AdminRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        AdminRequirement requirement)
    {
        var clerkUserId = ResolveClerkUserId(context.User);
        if (string.IsNullOrWhiteSpace(clerkUserId))
        {
            return;
        }

        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ClerkUserId == clerkUserId);

        if (user is not null && user.IsActive && user.Role == "Admin")
        {
            context.Succeed(requirement);
        }
    }

    private static string? ResolveClerkUserId(ClaimsPrincipal user)
    {
        return user.FindFirst("sub")?.Value
            ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.FindFirst("user_id")?.Value;
    }
}
