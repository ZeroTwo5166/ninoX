namespace backend.Models
{
    public class RefreshToken
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; } = default!;
        public string Token { get; set; } = default!;  //store a hash of this, not the raw token
        public DateTime ExpiresAt { get; set; }
        public DateTime? RevokedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsActive => RevokedAt is null && ExpiresAt > DateTime.UtcNow;
    }
}
