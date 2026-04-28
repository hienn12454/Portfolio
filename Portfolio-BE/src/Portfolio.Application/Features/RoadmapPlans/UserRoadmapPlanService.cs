using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;
using Portfolio.Domain.Entities;

namespace Portfolio.Application.Features.RoadmapPlans;

public interface IUserRoadmapPlanService
{
    Task<UserRoadmapPlanResult> GenerateAndSaveAsync(Guid userId, string track, string specialty, CancellationToken cancellationToken);
    Task<UserRoadmapPlanResult> EnsureTodayPlanAsync(Guid userId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<UserRoadmapPlanResult>> GetMyPlansAsync(Guid userId, CancellationToken cancellationToken);
    Task<UserRoadmapPlanResult?> GetMyPlanByIdAsync(Guid userId, Guid planId, CancellationToken cancellationToken);
}

public sealed class UserRoadmapPlanService(
    IApplicationDbContext dbContext,
    IOpenRouterClient openRouterClient,
    IRoadmapShClient roadmapShClient,
    IDateTimeProvider dateTimeProvider)
    : IUserRoadmapPlanService
{
    private static readonly IReadOnlyCollection<string> KnownRoadmaps =
    [
        "devops", "backend", "frontend", "full-stack", "kubernetes", "docker", "linux", "aws", "terraform",
        "system-design", "aspnet-core", "nodejs", "react", "graphql", "postgresql", "redis"
    ];

    public async Task<UserRoadmapPlanResult> GenerateAndSaveAsync(
        Guid userId,
        string track,
        string specialty,
        CancellationToken cancellationToken)
    {
        var normalizedTrack = Normalize(track, 50, "it");
        var normalizedSpecialty = Normalize(specialty, 100, "devops");
        var roadmapSlug = ResolveRoadmapSlug(normalizedSpecialty);
        var roadmapTopics = await roadmapShClient.GetRoadmapTopicsAsync(roadmapSlug, cancellationToken);
        var generatedPlan = await openRouterClient.GenerateRoadmapPlanAsync(
            normalizedTrack,
            normalizedSpecialty,
            roadmapSlug,
            roadmapTopics,
            cancellationToken);
        var dailyTechnical = PickDailyTechnical(roadmapTopics);

        var entity = new UserRoadmapPlan
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Track = normalizedTrack,
            Specialty = normalizedSpecialty,
            SourceRoadmapSlug = roadmapSlug,
            PlanMarkdown = generatedPlan,
            DailyTechnical = dailyTechnical,
            DailyForDate = dateTimeProvider.VietnamToday
        };

        dbContext.UserRoadmapPlans.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Map(entity);
    }

    public async Task<UserRoadmapPlanResult> EnsureTodayPlanAsync(Guid userId, CancellationToken cancellationToken)
    {
        var latest = await dbContext.UserRoadmapPlans
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (latest is not null && latest.DailyForDate == dateTimeProvider.VietnamToday)
        {
            return Map(latest);
        }

        var track = latest?.Track ?? "IT";
        var specialty = latest?.Specialty ?? "DevOps";
        return await GenerateAndSaveAsync(userId, track, specialty, cancellationToken);
    }

    public async Task<IReadOnlyCollection<UserRoadmapPlanResult>> GetMyPlansAsync(Guid userId, CancellationToken cancellationToken)
    {
        var plans = await dbContext.UserRoadmapPlans
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(30)
            .ToListAsync(cancellationToken);

        return plans.Select(Map).ToList();
    }

    public async Task<UserRoadmapPlanResult?> GetMyPlanByIdAsync(Guid userId, Guid planId, CancellationToken cancellationToken)
    {
        var plan = await dbContext.UserRoadmapPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Id == planId, cancellationToken);

        return plan is null ? null : Map(plan);
    }

    private string PickDailyTechnical(IReadOnlyCollection<string> roadmapTopics)
    {
        var topicList = roadmapTopics.ToList();
        if (topicList.Count == 0)
        {
            return "Learn one core concept and implement a small hands-on lab.";
        }

        var index = Math.Abs(dateTimeProvider.VietnamToday.GetHashCode()) % topicList.Count;
        return topicList[index];
    }

    private static string ResolveRoadmapSlug(string specialty)
    {
        var normalized = specialty.Trim().ToLowerInvariant().Replace(" ", "-");
        var match = KnownRoadmaps.FirstOrDefault(item => normalized.Contains(item, StringComparison.OrdinalIgnoreCase));
        return match ?? "devops";
    }

    private static string Normalize(string? value, int maxLength, string fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static UserRoadmapPlanResult Map(UserRoadmapPlan entity)
    {
        return new UserRoadmapPlanResult(
            entity.Id,
            entity.Track,
            entity.Specialty,
            entity.SourceRoadmapSlug,
            entity.PlanMarkdown,
            entity.DailyTechnical,
            entity.DailyForDate,
            entity.CreatedAtUtc);
    }
}

public sealed record UserRoadmapPlanResult(
    Guid Id,
    string Track,
    string Specialty,
    string SourceRoadmapSlug,
    string PlanMarkdown,
    string DailyTechnical,
    DateOnly DailyForDate,
    DateTime CreatedAtUtc);
