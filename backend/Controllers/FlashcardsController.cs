using backend.Hubs;
using backend.Shared.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FlashcardsController : ControllerBase
{
    private readonly AppHub _appHub;

    public FlashcardsController(AppHub appHub)
    {
        _appHub = appHub;
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<Flashcard>>> GetUserSets(string userId)
    {
        return Ok(await _appHub.GetFlashcardsFromUser(userId));
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<Flashcard>>> Search([FromQuery] string? query)
    {
        return Ok(await _appHub.SearchFlashcards(query ?? ""));
    }

    [HttpGet("code/{code}")]
    public async Task<ActionResult<Flashcard>> GetByCode(string code)
    {
        var set = await _appHub.GetFlashcardByCode(code);
        if (set is null)
            return NotFound(new { message = "Flashcard set not found" });
        return Ok(set);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Flashcard>> GetById(string id)
    {
        var set = await _appHub.GetFlashcard(id);
        if (set is null)
            return NotFound(new { message = "Flashcard set not found" });
        return Ok(set);
    }

    [HttpPost]
    public async Task<ActionResult<Flashcard>> Create([FromBody] CreateFlashcardSetRequest req)
    {
        if (
            string.IsNullOrWhiteSpace(req.userId)
            || string.IsNullOrWhiteSpace(req.name)
            || string.IsNullOrWhiteSpace(req.description)
        )
            return BadRequest(new { message = "userId, name and description are required" });

        var created = await _appHub.CreateFlashcard(
            new Flashcard
            {
                userId = req.userId.Trim(),
                name = req.name.Trim(),
                description = req.description.Trim(),
                published = req.published ?? false,
                cost = req.cost ?? 0,
                code = string.IsNullOrWhiteSpace(req.code)
                    ? Guid.NewGuid().ToString("N")[..10].ToUpperInvariant()
                    : req.code.Trim(),
            }
        );
        return Ok(created);
    }

    [HttpPatch("{id}")]
    public async Task<ActionResult<Flashcard>> Update(
        string id,
        [FromBody] UpdateFlashcardSetRequest req
    )
    {
        var existing = await _appHub.GetFlashcard(id);
        if (existing is null)
            return NotFound(new { message = "Flashcard set not found" });

        existing.name = req.name ?? existing.name;
        existing.description = req.description ?? existing.description;
        existing.published = req.published ?? existing.published;
        existing.cost = req.cost ?? existing.cost;
        existing.code = req.code ?? existing.code;

        return Ok(await _appHub.UpdateFlashcard(existing));
    }

    [HttpGet("{id}/cards")]
    public async Task<ActionResult<List<FlashcardCard>>> GetCards(string id)
    {
        return Ok(await _appHub.GetFlashcardCards(id));
    }

    [HttpPost("{id}/cards")]
    public async Task<ActionResult<FlashcardCard>> CreateCard(
        string id,
        [FromBody] UpdateFlashcardCardRequest req
    )
    {
        if (string.IsNullOrWhiteSpace(req.front) || string.IsNullOrWhiteSpace(req.back))
            return BadRequest(new { message = "front and back are required" });

        var created = await _appHub.CreateFlashcardCard(
            new FlashcardCard
            {
                flashcardId = id,
                front = req.front.Trim(),
                back = req.back.Trim(),
                frontAttachments = req.frontAttachments ?? [],
                backAttachments = req.backAttachments ?? [],
            }
        );
        return Ok(created);
    }

    [HttpPatch("{id}/cards/{cardId}")]
    public async Task<ActionResult<FlashcardCard>> UpdateCard(
        string id,
        string cardId,
        [FromBody] UpdateFlashcardCardRequest req
    )
    {
        var cards = await _appHub.GetFlashcardCards(id);
        var existing = cards.FirstOrDefault(x => x.id == cardId);
        if (existing is null)
            return NotFound(new { message = "Card not found" });

        existing.front = req.front ?? existing.front;
        existing.back = req.back ?? existing.back;
        existing.flashcardId = id;
        existing.frontAttachments = req.frontAttachments ?? existing.frontAttachments ?? [];
        existing.backAttachments = req.backAttachments ?? existing.backAttachments ?? [];
        return Ok(await _appHub.UpdateFlashcardCard(existing));
    }

    [HttpDelete("{id}/cards/{cardId}")]
    public async Task<IActionResult> DeleteCard(string id, string cardId)
    {
        await _appHub.RemoveFlashcardCard(cardId);
        return NoContent();
    }

    [HttpPost("generate")]
    public async Task<ActionResult<List<FlashcardCard>>> GenerateFlashcards(
        [FromBody] AIFlashcardRequest req
    )
    {
        if (string.IsNullOrWhiteSpace(req.notes))
            return BadRequest(new { message = "Notes cannot be empty" });

        var cards = await _appHub.GetAIFlashcards(req.notes);
        return Ok(cards);
    }
}

public class CreateFlashcardSetRequest
{
    public string? userId { get; set; }
    public string? name { get; set; }
    public string? description { get; set; }
    public bool? published { get; set; }
    public float? cost { get; set; }
    public string? code { get; set; }
}

public class UpdateFlashcardSetRequest
{
    public string? name { get; set; }
    public string? description { get; set; }
    public bool? published { get; set; }
    public float? cost { get; set; }
    public string? code { get; set; }
}

public class UpdateFlashcardCardRequest
{
    public string? front { get; set; }
    public string? back { get; set; }
    public List<Attachment>? frontAttachments { get; set; }
    public List<Attachment>? backAttachments { get; set; }
}
