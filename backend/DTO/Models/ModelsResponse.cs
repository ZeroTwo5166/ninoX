namespace backend.DTO.Models;

public record ModelsResponse(
    List<string> Models,
    string DefaultModel
);
