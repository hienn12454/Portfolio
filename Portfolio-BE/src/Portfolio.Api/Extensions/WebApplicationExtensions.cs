using Microsoft.EntityFrameworkCore;
using Portfolio.Infrastructure.Persistence;
using Portfolio.Domain.Entities;

namespace Portfolio.Api.Extensions;

public static class WebApplicationExtensions
{
    public static async Task ApplyDatabaseMigrationsAsync(this WebApplication app)
    {
        await using var scope = app.Services.CreateAsyncScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>()
            .CreateLogger("DatabaseMigration");

        try
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await dbContext.Database.MigrateAsync();

            if (!await dbContext.Skills.AnyAsync())
            {
                dbContext.Skills.AddRange(
                    new Skill
                    {
                        Name = "Backend Development",
                        Description = "Build secure and scalable APIs with clean architecture.",
                        DisplayOrder = 1,
                        IsVisible = true
                    },
                    new Skill
                    {
                        Name = "Frontend Engineering",
                        Description = "Create maintainable and responsive user interfaces.",
                        DisplayOrder = 2,
                        IsVisible = true
                    },
                    new Skill
                    {
                        Name = "System Design",
                        Description = "Design robust services and clear boundaries between modules.",
                        DisplayOrder = 3,
                        IsVisible = true
                    }
                );

                await dbContext.SaveChangesAsync();
                logger.LogInformation("Default skills seeded successfully.");
            }

            logger.LogInformation("Database migrations applied successfully.");
        }
        catch (Exception ex)
        {
            // Do not crash the whole API startup because of migration issues.
            logger.LogError(ex, "Database migration failed during startup. API will continue running.");
        }
    }
}
