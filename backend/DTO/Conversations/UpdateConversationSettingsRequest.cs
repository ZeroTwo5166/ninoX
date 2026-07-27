namespace backend.DTO.Conversations;

/// <summary>
/// Partial update: only fields that are non-null are applied. Lets the client
/// change just the model, just the think flag, or both in one call.
/// </summary>
public record UpdateConversationSettingsRequest(
    string? Model,
    bool? Think
);
