using Microsoft.EntityFrameworkCore.Storage;

namespace backend.Interfaces;

public interface IUnitOfWork : IAsyncDisposable
{
    IUserRepository Users { get; }
    IRefreshTokenRepository RefreshTokens { get; }
    IConversationRepository Conversations { get; }
    IMessageRepository Messages { get; }
    IEmailVerificationTokenRepository EmailVerificationTokens { get; }
    IPasswordResetTokenRepository PasswordResetTokens { get; }

    Task<int> SaveChangesAsync();
    Task<IDbContextTransaction> BeginTransactionAsync();
}