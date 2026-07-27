using backend.DTO.Messages;

namespace backend.DTO.Conversations;

public record ConversationDetailResponse(
    Guid Id,
    string? Title,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<MessageResponse> Messages
);
