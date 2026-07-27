using backend.DTO.Models;
using backend.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[Authorize]
[Route("api/models")]
public class ModelsController : ApiControllerBase
{
    private readonly IChatCompletionService _chatCompletionService;

    public ModelsController(IChatCompletionService chatCompletionService)
    {
        _chatCompletionService = chatCompletionService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAvailable(CancellationToken cancellationToken)
    {
        var models = await _chatCompletionService.GetAvailableModelsAsync(cancellationToken);
        return Ok(new ModelsResponse(models, _chatCompletionService.DefaultModel));
    }
}
