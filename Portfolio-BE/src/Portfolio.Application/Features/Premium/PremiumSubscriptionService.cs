using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;
using Portfolio.Domain.Entities;

namespace Portfolio.Application.Features.Premium;

public interface IPremiumSubscriptionService
{
    IReadOnlyCollection<PremiumPlanInfo> GetPlans();
    Task<PremiumStatusResult> GetStatusAsync(Guid userId, CancellationToken cancellationToken);
    Task<bool> IsPremiumAsync(Guid userId, CancellationToken cancellationToken);
    Task<PremiumStatusResult> SubscribeOrRenewAsync(
        Guid userId, string planId, string paymentMethod, string? paymentReference, CancellationToken cancellationToken);
    Task<PremiumStatusResult> CancelAsync(Guid userId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<PremiumSubscriptionAdminItem>> GetAllAsync(CancellationToken cancellationToken);
}

public sealed class PremiumSubscriptionService(
    IApplicationDbContext dbContext,
    IDateTimeProvider dateTimeProvider) : IPremiumSubscriptionService
{
    // Mock pricing catalog (VND). Replace AmountPaid wiring with a real gateway later.
    private static readonly IReadOnlyDictionary<string, PremiumPlanInfo> Plans = new Dictionary<string, PremiumPlanInfo>
    {
        ["monthly"] = new PremiumPlanInfo("monthly", "Premium Tháng", 30, 99_000m, "VND"),
        ["yearly"] = new PremiumPlanInfo("yearly", "Premium Năm", 365, 990_000m, "VND")
    };

    public IReadOnlyCollection<PremiumPlanInfo> GetPlans() => Plans.Values.ToArray();

    public async Task<PremiumStatusResult> GetStatusAsync(Guid userId, CancellationToken cancellationToken)
    {
        var now = dateTimeProvider.UtcNow;
        var subscriptions = await dbContext.PremiumSubscriptions
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.ExpiresAtUtc)
            .ToListAsync(cancellationToken);

        // Lazily expire stale rows so the table reflects reality.
        var changed = false;
        foreach (var sub in subscriptions)
        {
            if (sub.ExpiresAtUtc <= now && sub.Status == "active")
            {
                sub.Status = "expired";
                changed = true;
            }
        }

        if (changed)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var current = subscriptions.FirstOrDefault(x => x.ExpiresAtUtc > now && x.Status != "expired");
        return BuildStatus(current, now);
    }

    public async Task<bool> IsPremiumAsync(Guid userId, CancellationToken cancellationToken)
    {
        var now = dateTimeProvider.UtcNow;
        return await dbContext.PremiumSubscriptions
            .AnyAsync(x => x.UserId == userId && x.ExpiresAtUtc > now && x.Status != "expired", cancellationToken);
    }

    public async Task<PremiumStatusResult> SubscribeOrRenewAsync(
        Guid userId, string planId, string paymentMethod, string? paymentReference, CancellationToken cancellationToken)
    {
        if (!Plans.TryGetValue(NormalizePlan(planId), out var plan))
        {
            throw new ArgumentException($"Unknown premium plan '{planId}'.", nameof(planId));
        }

        var now = dateTimeProvider.UtcNow;

        // Chain a renewal onto the end of the current still-valid period (no lost days).
        var currentExpiry = await dbContext.PremiumSubscriptions
            .Where(x => x.UserId == userId && x.ExpiresAtUtc > now && x.Status != "expired")
            .OrderByDescending(x => x.ExpiresAtUtc)
            .Select(x => (DateTime?)x.ExpiresAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        var startsAt = currentExpiry.HasValue && currentExpiry.Value > now ? currentExpiry.Value : now;
        var expiresAt = startsAt.AddDays(plan.DurationDays);

        var subscription = new PremiumSubscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Plan = plan.Id,
            Status = "active",
            StartedAtUtc = startsAt,
            ExpiresAtUtc = expiresAt,
            AmountPaid = string.Equals(paymentMethod, "admin", StringComparison.OrdinalIgnoreCase) ? 0m : plan.Price,
            Currency = plan.Currency,
            PaymentMethod = string.IsNullOrWhiteSpace(paymentMethod) ? "mock" : paymentMethod.Trim().ToLowerInvariant(),
            PaymentReference = string.IsNullOrWhiteSpace(paymentReference)
                ? $"MOCK-{Guid.NewGuid():N}"[..16]
                : paymentReference.Trim(),
            AutoRenew = true
        };

        dbContext.PremiumSubscriptions.Add(subscription);
        await dbContext.SaveChangesAsync(cancellationToken);

        return BuildStatus(subscription, now);
    }

