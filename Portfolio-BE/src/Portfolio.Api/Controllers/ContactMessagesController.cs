using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Portfolio.Application.Features.Contact;

namespace Portfolio.Api.Controllers;

[ApiController]
[Route("api/contact-messages")]
public sealed class ContactMessagesController(IContactMessageService contactMessageService) : ControllerBase
{
    public sealed record CreateContactMessageRequest(string Name, string Email, string? Subject, string Message);
    public sealed record MarkReadRequest(bool IsRead);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateContactMessageRequest? request, CancellationToken cancellationToken)
    {
        if (request is null
            || string.IsNullOrWhiteSpace(request.Name)
            || string.IsNullOrWhiteSpace(request.Email)
            || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { Message = "Name, email and message are required." });
        }

        // Limits mirror the DB column lengths / service storage so oversized input is rejected
        // up-front instead of being silently truncated on save.
        if (request.Name.Length > 120
            || request.Email.Length > 254
            || request.Message.Length > 4000
            || (request.Subject?.Length ?? 0) > 200)
        {
            return BadRequest(new { Message = "Name ≤ 120, email ≤ 254, subject ≤ 200, message ≤ 4000 characters." });
        }

        var id = await contactMessageService.CreateAsync(
            request.Name, request.Email, request.Subject, request.Message, cancellationToken);
        return Ok(new { Id = id, Message = "Message received. Thank you!" });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("admin")]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var messages = await contactMessageService.GetAllAsync(cancellationToken);
        var unread = await contactMessageService.GetUnreadCountAsync(cancellationToken);
        return Ok(new { UnreadCount = unread, Items = messages });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("admin/{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, [FromBody] MarkReadRequest? request, CancellationToken cancellationToken)
    {
        var updated = await contactMessageService.MarkReadAsync(id, request?.IsRead ?? true, cancellationToken);
        return updated ? Ok() : NotFound();
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("admin/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await contactMessageService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
