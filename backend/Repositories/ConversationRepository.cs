using Microsoft.EntityFrameworkCore;
using backend.Common;
using backend.Data;
using backend.Interfaces;
using backend.Models;

namespace backend.Repositories;

public class ConversationRepository : GenericRepository<Conversation>, IConversationRepository
{
    public ConversationRepository(ApplicationDbContext context) : base(context)
    {
    }

    public async Task<PagedResult<Conversation>> GetByUserIdPagedAsync(Guid userId, PaginationParams pagination)
    {
        var query = _dbSet
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.UpdatedAt);

        var totalCount = await query.CountAsync();

        var items = await query
            .Skip((pagination.PageNumber - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .ToListAsync();

        return new PagedResult<Conversation>
        {
            Items = items,
            PageNumber = pagination.PageNumber,
            PageSize = pagination.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<Conversation?> GetWithMessagesAsync(Guid conversationId) =>
        await _dbSet
            .Include(c => c.Messages.OrderBy(m => m.CreatedAt))
            .FirstOrDefaultAsync(c => c.Id == conversationId);
}