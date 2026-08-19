using backend.Common;
using backend.DTO.Messages;

namespace backend.Interfaces;

public interface IMessageService
{
    // non-streaming: adds the user message, generates the reply, returns both
    Task<ServiceResult<List<MessageResponse>>> SendMessageAsync(
        Guid userId, Guid conversationId, SendMessageRequest request, CancellationToken cancellationToken = default);

    IAsyncEnumerable<ChatStreamEvent> StreamMessageAsync(
        Guid userId, Guid conversationId, SendMessageRequest request, CancellationToken cancellationToken = default);

    // drops the given reply and everything after it, streams a fresh one
    IAsyncEnumerable<ChatStreamEvent> RegenerateMessageAsync(
        Guid userId, Guid conversationId, Guid messageId, CancellationToken cancellationToken = default);

    // edits the message, drops everything after it, streams a fresh reply
    IAsyncEnumerable<ChatStreamEvent> EditMessageAsync(
        Guid userId, Guid conversationId, Guid messageId, EditMessageRequest request, CancellationToken cancellationToken = default);

    Task<ServiceResult<List<MessageResponse>>> GetMessagesAsync(Guid userId, Guid conversationId);
}
