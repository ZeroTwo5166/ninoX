using backend.Common;
using backend.DTO.Conversations;
using backend.DTO.Messages;
using backend.Interfaces;
using backend.Models;

namespace backend.Services;

public class ConversationService : IConversationService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IChatCompletionService _chatCompletionService;

    public ConversationService(IUnitOfWork unitOfWork, IChatCompletionService chatCompletionService)
    {
        _unitOfWork = unitOfWork;
        _chatCompletionService = chatCompletionService;
    }

    public async Task<ServiceResult<ConversationResponse>> CreateAsync(Guid userId, CreateConversationRequest request)
    {
        var conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = string.IsNullOrWhiteSpace(request.Title) ? null : request.Title.Trim(),
            Model = string.IsNullOrWhiteSpace(request.Model) ? null : request.Model.Trim(),
            Think = request.Think
        };

        await _unitOfWork.Conversations.AddAsync(conversation);
        await _unitOfWork.SaveChangesAsync();

        return ServiceResult<ConversationResponse>.Ok(ToResponse(conversation));
    }

    public async Task<ServiceResult<PagedResult<ConversationResponse>>> GetForUserAsync(Guid userId, PaginationParams pagination)
    {
        var paged = await _unitOfWork.Conversations.GetByUserIdPagedAsync(userId, pagination);

        var result = new PagedResult<ConversationResponse>
        {
            Items = paged.Items.Select(ToResponse).ToList(),
            PageNumber = paged.PageNumber,
            PageSize = paged.PageSize,
            TotalCount = paged.TotalCount
        };

        return ServiceResult<PagedResult<ConversationResponse>>.Ok(result);
    }

    public async Task<ServiceResult<ConversationDetailResponse>> GetDetailAsync(Guid userId, Guid conversationId)
    {
        var conversation = await _unitOfWork.Conversations.GetWithMessagesAsync(conversationId);

        if (conversation is null || conversation.UserId != userId)
            return ServiceResult<ConversationDetailResponse>.Fail(ServiceErrorType.NotFound, "Conversation not found.");

        var detail = new ConversationDetailResponse(
            conversation.Id,
            conversation.Title,
            conversation.Model ?? _chatCompletionService.DefaultModel,
            conversation.Think ?? _chatCompletionService.DefaultThink,
            conversation.CreatedAt,
            conversation.UpdatedAt,
            conversation.Messages
                .Select(m => new MessageResponse(m.Id, m.Role.ToString(), m.Content, m.Thinking, m.CreatedAt))
                .ToList()
        );

        return ServiceResult<ConversationDetailResponse>.Ok(detail);
    }

    public async Task<ServiceResult<ConversationResponse>> UpdateAsync(Guid userId, Guid conversationId, UpdateConversationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return ServiceResult<ConversationResponse>.Fail(ServiceErrorType.Validation, "Title is required.");

        var conversation = await _unitOfWork.Conversations.GetByIdAsync(conversationId);

        if (conversation is null || conversation.UserId != userId)
            return ServiceResult<ConversationResponse>.Fail(ServiceErrorType.NotFound, "Conversation not found.");

        conversation.Title = request.Title.Trim();
        conversation.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Conversations.Update(conversation);
        await _unitOfWork.SaveChangesAsync();

        return ServiceResult<ConversationResponse>.Ok(ToResponse(conversation));
    }

    public async Task<ServiceResult<ConversationResponse>> UpdateSettingsAsync(
        Guid userId, Guid conversationId, UpdateConversationSettingsRequest request)
    {
        var conversation = await _unitOfWork.Conversations.GetByIdAsync(conversationId);

        if (conversation is null || conversation.UserId != userId)
            return ServiceResult<ConversationResponse>.Fail(ServiceErrorType.NotFound, "Conversation not found.");

        if (request.Model is not null)
            conversation.Model = string.IsNullOrWhiteSpace(request.Model) ? null : request.Model.Trim();

        if (request.Think.HasValue)
            conversation.Think = request.Think;

        _unitOfWork.Conversations.Update(conversation);
        await _unitOfWork.SaveChangesAsync();

        return ServiceResult<ConversationResponse>.Ok(ToResponse(conversation));
    }

    public async Task<ServiceResult> DeleteAsync(Guid userId, Guid conversationId)
    {
        var conversation = await _unitOfWork.Conversations.GetByIdAsync(conversationId);

        if (conversation is null || conversation.UserId != userId)
            return ServiceResult.Fail(ServiceErrorType.NotFound, "Conversation not found.");

        _unitOfWork.Conversations.Remove(conversation);
        await _unitOfWork.SaveChangesAsync();

        return ServiceResult.Ok();
    }

    private ConversationResponse ToResponse(Conversation c) =>
        new(
            c.Id,
            c.Title,
            c.Model ?? _chatCompletionService.DefaultModel,
            c.Think ?? _chatCompletionService.DefaultThink,
            c.CreatedAt,
            c.UpdatedAt);
}
