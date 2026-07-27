using System.Text.Json;
using backend.Common;
using backend.DTO.Conversations;
using backend.DTO.Messages;
using backend.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[Authorize]
[Route("api/conversations")]
public class ConversationsController : ApiControllerBase
{
    private readonly IConversationService _conversationService;
    private readonly IMessageService _messageService;

    public ConversationsController(IConversationService conversationService, IMessageService messageService)
    {
        _conversationService = conversationService;
        _messageService = messageService;
    }

    // ---------- Conversations ----------

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateConversationRequest request)
    {
        var result = await _conversationService.CreateAsync(CurrentUserId, request);
        return result.Success
            ? CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result.Data)
            : FromError(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] PaginationParams pagination)
    {
        var result = await _conversationService.GetForUserAsync(CurrentUserId, pagination);
        return result.Success ? Ok(result.Data) : FromError(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _conversationService.GetDetailAsync(CurrentUserId, id);
        return result.Success ? Ok(result.Data) : FromError(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateConversationRequest request)
    {
        var result = await _conversationService.UpdateAsync(CurrentUserId, id, request);
        return result.Success ? Ok(result.Data) : FromError(result);
    }

    [HttpPatch("{id:guid}/settings")]
    public async Task<IActionResult> UpdateSettings(Guid id, [FromBody] UpdateConversationSettingsRequest request)
    {
        var result = await _conversationService.UpdateSettingsAsync(CurrentUserId, id, request);
        return result.Success ? Ok(result.Data) : FromError(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _conversationService.DeleteAsync(CurrentUserId, id);
        return result.Success ? NoContent() : FromError(result);
    }

    // ---------- Messages ----------

    [HttpGet("{id:guid}/messages")]
    public async Task<IActionResult> GetMessages(Guid id)
    {
        var result = await _messageService.GetMessagesAsync(CurrentUserId, id);
        return result.Success ? Ok(result.Data) : FromError(result);
    }

    [HttpPost("{id:guid}/messages")]
    public async Task<IActionResult> SendMessage(Guid id, [FromBody] SendMessageRequest request, CancellationToken cancellationToken)
    {
        var result = await _messageService.SendMessageAsync(CurrentUserId, id, request, cancellationToken);
        return result.Success ? Ok(result.Data) : FromError(result);
    }

    /// <summary>
    /// Streams the assistant reply as Server-Sent Events. Each event is a JSON
    /// ChatStreamEvent: {type: "user" | "delta" | "assistant" | "error", ...}.
    /// </summary>
    [HttpPost("{id:guid}/messages/stream")]
    public async Task StreamMessage(Guid id, [FromBody] SendMessageRequest request, CancellationToken cancellationToken)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no";

        try
        {
            await foreach (var evt in _messageService.StreamMessageAsync(CurrentUserId, id, request, cancellationToken))
            {
                var json = JsonSerializer.Serialize(evt, JsonOptions);
                await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            // client disconnected — MessageService already persisted the partial reply
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
}
