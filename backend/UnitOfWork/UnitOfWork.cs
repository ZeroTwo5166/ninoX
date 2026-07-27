using Microsoft.EntityFrameworkCore.Storage;
using backend.Data;
using backend.Interfaces;
using backend.Repositories;

namespace backend.UnitOfWork;

public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;

    public IUserRepository Users { get; }
    public IRefreshTokenRepository RefreshTokens { get; }
    public IConversationRepository Conversations { get; }

    public UnitOfWork(ApplicationDbContext context)
    {
        _context = context;

        Users = new UserRepository(context);
        RefreshTokens = new RefreshTokenRepository(context);
        Conversations = new ConversationRepository(context);
    }

    public async Task<int> SaveChangesAsync() => await _context.SaveChangesAsync();

    public async Task<IDbContextTransaction> BeginTransactionAsync() =>
        await _context.Database.BeginTransactionAsync();

    public async ValueTask DisposeAsync()
    {
        await _context.DisposeAsync();
        GC.SuppressFinalize(this);
    }
}