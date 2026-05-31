using FluentAssertions;
using Portfolio.Application.Features.Premium;
using Xunit;

namespace Portfolio.Api.Tests;

public class PremiumSubscriptionServiceTests
{
    private static PremiumSubscriptionService NewService(FakeClock clock, out Portfolio.Infrastructure.Persistence.ApplicationDbContext db)
    {
        db = TestDb.NewContext();
        return new PremiumSubscriptionService(db, clock);
    }

    [Fact]
    public void GetPlans_ReturnsMonthlyAndYearly()
    {
        var service = NewService(new FakeClock(), out _);
        var plans = service.GetPlans();

        plans.Should().HaveCount(2);
        plans.Select(p => p.Id).Should().Contain(new[] { "monthly", "yearly" });
        plans.Single(p => p.Id == "yearly").DurationDays.Should().Be(365);
    }

    [Fact]
    public async Task Subscribe_NewUser_BecomesPremium()
    {
        var clock = new FakeClock();
        var service = NewService(clock, out _);
        var userId = Guid.NewGuid();

        var status = await service.SubscribeOrRenewAsync(userId, "monthly", "mock", null, CancellationToken.None);

        status.IsPremium.Should().BeTrue();
        status.Plan.Should().Be("monthly");
        status.Entitlements.AiUnlimited.Should().BeTrue();
        status.ExpiresAtUtc.Should().BeCloseTo(clock.UtcNow.AddDays(30), TimeSpan.FromMinutes(1));
        (await service.IsPremiumAsync(userId, CancellationToken.None)).Should().BeTrue();
    }

    [Fact]
    public async Task Renew_ChainsFromCurrentExpiry()
    {
        var clock = new FakeClock();
        var service = NewService(clock, out _);
        var userId = Guid.NewGuid();

        await service.SubscribeOrRenewAsync(userId, "monthly", "mock", null, CancellationToken.None);
        var second = await service.SubscribeOrRenewAsync(userId, "monthly", "mock", null, CancellationToken.None);

        // Two consecutive monthly periods chain to ~60 days out.
        second.ExpiresAtUtc.Should().BeCloseTo(clock.UtcNow.AddDays(60), TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task Cancel_KeepsAccessUntilExpiry_ButTurnsOffAutoRenew()
    {
        var clock = new FakeClock();
        var service = NewService(clock, out _);
        var userId = Guid.NewGuid();

        await service.SubscribeOrRenewAsync(userId, "yearly", "mock", null, CancellationToken.None);
        var status = await service.CancelAsync(userId, CancellationToken.None);

        status.IsPremium.Should().BeTrue("access remains until expiry");
        status.AutoRenew.Should().BeFalse();
        status.Status.Should().Be("cancelled");
    }

    [Fact]
    public async Task GetStatus_AfterExpiry_IsNotPremium()
    {
        var clock = new FakeClock();
        var service = NewService(clock, out _);
        var userId = Guid.NewGuid();

        await service.SubscribeOrRenewAsync(userId, "monthly", "mock", null, CancellationToken.None);

        // Jump 40 days forward — the 30-day plan should be expired.
        clock.UtcNow = clock.UtcNow.AddDays(40);
        var status = await service.GetStatusAsync(userId, CancellationToken.None);

        status.IsPremium.Should().BeFalse();
        status.Status.Should().Be("none");
        (await service.IsPremiumAsync(userId, CancellationToken.None)).Should().BeFalse();
    }

    [Fact]
    public async Task Subscribe_UnknownPlan_Throws()
    {
        var service = NewService(new FakeClock(), out _);
        var act = async () => await service.SubscribeOrRenewAsync(Guid.NewGuid(), "lifetime", "mock", null, CancellationToken.None);
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task GetStatus_NoSubscription_IsNotPremium()
    {
        var service = NewService(new FakeClock(), out _);
        var status = await service.GetStatusAsync(Guid.NewGuid(), CancellationToken.None);
        status.IsPremium.Should().BeFalse();
        status.Entitlements.ProfileBadge.Should().BeFalse();
    }
}
