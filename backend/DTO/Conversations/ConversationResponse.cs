namespace backend.DTO.Conversations;

public record ConversationResponse(
    Guid Id,
    string? Title,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
