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

    // SSE stream, events look like {type: "user" | "delta" | "assistant" | "error", ...}
    [HttpPost("{id:guid}/messages/stream")]
    public Task StreamMessage(Guid id, [FromBody] SendMessageRequest request, CancellationToken cancellationToken) =>
        WriteSseAsync(_messageService.StreamMessageAsync(CurrentUserId, id, request, cancellationToken), cancellationToken);

    [HttpPost("{id:guid}/messages/{messageId:guid}/regenerate")]
    public Task RegenerateMessage(Guid id, Guid messageId, CancellationToken cancellationToken) =>
        WriteSseAsync(_messageService.RegenerateMessageAsync(CurrentUserId, id, messageId, cancellationToken), cancellationToken);

    [HttpPost("{id:guid}/messages/{messageId:guid}/edit")]
    public Task EditMessage(Guid id, Guid messageId, [FromBody] EditMessageRequest request, CancellationToken cancellationToken) =>
        WriteSseAsync(_messageService.EditMessageAsync(CurrentUserId, id, messageId, request, cancellationToken), cancellationToken);

    private async Task WriteSseAsync(IAsyncEnumerable<ChatStreamEvent> events, CancellationToken cancellationToken)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no";

        try
        {
            await foreach (var evt in events.WithCancellation(cancellationToken))
            {
                var json = JsonSerializer.Serialize(evt, JsonOptions);
                await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            // client disconnected, partial reply is already saved
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
}
