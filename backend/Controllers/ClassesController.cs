using backend.Hubs;
using backend.Shared;
using backend.Shared.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClassesController : ControllerBase
{
    private readonly AppHub _appHub;
    private readonly IHubContext<AppHub, IAppHubClient> _hubContext;

    public ClassesController(AppHub appHub, IHubContext<AppHub, IAppHubClient> hubContext)
    {
        _appHub = appHub;
        _hubContext = hubContext;
    }

    [HttpPost]
    public async Task<ActionResult<Class>> CreateClass([FromBody] CreateClassRequest req)
    {
        var clss = new Class
        {
            name = req.name,
            description = req.description,
            userIds = [req.teacherId],
            teacherIds = [req.teacherId],
            code = req.code,
            isPublic = req.isPublic ?? false,
            accentColor = req.accentColor ?? "#3b82f6",
        };
        return Ok(await _appHub.CreateClass(clss));
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<Class>>> GetUserClasses(string userId)
    {
        return Ok(await _appHub.GetClassesFromUser(userId));
    }

    [HttpGet("public")]
    public async Task<ActionResult<List<Class>>> GetPublicClasses()
    {
        return Ok(await _appHub.GetPublicClasses());
    }

    [HttpGet("{classId}")]
    public async Task<ActionResult<Class>> GetClass(string classId)
    {
        return Ok(await _appHub.GetClass(classId));
    }

    [HttpPost("join")]
    public async Task<ActionResult<Class>> JoinClass([FromBody] JoinClassRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.userId) || string.IsNullOrWhiteSpace(req.code))
            return BadRequest(new { message = "userId and code are required" });
        var joined = await _appHub.JoinClass(req.userId, req.code);
        if (joined is null)
            return NotFound(new { message = "No class found with that code" });
        return Ok(joined);
    }

    [HttpPost("{classId}/join")]
    public async Task<ActionResult<Class>> JoinPublicClass(
        string classId,
        [FromBody] JoinPublicClassRequest req
    )
    {
        if (string.IsNullOrWhiteSpace(req.userId))
            return BadRequest(new { message = "userId is required" });

        var clss = await _appHub.GetClass(classId);
        if (clss is null)
            return NotFound();
        if (clss.isPublic != true)
            return Forbid();
        if ((clss.userIds ?? []).Contains(req.userId))
            return Ok(clss);

        return Ok(await _appHub.AddStudentToClass(classId, req.userId));
    }

    [HttpPatch("{classId}")]
    public async Task<ActionResult<Class>> UpdateClassInfo(string classId, [FromBody] UpdateClassRequest req)
    {
        var updated = await _appHub.UpdateClassInfo(classId, req.name, req.description);
        if (req.accentColor is not null)
            updated = await _appHub.SetClassAccentColor(classId, req.accentColor);
        if (req.isPublic is not null)
            updated = await _appHub.SetClassVisibility(classId, req.isPublic.Value);
        if (req.pinnedLinks is not null)
            updated = await _appHub.SetPinnedLinks(classId, req.pinnedLinks);
        return Ok(updated);
    }

    [HttpPost("{classId}/teachers/{userId}")]
    public async Task<ActionResult<Class>> PromoteTeacher(string classId, string userId)
    {
        return Ok(await _appHub.PromoteTeacher(classId, userId));
    }

    [HttpDelete("{classId}/users/{userId}")]
    public async Task<ActionResult<Class>> RemoveStudent(string classId, string userId)
    {
        return Ok(await _appHub.RemoveStudentFromClass(classId, userId));
    }

    [HttpGet("{classId}/people")]
    public async Task<ActionResult<List<ClassPerson>>> GetPeople(string classId)
    {
        var clss = await _appHub.GetClass(classId);
        var ids = clss.userIds ?? [];

        var users = await _appHub.GetUsers(ids);
        var teacherSet = new HashSet<string>(clss.teacherIds ?? []);

        var people = users
            .Select(x => new ClassPerson
            {
                id = x.id,
                username = x.username ?? x.id,
                isTeacher = x.id is not null && teacherSet.Contains(x.id),
            })
            .OrderBy(x => x.username)
            .ToList();

        return Ok(people);
    }

    [HttpPost("users/resolve")]
    public async Task<ActionResult<List<ResolvedUser>>> ResolveUsers(
        [FromBody] ResolveUsersRequest req
    )
    {
        var ids = req.ids ?? [];
        if (ids.Count == 0)
            return Ok(new List<ResolvedUser>());

        var users = await _appHub.GetUsers(ids);
        return Ok(
            users.Select(x => new ResolvedUser { id = x.id, username = x.username ?? x.id }).ToList()
        );
    }

    [HttpGet("{classId}/threads")]
    public async Task<ActionResult<List<ClassThread>>> GetThreads(string classId)
    {
        return Ok(await _appHub.GetClassThreads(classId));
    }

    [HttpPost("{classId}/threads")]
    public async Task<ActionResult<ClassThread>> CreateThread(
        string classId,
        [FromBody] CreateThreadRequest req
    )
    {
        var thread = await _appHub.CreateClassThread(
            new ClassThread
            {
                classId = classId,
                userId = req.userId,
                title = req.title.Trim(),
                text = req.text.Trim(),
                attachments = req.attachments ?? [],
                date = DateTime.Now,
            }
        );
        await _hubContext.Clients.Group($"class-threads-{classId}").ReceiveClassThread(thread);
        return Ok(thread);
    }

    [HttpPatch("{classId}/threads/{threadId}")]
    public async Task<ActionResult<ClassThread>> UpdateThread(
        string classId,
        string threadId,
        [FromBody] UpdateThreadRequest req
    )
    {
        var existing = (await _appHub.GetClassThreads(classId)).FirstOrDefault(x => x.id == threadId);
        if (existing is null)
            return NotFound();
        existing.title = req.title ?? existing.title;
        existing.text = req.text ?? existing.text;
        return Ok(await _appHub.UpdateClassThread(existing));
    }

    [HttpGet("threads/{threadId}/comments")]
    public async Task<ActionResult<List<ClassThreadComment>>> GetThreadComments(string threadId)
    {
        return Ok(await _appHub.GetClassThreadComments(threadId));
    }

    [HttpPost("threads/{threadId}/comments")]
    public async Task<ActionResult<ClassThreadComment>> CreateThreadComment(
        string threadId,
        [FromBody] CreateThreadCommentRequest req
    )
    {
        var created = await _appHub.CreateClassThreadComment(
            new ClassThreadComment
            {
                threadId = threadId,
                userId = req.userId,
                parentCommentId = req.parentCommentId,
                text = req.text,
                attachments = req.attachments ?? [],
                date = DateTime.Now,
            }
        );
        await _hubContext.Clients.Group($"thread-comments-{threadId}").ReceiveClassThreadComment(created);
        return Ok(created);
    }

    [HttpGet("{classId}/assignments")]
    public async Task<ActionResult<List<Assignment>>> GetAssignments(string classId)
    {
        return Ok(await _appHub.GetAssignments(classId));
    }

    [HttpPost("{classId}/assignments")]
    public async Task<ActionResult<Assignment>> CreateAssignment(
        string classId,
        [FromBody] CreateAssignmentRequest req
    )
    {
        var ass = await _appHub.CreateAssignment(
            new Assignment
            {
                classId = classId,
                name = req.name,
                text = req.text,
                due = req.due,
                maxMark = req.maxMark,
                attachments = req.attachments ?? [],
            }
        );
        return Ok(ass);
    }

    [HttpPatch("{classId}/assignments/{assignmentId}")]
    public async Task<ActionResult<Assignment>> UpdateAssignment(
        string classId,
        string assignmentId,
        [FromBody] CreateAssignmentRequest req
    )
    {
        var existing = (await _appHub.GetAssignments(classId)).FirstOrDefault(x => x.id == assignmentId);
        if (existing is null)
            return NotFound();
        existing.name = req.name ?? existing.name;
        existing.text = req.text ?? existing.text;
        existing.due = req.due ?? existing.due;
        existing.maxMark = req.maxMark ?? existing.maxMark;
        existing.attachments = req.attachments ?? existing.attachments;
        return Ok(await _appHub.UpdateAssignment(existing));
    }

    [HttpPost("assignments/{assignmentId}/submissions")]
    public async Task<ActionResult<Submission>> SubmitAssignment(
        string assignmentId,
        [FromBody] SubmitAssignmentRequest req
    )
    {
        var sub = await _appHub.SubmitAssignment(
            new Submission
            {
                id = req.id,
                assignmentId = assignmentId,
                userId = req.userId,
                text = req.text,
                attachments = req.attachments ?? [],
                date = DateTime.Now,
            }
        );
        return Ok(sub);
    }

    [HttpGet("assignments/{assignmentId}/submissions")]
    public async Task<ActionResult<List<Submission>>> GetSubmissions(string assignmentId)
    {
        return Ok(await _appHub.GetSubmissions(assignmentId));
    }

    [HttpPatch("submissions/{submissionId}/mark")]
    public async Task<ActionResult<Submission>> SetMark(
        string submissionId,
        [FromBody] SetMarkRequest req
    )
    {
        return Ok(await _appHub.SetSubmissionMark(submissionId, req.mark));
    }
}

