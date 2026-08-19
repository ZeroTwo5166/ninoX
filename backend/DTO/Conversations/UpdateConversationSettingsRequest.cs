namespace backend.DTO.Conversations;

// only non-null fields get applied, so the client can update just one of these
public record UpdateConversationSettingsRequest(
    string? Model,
    bool? Think
);
