namespace Portfolio.Domain.Common;

public abstract class BaseAuditableEntity
{
    public Guid Id { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
