using backend.Common;
using backend.DTO.Conversations;

namespace backend.Interfaces;

public interface IConversationService
{
    Task<ServiceResult<ConversationResponse>> CreateAsync(Guid userId, CreateConversationRequest request);
    Task<ServiceResult<PagedResult<ConversationResponse>>> GetForUserAsync(Guid userId, PaginationParams pagination);
    Task<ServiceResult<ConversationDetailResponse>> GetDetailAsync(Guid userId, Guid conversationId);
    Task<ServiceResult<ConversationResponse>> UpdateAsync(Guid userId, Guid conversationId, UpdateConversationRequest request);
    Task<ServiceResult<ConversationResponse>> UpdateSettingsAsync(Guid userId, Guid conversationId, UpdateConversationSettingsRequest request);
    Task<ServiceResult> DeleteAsync(Guid userId, Guid conversationId);
}
