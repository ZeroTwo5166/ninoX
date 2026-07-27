namespace backend.DTO.Conversations;

public record ConversationResponse(
    Guid Id,
    string? Title,
    string Model,
    bool Think,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
