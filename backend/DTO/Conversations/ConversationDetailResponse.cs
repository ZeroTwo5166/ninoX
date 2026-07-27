using backend.DTO.Messages;

namespace backend.DTO.Conversations;

public record ConversationDetailResponse(
    Guid Id,
    string? Title,
    string Model,
    bool Think,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<MessageResponse> Messages
);
