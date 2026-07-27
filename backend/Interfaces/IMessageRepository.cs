using backend.Models;

namespace backend.Interfaces;

public interface IMessageRepository : IGenericRepository<Message>
{
    Task<List<Message>> GetByConversationIdAsync(Guid conversationId);
}
