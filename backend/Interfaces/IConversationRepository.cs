using backend.Common;
using backend.Models;

namespace backend.Interfaces;

public interface IConversationRepository : IGenericRepository<Conversation>
{
    Task<PagedResult<Conversation>> GetByUserIdPagedAsync(Guid userId, PaginationParams pagination);
    Task<Conversation?> GetWithMessagesAsync(Guid conversationId);
}