    public async Task<PremiumStatusResult> CancelAsync(Guid userId, CancellationToken cancellationToken)
    {
        var now = dateTimeProvider.UtcNow;
        var activeSubscriptions = await dbContext.PremiumSubscriptions
            .Where(x => x.UserId == userId && x.ExpiresAtUtc > now && x.Status != "expired")
            .ToListAsync(cancellationToken);

        foreach (var sub in activeSubscriptions)
        {
            // Keep access until expiry, just stop auto-renew and mark cancelled.
            sub.AutoRenew = false;
            sub.Status = "cancelled";
            sub.CancelledAtUtc = now;
        }

        if (activeSubscriptions.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var current = activeSubscriptions
            .OrderByDescending(x => x.ExpiresAtUtc)
            .FirstOrDefault();
        return BuildStatus(current, now);
    }

    public async Task<IReadOnlyCollection<PremiumSubscriptionAdminItem>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await dbContext.PremiumSubscriptions
            .OrderByDescending(x => x.CreatedAtUtc)
            .Join(
                dbContext.Users,
                sub => sub.UserId,
                user => user.Id,
                (sub, user) => new PremiumSubscriptionAdminItem(
                    sub.Id,
                    sub.UserId,
                    user.Email,
                    user.DisplayName,
                    sub.Plan,
                    sub.Status,
                    sub.StartedAtUtc,
                    sub.ExpiresAtUtc,
                    sub.AmountPaid,
                    sub.Currency,
                    sub.PaymentMethod,
                    sub.AutoRenew))
            .ToListAsync(cancellationToken);
    }

    private static PremiumStatusResult BuildStatus(PremiumSubscription? current, DateTime now)
    {
        var isPremium = current is not null && current.ExpiresAtUtc > now;
        var daysRemaining = isPremium ? (int)Math.Ceiling((current!.ExpiresAtUtc - now).TotalDays) : 0;

        return new PremiumStatusResult(
            isPremium,
            current?.Plan,
            current?.Status ?? "none",
            current?.StartedAtUtc,
            current?.ExpiresAtUtc,
            current?.AutoRenew ?? false,
            daysRemaining,
            new PremiumEntitlements(isPremium, isPremium, isPremium));
    }

    private static string NormalizePlan(string planId)
        => string.IsNullOrWhiteSpace(planId) ? string.Empty : planId.Trim().ToLowerInvariant();
}

public sealed record PremiumPlanInfo(string Id, string Name, int DurationDays, decimal Price, string Currency);

public sealed record PremiumEntitlements(bool AiUnlimited, bool AdvancedCv, bool ProfileBadge);

public sealed record PremiumStatusResult(
    bool IsPremium,
    string? Plan,
    string Status,
    DateTime? StartedAtUtc,
    DateTime? ExpiresAtUtc,
    bool AutoRenew,
    int DaysRemaining,
    PremiumEntitlements Entitlements);

public sealed record PremiumSubscriptionAdminItem(
    Guid Id,
    Guid UserId,
    string Email,
    string? DisplayName,
    string Plan,
    string Status,
    DateTime StartedAtUtc,
    DateTime ExpiresAtUtc,
    decimal AmountPaid,
    string Currency,
    string PaymentMethod,
    bool AutoRenew);
