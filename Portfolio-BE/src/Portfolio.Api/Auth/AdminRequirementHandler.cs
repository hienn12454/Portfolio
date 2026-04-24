using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;

namespace Portfolio.Api.Auth;

public sealed class AdminRequirementHandler(IApplicationDbContext dbContext) : AuthorizationHandler<AdminRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        AdminRequirement requirement)
    {
        var clerkUserId = context.User.FindFirst("sub")?.Value;
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
}
