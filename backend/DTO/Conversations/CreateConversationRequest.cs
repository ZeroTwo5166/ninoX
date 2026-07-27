namespace backend.DTO.Conversations;

public record CreateConversationRequest(
    string? Title,
    string? Model,
    bool? Think
);
