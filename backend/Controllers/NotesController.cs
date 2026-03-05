using backend.Shared.Models;
using backend.Hubs;
using Microsoft.AspNetCore.Mvc;
using SurrealDb.Net;
using SurrealDb.Net.Models;

namespace backend.Controllers;

// TODO Move some functionality back into the app hub for consistency
[ApiController]
[Route("api/[controller]")]
public class NotesController : ControllerBase
{
    private readonly SurrealDbClient _dbClient;
    private readonly AppHub _appHub;

    public NotesController(SurrealDbClient dbClient, AppHub appHub)
    {
        _dbClient = dbClient;
        _appHub = appHub;
    }

    [HttpGet("groups/{userId}")]
    public async Task<ActionResult<List<NoteGroup>>> GetGroups(string userId)
    {
        return Ok(await _appHub.GetNoteGroups(userId));
    }

    [HttpPost("groups")]
    public async Task<ActionResult<NoteGroup>> CreateGroup([FromBody] CreateNoteGroupRequest req)
    {
        RecordId groupId = ("note_group", Guid.NewGuid().ToString("N"));
        var res = await _dbClient.Query(
            $"CREATE {groupId} SET userId = {req.userId.Trim()}, name = {req.name.Trim()}, description = {req.description?.Trim() ?? ""}, labels = {req.labels ?? []}, accentColor = {req.accentColor ?? "#3b82f6"}, isPublic = {req.isPublic ?? false}, code = {GenerateShareCode()}, createdAt = {DateTime.Now};"
        );
        res.EnsureAllOks();
        var created = await _dbClient.Select<DbNoteGroup>(groupId);
        return Ok(created.ToBase());
    }

    [HttpPatch("groups/{groupId}")]
    public async Task<ActionResult<NoteGroup>> UpdateGroup(
        string groupId,
        [FromBody] UpdateNoteGroupRequest req
    )
    {
        var existing = await _dbClient.Select<DbNoteGroup>(("note_group", groupId));
        if (existing is null)
            return NotFound();

        var updatedName = req.name ?? existing.name ?? "Untitled group";
        var updatedDescription = req.description ?? existing.description ?? "";
        var updatedLabels = req.labels ?? existing.labels ?? [];
        var updatedAccentColor = req.accentColor ?? existing.accentColor ?? "#3b82f6";
        var updatedPublic = req.isPublic ?? existing.isPublic ?? false;

        RecordId id = ("note_group", groupId);

        var updateRes = await _dbClient.Query(
            $"UPDATE {id} SET name = {updatedName}, description = {updatedDescription}, labels = {updatedLabels}, accentColor = {updatedAccentColor}, isPublic = {updatedPublic};"
        );
        updateRes.EnsureAllOks();

        var updated = await _dbClient.Select<DbNoteGroup>(id);
        return Ok(updated.ToBase());
    }

    [HttpPost("groups/clone")]
    public async Task<ActionResult<NoteGroup>> CloneGroup([FromBody] CloneNoteGroupRequest req)
    {
        var sourceResult = await _dbClient.Query(
            $"SELECT * FROM note_group WHERE code = {req.code.Trim()} LIMIT 1;"
        );
        var sourceGroup = sourceResult.GetValue<List<DbNoteGroup>>(0)?.FirstOrDefault();

        var clonedGroup = await _dbClient.Create(
            "note_group",
            new DbNoteGroup
            {
                userId = req.userId.Trim(),
                name = $"{sourceGroup.name ?? "Shared group"} (Copy)",
                description = sourceGroup.description,
                labels = sourceGroup.labels ?? [],
                accentColor = sourceGroup.accentColor ?? "#3b82f6",
                isPublic = false,
                code = GenerateShareCode(),
                sourceGroupId = sourceGroup.Id?.DeserializeId<string>(),
                fetchedAt = DateTime.Now,
                createdAt = DateTime.Now,
            }
        );

        var sourceGroupId = sourceGroup.Id?.DeserializeId<string>();
        if (!string.IsNullOrWhiteSpace(sourceGroupId))
        {
            var sourceNotesRes = await _dbClient.Query(
                $"SELECT * FROM note WHERE groupId = {sourceGroupId} ORDER BY updatedAt DESC;"
            );
            var sourceNotes = sourceNotesRes.GetValue<List<DbNote>>(0) ?? [];
            var clonedGroupId = clonedGroup.Id?.DeserializeId<string>() ?? "";
            foreach (var sourceNote in sourceNotes)
            {
                await _dbClient.Create(
                    "note",
                    new DbNote
                    {
                        groupId = clonedGroupId,
                        userId = req.userId.Trim(),
                        title = sourceNote.title ?? "Untitled note",
                        content = sourceNote.content ?? "",
                        updatedAt = DateTime.Now,
                        attachments = [],
                    }
                );
            }
        }

        return Ok(clonedGroup.ToBase());
    }

