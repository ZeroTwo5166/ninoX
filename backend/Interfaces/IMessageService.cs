using backend.Common;
using backend.DTO.Messages;

namespace backend.Interfaces;

public interface IMessageService
{
    /// <summary>
    /// Adds the user's message to the conversation, generates the assistant reply,
    /// and returns both messages in order. (Non-streaming variant.)
    /// </summary>
    Task<ServiceResult<List<MessageResponse>>> SendMessageAsync(
        Guid userId, Guid conversationId, SendMessageRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Streaming variant: persists the user message, then yields the assistant
    /// reply chunk by chunk, persisting the full reply at the end.
    /// </summary>
    IAsyncEnumerable<ChatStreamEvent> StreamMessageAsync(
        Guid userId, Guid conversationId, SendMessageRequest request, CancellationToken cancellationToken = default);

    Task<ServiceResult<List<MessageResponse>>> GetMessagesAsync(Guid userId, Guid conversationId);
}
