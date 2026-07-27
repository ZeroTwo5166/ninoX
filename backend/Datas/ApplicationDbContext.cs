using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<EmailVerificationToken> EmailVerificationTokens => Set<EmailVerificationToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ---------- User ----------
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);

            entity.Property(u => u.FirstName)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(u => u.LastName)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(256);

            entity.HasIndex(u => u.Email)
                .IsUnique();

            entity.Property(u => u.PasswordHash)
                .IsRequired();

            entity.Property(u => u.CreatedAt)
                .HasDefaultValueSql("now()"); // Postgres. Use GETUTCDATE() for SQL Server.

            entity.HasMany(u => u.Conversations)
                .WithOne(c => c.User)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(u => u.RefreshTokens)
                .WithOne(rt => rt.User)
                .HasForeignKey(rt => rt.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ---------- RefreshToken ----------
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(rt => rt.Id);

            entity.Property(rt => rt.Token)
                .IsRequired()
                .HasMaxLength(512); // storing a hash, not the raw token

            entity.HasIndex(rt => rt.Token)
                .IsUnique();

            entity.Property(rt => rt.CreatedAt)
                .HasDefaultValueSql("now()");
        });

        // ---------- EmailVerificationToken ----------
        modelBuilder.Entity<EmailVerificationToken>(entity =>
        {
            entity.HasKey(t => t.Id);

            entity.Property(t => t.Token)
                .IsRequired()
                .HasMaxLength(512);

            entity.HasIndex(t => t.Token)
                .IsUnique();

            entity.Property(t => t.CreatedAt)
                .HasDefaultValueSql("now()");

            entity.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ---------- PasswordResetToken ----------
        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(t => t.Id);

            entity.Property(t => t.Token)
                .IsRequired()
                .HasMaxLength(512);

            entity.HasIndex(t => t.Token)
                .IsUnique();

            entity.Property(t => t.CreatedAt)
                .HasDefaultValueSql("now()");

            entity.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ---------- Conversation ----------
        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasKey(c => c.Id);

            entity.Property(c => c.Title)
                .HasMaxLength(200);

            entity.Property(c => c.Model)
                .HasMaxLength(200);

            entity.Property(c => c.CreatedAt)
                .HasDefaultValueSql("now()");

            entity.Property(c => c.UpdatedAt)
                .HasDefaultValueSql("now()");

            entity.HasMany(c => c.Messages)
                .WithOne(m => m.Conversation)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(c => c.UserId);
        });

        // ---------- Message ----------
        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(m => m.Id);

            entity.Property(m => m.Role)
                .IsRequired()
                .HasConversion<string>()   // stores enum as "User"/"Assistant"/"System" instead of 0/1/2
                .HasMaxLength(20);

            entity.Property(m => m.Content)
                .IsRequired();

            entity.Property(m => m.CreatedAt)
                .HasDefaultValueSql("now()");

            entity.HasIndex(m => m.ConversationId);
        });
    }
}