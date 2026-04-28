using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities;

public sealed class SiteMetric : BaseAuditableEntity
{
    public int TotalPageViews { get; set; }
    public int TotalLogins { get; set; }
    public DateTime? LastPageViewAtUtc { get; set; }
    public DateTime? LastLoginAtUtc { get; set; }
}
