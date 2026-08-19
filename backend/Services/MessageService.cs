using System.Runtime.CompilerServices;
using System.Text;
using backend.Common;
using backend.DTO.Messages;
using backend.Interfaces;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class MessageService : IMessageService
{
    private const string ModelUnreachableError =
        "The AI model is unreachable right now. It may be offline — please try again shortly.";

    private readonly IUnitOfWork _unitOfWork;
    private readonly IChatCompletionService _chatCompletionService;

    public MessageService(IUnitOfWork unitOfWork, IChatCompletionService chatCompletionService)
    {
        _unitOfWork = unitOfWork;
        _chatCompletionService = chatCompletionService;
    }

    public async Task<ServiceResult<List<MessageResponse>>> SendMessageAsync(
        Guid userId, Guid conversationId, SendMessageRequest request, CancellationToken cancellationToken = default)
    {
        if (!HasContentOrImages(request.Content, request.Images))
            return ServiceResult<List<MessageResponse>>.Fail(ServiceErrorType.Validation, "Message content or an image is required.");

        var conversation = await _unitOfWork.Conversations.GetWithMessagesAsync(conversationId);

        if (conversation is null || conversation.UserId != userId)
            return ServiceResult<List<MessageResponse>>.Fail(ServiceErrorType.NotFound, "Conversation not found.");

        var userMessage = await AddUserMessageAsync(conversation, request.Content, request.Images);

        var completion = await _chatCompletionService.GetCompletionAsync(
            conversation.Messages.OrderBy(m => m.CreatedAt).ToList(),
            conversation.Model,
            conversation.Think ?? _chatCompletionService.DefaultThink,
            cancellationToken);

        var assistantMessage = await AddAssistantMessageAsync(
            conversation, userMessage, completion.Content, completion.Thinking, cancellationToken);

        try
        {
            await _unitOfWork.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            // conversation was deleted while the reply was being generated
            return ServiceResult<List<MessageResponse>>.Fail(ServiceErrorType.NotFound,
                "Conversation was deleted while generating the reply.");
        }

        return ServiceResult<List<MessageResponse>>.Ok(
        [
            ToResponse(userMessage),
            ToResponse(assistantMessage)
        ]);
    }

    public async IAsyncEnumerable<ChatStreamEvent> StreamMessageAsync(
        Guid userId, Guid conversationId, SendMessageRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (!HasContentOrImages(request.Content, request.Images))
        {
            yield return new ChatStreamEvent("error", Error: "Message content or an image is required.");
            yield break;
        }

        var conversation = await _unitOfWork.Conversations.GetWithMessagesAsync(conversationId);

        if (conversation is null || conversation.UserId != userId)
        {
            yield return new ChatStreamEvent("error", Error: "Conversation not found.");
            yield break;
        }

        // save the user message right away so it's not lost if the stream dies
        var userMessage = await AddUserMessageAsync(conversation, request.Content, request.Images);
        await _unitOfWork.SaveChangesAsync();

        yield return new ChatStreamEvent("user", Message: ToResponse(userMessage));

        var history = conversation.Messages.OrderBy(m => m.CreatedAt).ToList();

        await foreach (var evt in GenerateAndPersistReplyAsync(conversation, history, userMessage, beforePersist: null, cancellationToken))
            yield return evt;
    }

    public async IAsyncEnumerable<ChatStreamEvent> RegenerateMessageAsync(
        Guid userId, Guid conversationId, Guid messageId,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var conversation = await _unitOfWork.Conversations.GetWithMessagesAsync(conversationId);

        if (conversation is null || conversation.UserId != userId)
        {
            yield return new ChatStreamEvent("error", Error: "Conversation not found.");
            yield break;
        }

        var ordered = conversation.Messages.OrderBy(m => m.CreatedAt).ToList();
        var targetIndex = ordered.FindIndex(m => m.Id == messageId && m.Role == MessageRole.Assistant);

        if (targetIndex == -1)
        {
            yield return new ChatStreamEvent("error", Error: "Reply not found.");
            yield break;
        }

        // history for the new reply stops right before the stale one
        var candidates = ordered.Take(targetIndex).ToList();
        var anchorIndex = candidates.FindLastIndex(m => m.Role == MessageRole.User);

        if (anchorIndex == -1)
        {
            yield return new ChatStreamEvent("error", Error: "No message to regenerate a reply from.");
            yield break;
        }

        var anchorUserMessage = candidates[anchorIndex];
        var history = candidates.Take(anchorIndex + 1).ToList();
        var toRemove = ordered.Skip(targetIndex).ToList();

        // don't actually delete anything until a replacement reply exists -
        // used to delete up front and a failed regen would just lose the messages
        void PruneStaleMessages()
        {
            foreach (var m in toRemove)
            {
                _unitOfWork.Messages.Remove(m);
                conversation.Messages.Remove(m);
            }
        }

        await foreach (var evt in GenerateAndPersistReplyAsync(conversation, history, anchorUserMessage, PruneStaleMessages, cancellationToken))
            yield return evt;
    }

    public async IAsyncEnumerable<ChatStreamEvent> EditMessageAsync(
        Guid userId, Guid conversationId, Guid messageId, EditMessageRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (!HasContentOrImages(request.Content, request.Images))
        {
            yield return new ChatStreamEvent("error", Error: "Message content or an image is required.");
            yield break;
        }

        var conversation = await _unitOfWork.Conversations.GetWithMessagesAsync(conversationId);

        if (conversation is null || conversation.UserId != userId)
        {
            yield return new ChatStreamEvent("error", Error: "Conversation not found.");
            yield break;
        }

        var ordered = conversation.Messages.OrderBy(m => m.CreatedAt).ToList();
        var targetIndex = ordered.FindIndex(m => m.Id == messageId && m.Role == MessageRole.User);

        if (targetIndex == -1)
        {
            yield return new ChatStreamEvent("error", Error: "Message not found.");
            yield break;
        }

        var target = ordered[targetIndex];
        target.Content = (request.Content ?? string.Empty).Trim();
        // no Images field means "leave them as-is", not "clear them"
        if (request.Images is not null)
            target.Images = request.Images;

        var history = ordered.Take(targetIndex + 1).ToList();
        var toRemove = ordered.Skip(targetIndex + 1).ToList();

        // same deferred-delete deal as regenerate above
        void PruneStaleMessages()
        {
            foreach (var m in toRemove)
            {
                _unitOfWork.Messages.Remove(m);
                conversation.Messages.Remove(m);
            }
        }

        yield return new ChatStreamEvent("user", Message: ToResponse(target));

        await foreach (var evt in GenerateAndPersistReplyAsync(conversation, history, target, PruneStaleMessages, cancellationToken))
            yield return evt;
    }

    // shared by send/regenerate/edit - they just differ in what history goes in
    // and what needs cleaning up once a reply actually comes back
    private async IAsyncEnumerable<ChatStreamEvent> GenerateAndPersistReplyAsync(
        Conversation conversation, IReadOnlyList<Message> history, Message anchorUserMessage, Action? beforePersist,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var contentBuffer = new StringBuilder();
        var thinkingBuffer = new StringBuilder();
        var finalized = false;
        string? streamError = null;

        Message? assistantMessage = null;
        string? persistError = null;

        var enumerator = _chatCompletionService.StreamCompletionAsync(
            history, conversation.Model, conversation.Think ?? _chatCompletionService.DefaultThink, cancellationToken)
            .GetAsyncEnumerator(cancellationToken);

        try
        {
            while (true)
            {
                CompletionChunk chunk;
                try
                {
                    if (!await enumerator.MoveNextAsync())
                        break;
                    chunk = enumerator.Current;
                }
                catch (Exception) when (!cancellationToken.IsCancellationRequested)
                {
                    // ollama down/unreachable - don't blow up the SSE response, just report it
                    streamError = ModelUnreachableError;
                    break;
                }

                if (chunk.IsThinking)
                {
                    thinkingBuffer.Append(chunk.Text);
                    yield return new ChatStreamEvent("thinking", Delta: chunk.Text);
                }
                else
                {
                    contentBuffer.Append(chunk.Text);
                    yield return new ChatStreamEvent("delta", Delta: chunk.Text);
                }
            }

            if (streamError is not null && contentBuffer.Length == 0 && thinkingBuffer.Length == 0)
            {
                // nothing generated, nothing to save
                finalized = true;
                yield return new ChatStreamEvent("error", Error: streamError);
                yield break;
            }

            try
            {
                beforePersist?.Invoke();
                assistantMessage = await AddAssistantMessageAsync(
                    conversation, anchorUserMessage, contentBuffer.ToString().Trim(),
                    NullIfEmpty(thinkingBuffer), cancellationToken);
                await _unitOfWork.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                persistError = "Conversation was deleted while generating the reply.";
            }
            finalized = true;

            if (assistantMessage is not null)
                yield return new ChatStreamEvent("assistant", Message: ToResponse(assistantMessage));
            else
                yield return new ChatStreamEvent("error", Error: persistError);
        }
        finally
        {
            await enumerator.DisposeAsync();

            // client disconnected mid-generation - keep whatever we got so far
            if (!finalized && (contentBuffer.Length > 0 || thinkingBuffer.Length > 0))
            {
                try
                {
                    beforePersist?.Invoke();
                    await AddAssistantMessageAsync(
                        conversation, anchorUserMessage, contentBuffer.ToString().Trim(),
                        NullIfEmpty(thinkingBuffer), cancellationToken);
                    await _unitOfWork.SaveChangesAsync();
                }
                catch
                {
                    // conversation may be gone or context tearing down — nothing sensible to do
                }
            }
        }
    }

    public async Task<ServiceResult<List<MessageResponse>>> GetMessagesAsync(Guid userId, Guid conversationId)
    {
        var conversation = await _unitOfWork.Conversations.GetByIdAsync(conversationId);

        if (conversation is null || conversation.UserId != userId)
            return ServiceResult<List<MessageResponse>>.Fail(ServiceErrorType.NotFound, "Conversation not found.");

        var messages = await _unitOfWork.Messages.GetByConversationIdAsync(conversationId);

        return ServiceResult<List<MessageResponse>>.Ok(messages.Select(ToResponse).ToList());
    }

    private static bool HasContentOrImages(string? content, List<string>? images) =>
        !string.IsNullOrWhiteSpace(content) || images is { Count: > 0 };

    private static string? NullIfEmpty(StringBuilder sb) =>
        sb.Length > 0 ? sb.ToString().Trim() : null;

    private async Task<Message> AddUserMessageAsync(Conversation conversation, string? content, List<string>? images)
    {
        var userMessage = new Message
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            Role = MessageRole.User,
            Content = (content ?? string.Empty).Trim(),
            Images = images ?? [],
        };

        // add via the repo too, not just the nav collection, so EF marks it Added
        await _unitOfWork.Messages.AddAsync(userMessage);
        conversation.Messages.Add(userMessage);
        return userMessage;
    }

    private async Task<Message> AddAssistantMessageAsync(
        Conversation conversation, Message userMessage, string content, string? thinking, CancellationToken cancellationToken)
    {
        var assistantMessage = new Message
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            Role = MessageRole.Assistant,
            Content = content,
            Thinking = thinking,
        };

        await _unitOfWork.Messages.AddAsync(assistantMessage);

        if (string.IsNullOrWhiteSpace(conversation.Title))
        {
            conversation.Title = await _chatCompletionService.GenerateTitleAsync(
                userMessage.Content, content, conversation.Model, cancellationToken);
        }

        // conversation's already tracked, no need to call Update()
        conversation.UpdatedAt = DateTime.UtcNow;

        return assistantMessage;
    }

    private static MessageResponse ToResponse(Message m) =>
        new(m.Id, m.Role.ToString(), m.Content, m.Thinking, m.CreatedAt, m.Images is { Count: > 0 } ? m.Images : null);
}
