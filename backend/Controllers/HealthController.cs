using backend.DTO.Health;
using backend.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

// unauthenticated, polled by the frontend for the online/offline indicator
[Route("api/health")]
public class HealthController : ApiControllerBase
{
    private readonly IChatCompletionService _chatCompletionService;

    public HealthController(IChatCompletionService chatCompletionService)
    {
        _chatCompletionService = chatCompletionService;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var online = await _chatCompletionService.IsAvailableAsync(cancellationToken);
        return Ok(new HealthResponse(online));
    }
}
