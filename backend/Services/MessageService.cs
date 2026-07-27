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
        if (string.IsNullOrWhiteSpace(request.Content))
            return ServiceResult<List<MessageResponse>>.Fail(ServiceErrorType.Validation, "Message content is required.");

        var conversation = await _unitOfWork.Conversations.GetWithMessagesAsync(conversationId);

        if (conversation is null || conversation.UserId != userId)
            return ServiceResult<List<MessageResponse>>.Fail(ServiceErrorType.NotFound, "Conversation not found.");

        var userMessage = await AddUserMessageAsync(conversation, request.Content);

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
        if (string.IsNullOrWhiteSpace(request.Content))
        {
            yield return new ChatStreamEvent("error", Error: "Message content is required.");
            yield break;
        }

        var conversation = await _unitOfWork.Conversations.GetWithMessagesAsync(conversationId);

        if (conversation is null || conversation.UserId != userId)
        {
            yield return new ChatStreamEvent("error", Error: "Conversation not found.");
            yield break;
        }

        // Persist the user message immediately so it survives even if the stream dies.
        var userMessage = await AddUserMessageAsync(conversation, request.Content);
        await _unitOfWork.SaveChangesAsync();

        yield return new ChatStreamEvent("user", Message: ToResponse(userMessage));

        var history = conversation.Messages.OrderBy(m => m.CreatedAt).ToList();
        var contentBuffer = new StringBuilder();
        var thinkingBuffer = new StringBuilder();
        var finalized = false;

        Message? assistantMessage = null;
        string? persistError = null;

        try
        {
            await foreach (var chunk in _chatCompletionService.StreamCompletionAsync(
                history, conversation.Model, conversation.Think ?? _chatCompletionService.DefaultThink, cancellationToken))
            {
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

            try
            {
                assistantMessage = await AddAssistantMessageAsync(
                    conversation, userMessage, contentBuffer.ToString().Trim(),
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
            // Client disconnected / cancelled mid-generation: keep what was produced.
            if (!finalized && (contentBuffer.Length > 0 || thinkingBuffer.Length > 0))
            {
                try
                {
                    await AddAssistantMessageAsync(
                        conversation, userMessage, contentBuffer.ToString().Trim(),
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

    // ---------- helpers ----------

    private static string? NullIfEmpty(StringBuilder sb) =>
        sb.Length > 0 ? sb.ToString().Trim() : null;

    private async Task<Message> AddUserMessageAsync(Conversation conversation, string content)
    {
        var userMessage = new Message
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            Role = MessageRole.User,
            Content = content.Trim(),
        };

        // Add explicitly (not just via the navigation collection) so EF Core
        // marks it Added rather than guessing Modified for a pre-assigned Guid key.
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

        // Conversation is already tracked — mutating properties is enough.
        // (Deliberately NOT calling Conversations.Update: it would mark the whole
        // loaded message graph as Modified and widen this race.)
        conversation.UpdatedAt = DateTime.UtcNow;

        return assistantMessage;
    }

    private static MessageResponse ToResponse(Message m) =>
        new(m.Id, m.Role.ToString(), m.Content, m.Thinking, m.CreatedAt);
}
