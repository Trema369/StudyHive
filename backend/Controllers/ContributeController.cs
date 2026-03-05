using backend.Shared.Models;
using backend.Hubs;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

// TODO Move some functionality back into the app hub for consistency
[ApiController]
[Route("api/[controller]")]
public class ContributeController : ControllerBase
{
    private readonly AppHub _appHub;

    public ContributeController(AppHub appHub)
    {
        _appHub = appHub;
    }

    [HttpPost]
    public async Task<ActionResult<Contribution>> Create([FromBody] CreateContributionRequest req)
    {
        var created = await _appHub.CreateContribution(
            new Contribution
            {
                userId = req.userId.Trim(),
                title = req.title.Trim(),
                description = req.description.Trim(),
                category = req.category.Trim(),
                attachments = req.attachments ?? [],
                createdAt = DateTime.Now,
            }
        );
        return Ok(created);
    }

    [HttpGet]
    public async Task<ActionResult<List<Contribution>>> GetRecent([FromQuery] int limit = 30)
    {
        return Ok(await _appHub.GetContributions(limit));
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<Contribution>>> GetFromUser(string userId)
    {
        return Ok(await _appHub.GetContributionsFromUser(userId));
    }
}

public class CreateContributionRequest
{
    public string? userId { get; set; }
    public string? title { get; set; }
    public string? description { get; set; }
    public string? category { get; set; }
    public List<Attachment>? attachments { get; set; }
}
