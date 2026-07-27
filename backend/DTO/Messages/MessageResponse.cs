namespace backend.DTO.Messages;

public record MessageResponse(
    Guid Id,
    string Role,       // "User" | "Assistant" | "System"
    string Content,
    string? Thinking,
    DateTime CreatedAt
);
