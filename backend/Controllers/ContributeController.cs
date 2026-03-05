using backend.Shared.Models;
using Microsoft.AspNetCore.Mvc;
using SurrealDb.Net;

namespace backend.Controllers;

// TODO Move some functionality back into the app hub for consistency
[ApiController]
[Route("api/[controller]")]
public class ContributeController : ControllerBase
{
    private readonly SurrealDbClient _dbClient;

    public ContributeController(SurrealDbClient dbClient)
    {
        _dbClient = dbClient;
    }

    [HttpPost]
    public async Task<ActionResult<Contribution>> Create([FromBody] CreateContributionRequest req)
    {
        var created = await _dbClient.Create(
            "contribution",
            new DbContribution
            {
                userId = req.userId.Trim(),
                title = req.title.Trim(),
                description = req.description.Trim(),
                category = req.category.Trim(),
                attachments = req.attachments ?? [],
                createdAt = DateTime.Now,
            }
        );
        return Ok(created.ToBase());
    }

    [HttpGet]
    public async Task<ActionResult<List<Contribution>>> GetRecent([FromQuery] int limit = 30)
    {
        var result = await _dbClient.Query(
            $"SELECT * FROM contribution ORDER BY createdAt DESC LIMIT {limit};"
        );
        var rows = result.GetValue<List<DbContribution>>(0) ?? [];
        return Ok(rows.Select(x => x.ToBase()).ToList());
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<Contribution>>> GetFromUser(string userId)
    {
        var result = await _dbClient.Query(
            $"SELECT * FROM contribution WHERE userId = {userId} ORDER BY createdAt DESC;"
        );
        var rows = result.GetValue<List<DbContribution>>(0) ?? [];
        return Ok(rows.Select(x => x.ToBase()).ToList());
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