    [HttpPost("groups/{groupId}/fetch")]
    public async Task<ActionResult<NoteGroup>> FetchGroup(string groupId, [FromBody] FetchNoteGroupRequest req)
    {
        var existing = await _dbClient.Select<DbNoteGroup>(("note_group", groupId));
        if (string.IsNullOrWhiteSpace(existing.sourceGroupId))
            return BadRequest(new { message = "This group is not a cloned group" });

        var source = await _dbClient.Select<DbNoteGroup>(("note_group", existing.sourceGroupId));
        if (source is null)
            return NotFound(new { message = "Source group not found" });

        var targetUserId = existing.userId ?? req.userId?.Trim() ?? "";

        await _dbClient.Query($"DELETE note WHERE groupId = {groupId};");

        var sourceNotesRes = await _dbClient.Query(
            $"SELECT * FROM note WHERE groupId = {existing.sourceGroupId} ORDER BY updatedAt DESC;"
        );
        var sourceNotes = sourceNotesRes.GetValue<List<DbNote>>(0) ?? [];
        foreach (var sourceNote in sourceNotes)
        {
            await _dbClient.Create(
                "note",
                new DbNote
                {
                    groupId = groupId,
                    userId = targetUserId,
                    title = sourceNote.title ?? "Untitled note",
                    content = sourceNote.content ?? "",
                    updatedAt = DateTime.Now,
                    attachments = [],
                }
            );
        }

        existing.fetchedAt = DateTime.Now;
        existing.name = source.name is { Length: > 0 } ? $"{source.name} (Copy)" : existing.name;
        existing.description = source.description;
        existing.labels = source.labels ?? [];
        existing.accentColor = source.accentColor ?? existing.accentColor;
        var updated = await _dbClient.Update(existing);
        return Ok(updated.ToBase());
    }

    [HttpDelete("groups/{groupId}")]
    public async Task<IActionResult> DeleteGroup(string groupId)
    {
        await _dbClient.Delete(("note_group", groupId));
        await _dbClient.Query($"DELETE note WHERE groupId = {groupId};");
        return NoContent();
    }

    [HttpGet("group/{groupId}/notes")]
    public async Task<ActionResult<List<Note>>> GetNotes(string groupId)
    {
        return Ok(await _appHub.GetNotesForGroup(groupId));
    }

    [HttpPost("notes")]
    public async Task<ActionResult<Note>> CreateNote([FromBody] CreateNoteRequest req)
    {
        var created = await _dbClient.Create(
            "note",
            new DbNote
            {
                groupId = req.groupId.Trim(),
                userId = req.userId.Trim(),
                title = req.title.Trim(),
                content = req.content ?? "",
                attachments = req.attachments ?? [],
                updatedAt = DateTime.Now,
            }
        );
        return Ok(created.ToBase());
    }

    [HttpPatch("notes/{noteId}")]
    public async Task<ActionResult<Note>> UpdateNote(string noteId, [FromBody] UpdateNoteRequest req)
    {
        var existing = await _dbClient.Select<DbNote>(("note", noteId));
        existing.title = req.title ?? existing.title;
        existing.content = req.content ?? existing.content;
        existing.attachments = req.attachments ?? existing.attachments ?? [];
        existing.updatedAt = DateTime.Now;

        var updated = await _dbClient.Update(existing);
        return Ok(updated.ToBase());
    }

    [HttpDelete("notes/{noteId}")]
    public async Task<IActionResult> DeleteNote(string noteId)
    {
        await _dbClient.Delete(("note", noteId));
        return NoContent();
    }

    [HttpGet("todos/{userId}")]
    public async Task<ActionResult<List<TodoItem>>> GetTodos(string userId)
    {
        return Ok(await _appHub.GetTodos(userId));
    }

    [HttpPost("todos")]
    public async Task<ActionResult<TodoItem>> CreateTodo([FromBody] CreateTodoRequest req)
    {
        var now = DateTime.Now;
        RecordId todoId = ("todo_item", Guid.NewGuid().ToString("N"));
        var createRes = await _dbClient.Query(
            $"CREATE {todoId} SET userId = {req.userId.Trim()}, title = {req.title.Trim()}, description = {req.description ?? ""}, status = {req.status ?? "todo"}, priority = {req.priority ?? "medium"}, labels = {req.labels ?? []}, checklist = {req.checklist ?? []}, createdAt = {now}, updatedAt = {now};"
        );
        if (req.dueAt.HasValue)
        {
            var res = await _dbClient.Query(
                $"UPDATE {todoId} SET dueAt = {req.dueAt.Value};"
            );
            res.EnsureAllOks();
        }
        if (!string.IsNullOrWhiteSpace(req.linkedGroupId))
        {
            var res = await _dbClient.Query(
                $"UPDATE {todoId} SET linkedGroupId = {req.linkedGroupId};"
            );
            res.EnsureAllOks();
        }
        if (!string.IsNullOrWhiteSpace(req.linkedNoteId))
        {
            var res = await _dbClient.Query(
                $"UPDATE {todoId} SET linkedNoteId = {req.linkedNoteId};"
            );
            res.EnsureAllOks();
        }
        createRes.EnsureAllOks();
        
        var created = await _dbClient.Select<DbTodoItem>(todoId);
        return Ok(created.ToBase());
    }