public class CreateClassRequest
{
    public string? name { get; set; }
    public string? description { get; set; }
    public string? teacherId { get; set; }
    public string? teacherUsername { get; set; }
    public string? teacherEmail { get; set; }
    public string? code { get; set; }
    public bool? isPublic { get; set; }
    public string? accentColor { get; set; }
}

public class JoinClassRequest
{
    public string? userId { get; set; }
    public string? code { get; set; }
}

public class JoinPublicClassRequest
{
    public string? userId { get; set; }
}

public class UpdateClassRequest
{
    public string? name { get; set; }
    public string? description { get; set; }
    public bool? isPublic { get; set; }
    public string? accentColor { get; set; }
    public List<PinnedLink>? pinnedLinks { get; set; }
}

public class CreateThreadRequest
{
    public string? userId { get; set; }
    public string? title { get; set; }
    public string? text { get; set; }
    public List<Attachment>? attachments { get; set; }
}

public class UpdateThreadRequest
{
    public string? title { get; set; }
    public string? text { get; set; }
}

public class CreateThreadCommentRequest
{
    public string? userId { get; set; }
    public string? parentCommentId { get; set; }
    public string? text { get; set; }
    public List<Attachment>? attachments { get; set; }
}

public class CreateAssignmentRequest
{
    public string? name { get; set; }
    public string? text { get; set; }
    public DateTime? due { get; set; }
    public int? maxMark { get; set; }
    public List<Attachment>? attachments { get; set; }
}

public class SubmitAssignmentRequest
{
    public string? id { get; set; }
    public string? userId { get; set; }
    public string? text { get; set; }
    public List<Attachment>? attachments { get; set; }
}

public class SetMarkRequest
{
    public int mark { get; set; }
}

public class ClassPerson
{
    public string? id { get; set; }
    public string? username { get; set; }
    public bool isTeacher { get; set; }
}

public class ResolveUsersRequest
{
    public List<string>? ids { get; set; }
}

public class ResolvedUser
{
    public string? id { get; set; }
    public string? username { get; set; }
}
