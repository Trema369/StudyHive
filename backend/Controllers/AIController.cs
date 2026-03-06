using backend.Hubs;
using backend.Shared.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AIController : ControllerBase
{
    private readonly AppHub _appHub;

    public AIController(AppHub appHub)
    {
        _appHub = appHub;
    }

    [HttpPost("append")]
    public async Task<ActionResult<object>> Append([FromBody] AIAppendRequest req)
    {
        var mode = (req.mode ?? "extrapolate").Trim().ToLowerInvariant();
        var content = req.content ?? "";
        var prompt = req.prompt ?? "";

        var instruction =
            mode == "prompt"
                ? $"Generate concise {req.domain ?? "study"} content from this prompt. Return only the generated text.\nPrompt:\n{prompt}"
                : mode == "prompt_assisted"
                    ? $"Extend the existing content using the prompt. Keep style consistent and append-only. Return only new text.\nPrompt:\n{prompt}\n\nExisting content:\n{content}"
                    : $"Extrapolate and continue the existing content in the same style. Append-only. Return only new text.\n\nExisting content:\n{content}";

        var res = await _appHub.GetAIResponse(
            string.IsNullOrWhiteSpace(req.model) ? "ministral" : req.model.Trim(),
            [
                new Message
                {
                    userId = "User",
                    text = instruction,
                    date = DateTime.Now,
                },
            ]
        );

        return Ok(new { text = res?.text?.Trim() ?? "" });
    }

    [HttpGet("models")]
    public async Task<ActionResult<List<string>>> GetModels()
    {
        var models = await _appHub.GetAIModels();
        return Ok(models ?? new List<string>());
    }
}

public class AIAppendRequest
{
    public string? mode { get; set; }
    public string? prompt { get; set; }
    public string? content { get; set; }
    public string? domain { get; set; }
    public string? model { get; set; }
}