    [HttpPatch("todos/{todoId}")]
    public async Task<ActionResult<TodoItem>> UpdateTodo(
        string todoId,
        [FromBody] UpdateTodoRequest req
    )
    {
        var existing = await _dbClient.Select<DbTodoItem>(("todo_item", todoId));
        var updatedTitle = req.title ?? existing.title ?? "Untitled todo";
        var updatedDescription = req.description ?? existing.description ?? "";
        var updatedStatus = req.status ?? existing.status ?? "todo";
        var updatedPriority = req.priority ?? existing.priority ?? "medium";
        var updatedLabels = req.labels ?? existing.labels ?? [];
        var updatedChecklist = req.checklist ?? existing.checklist ?? [];
        var updatedAt = DateTime.Now;

        RecordId id = ("todo_item", todoId);
        var updateRes = await _dbClient.Query(
            $"UPDATE {id} SET title = {updatedTitle}, description = {updatedDescription}, status = {updatedStatus}, priority = {updatedPriority}, labels = {updatedLabels}, checklist = {updatedChecklist}, updatedAt = {updatedAt};"
        );
        updateRes.EnsureAllOks();

        if (req.dueAt.HasValue)
        {
            var dueRes = await _dbClient.Query($"UPDATE {id} SET dueAt = {req.dueAt.Value};");
            dueRes.EnsureAllOks();
        }
        else
        {
            var dueUnsetRes = await _dbClient.Query($"UPDATE {id} UNSET dueAt;");
            dueUnsetRes.EnsureAllOks();
        }

        if (!string.IsNullOrWhiteSpace(req.linkedGroupId))
        {
            var groupRes = await _dbClient.Query($"UPDATE {id} SET linkedGroupId = {req.linkedGroupId};");
            groupRes.EnsureAllOks();
        }
        else
        {
            var groupUnsetRes = await _dbClient.Query($"UPDATE {id} UNSET linkedGroupId;");
            groupUnsetRes.EnsureAllOks();
        }

        if (!string.IsNullOrWhiteSpace(req.linkedNoteId))
        {
            var noteRes = await _dbClient.Query($"UPDATE {id} SET linkedNoteId = {req.linkedNoteId};");
            noteRes.EnsureAllOks();
        }
        else
        {
            var noteUnsetRes = await _dbClient.Query($"UPDATE {id} UNSET linkedNoteId;");
            noteUnsetRes.EnsureAllOks();
        }

        var updated = await _dbClient.Select<DbTodoItem>(("todo_item", todoId));
        return Ok(updated.ToBase());
    }

    [HttpDelete("todos/{todoId}")]
    public async Task<IActionResult> DeleteTodo(string todoId)
    {
        await _dbClient.Delete(("todo_item", todoId));
        return NoContent();
    }

    private static string GenerateShareCode()
    {
        return Convert.ToHexString(Guid.NewGuid().ToByteArray())
            .Replace("=", "")
            .Replace("-", "")
            .Substring(0, 10)
            .ToUpperInvariant();
    }
}

public class CreateNoteGroupRequest
{
    public string? userId { get; set; }
    public string? name { get; set; }
    public string? description { get; set; }
    public List<string>? labels { get; set; }
    public string? accentColor { get; set; }
    public bool? isPublic { get; set; }
}

public class UpdateNoteGroupRequest
{
    public string? name { get; set; }
    public string? description { get; set; }
    public List<string>? labels { get; set; }
    public string? accentColor { get; set; }
    public bool? isPublic { get; set; }
}

public class CloneNoteGroupRequest
{
    public string? userId { get; set; }
    public string? code { get; set; }
}

public class FetchNoteGroupRequest
{
    public string? userId { get; set; }
}

public class CreateNoteRequest
{
    public string? groupId { get; set; }
    public string? userId { get; set; }
    public string? title { get; set; }
    public string? content { get; set; }
    public List<Attachment>? attachments { get; set; }
}

public class UpdateNoteRequest
{
    public string? title { get; set; }
    public string? content { get; set; }
    public List<Attachment>? attachments { get; set; }
}

public class CreateTodoRequest
{
    public string? userId { get; set; }
    public string? title { get; set; }
    public string? description { get; set; }
    public string? status { get; set; }
    public string? priority { get; set; }
    public DateTime? dueAt { get; set; }
    public List<string>? labels { get; set; }
    public List<TodoChecklistItem>? checklist { get; set; }
    public string? linkedGroupId { get; set; }
    public string? linkedNoteId { get; set; }
}

public class UpdateTodoRequest
{
    public string? title { get; set; }
    public string? description { get; set; }
    public string? status { get; set; }
    public string? priority { get; set; }
    public DateTime? dueAt { get; set; }
    public List<string>? labels { get; set; }
    public List<TodoChecklistItem>? checklist { get; set; }
    public string? linkedGroupId { get; set; }
    public string? linkedNoteId { get; set; }
}
