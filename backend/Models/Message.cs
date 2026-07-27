namespace backend.Models
{
    public enum MessageRole { User, Assistant, System }

    public class Message
    {
        public Guid Id { get; set; }
        public Guid ConversationId { get; set; }
        public Conversation Conversation { get; set; } = default!;
        public MessageRole Role { get; set; }
        public string Content { get; set; } = default!;
        public string? Thinking { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
