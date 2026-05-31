using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities;

/// <summary>
/// A user's premium subscription record. Each subscribe/renew action creates a new
/// row so the table doubles as a billing history; the "current" subscription is the
/// valid row with the furthest <see cref="ExpiresAtUtc"/>.
/// </summary>
public sealed class PremiumSubscription : BaseAuditableEntity
{
    public Guid UserId { get; set; }

    /// <summary>"monthly" | "yearly"</summary>
    public string Plan { get; set; } = "monthly";

    /// <summary>"active" | "cancelled" | "expired"</summary>
    public string Status { get; set; } = "active";

    public DateTime StartedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }

    public decimal AmountPaid { get; set; }
    public string Currency { get; set; } = "VND";

    /// <summary>"mock" | "admin" | "stripe" | "vnpay" ...</summary>
    public string PaymentMethod { get; set; } = "mock";
    public string? PaymentReference { get; set; }

    public bool AutoRenew { get; set; }
    public DateTime? CancelledAtUtc { get; set; }
}
