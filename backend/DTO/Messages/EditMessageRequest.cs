namespace backend.DTO.Messages;

public record EditMessageRequest(
    string Content,
    List<string>? Images = null
);
