using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;
using Portfolio.Domain.Entities;

namespace Portfolio.Application.Features.Contact;

public interface IContactMessageService
{
    Task<Guid> CreateAsync(string name, string email, string? subject, string message, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ContactMessage>> GetAllAsync(CancellationToken cancellationToken);
    Task<int> GetUnreadCountAsync(CancellationToken cancellationToken);
    Task<bool> MarkReadAsync(Guid id, bool isRead, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed class ContactMessageService(IApplicationDbContext dbContext) : IContactMessageService
{
    public async Task<Guid> CreateAsync(string name, string email, string? subject, string message, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(message))
        {
            throw new ArgumentException("Name, email and message are required.");
        }

        var entity = new ContactMessage
        {
            Id = Guid.NewGuid(),
            Name = Truncate(name.Trim(), 120),
            Email = Truncate(email.Trim(), 320),
            Subject = string.IsNullOrWhiteSpace(subject) ? null : Truncate(subject.Trim(), 200),
            Message = Truncate(message.Trim(), 4000),
            IsRead = false
        };

        dbContext.ContactMessages.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }

    public async Task<IReadOnlyCollection<ContactMessage>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await dbContext.ContactMessages
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> GetUnreadCountAsync(CancellationToken cancellationToken)
    {
        return await dbContext.ContactMessages.CountAsync(x => !x.IsRead, cancellationToken);
    }

    public async Task<bool> MarkReadAsync(Guid id, bool isRead, CancellationToken cancellationToken)
    {
        var message = await dbContext.ContactMessages.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (message is null)
        {
            return false;
        }

        message.IsRead = isRead;
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var message = await dbContext.ContactMessages.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (message is null)
        {
            return false;
        }

        dbContext.ContactMessages.Remove(message);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static string Truncate(string value, int maxLength)
        => value.Length <= maxLength ? value : value[..maxLength];
}
