using Microsoft.AspNetCore.Mvc;
using Portfolio.Application.Abstractions;
using Portfolio.Application.Features.CareerAdvisor;

namespace Portfolio.Api.Controllers;

[ApiController]
[Route("api/career")]
public sealed class CareerAdvisorController(
    ICareerAdvisorService careerAdvisorService,
    IOpenRouterClient openRouterClient) : ControllerBase
{
    [HttpGet("chat/diagnostic")]
    public async Task<IActionResult> ChatDiagnostic(CancellationToken cancellationToken)
    {
        var result = await openRouterClient.GetDiagnosticAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] CareerChatHttpRequest? request, CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { Message = "Message is required." });
        }

        if (request.Message.Length > 2000)
        {
            return BadRequest(new { Message = "Message must be <= 2000 characters." });
        }

        try
        {
            var result = await careerAdvisorService.AskAsync(
                new CareerChatRequest(
                    request.Message,
                    request.Track,
                    request.History?.Select(item => new CareerChatHistoryItem(item.Role, item.Content)).ToList()),
                cancellationToken);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { Message = ex.Message });
        }
    }
}

public sealed record CareerChatHttpRequest(
    string Message,
    string? Track,
    IReadOnlyCollection<CareerChatHistoryHttpItem>? History);

public sealed record CareerChatHistoryHttpItem(string Role, string Content);
