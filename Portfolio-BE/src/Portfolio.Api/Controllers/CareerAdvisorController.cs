using Microsoft.AspNetCore.Mvc;
using Portfolio.Api.Services;

namespace Portfolio.Api.Controllers;

[ApiController]
[Route("api/career")]
public sealed class CareerAdvisorController(IOpenRouterCareerChatService careerChatService, IConfiguration configuration) : ControllerBase
{
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

        if (string.IsNullOrWhiteSpace(configuration["OpenRouter:ApiKey"]))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                Message = "Chatbot is not configured. Missing OpenRouter API key on backend."
            });
        }

        try
        {
            var result = await careerChatService.AskAsync(
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
