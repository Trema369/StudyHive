using backend.Hubs;
using backend.Shared.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuizController : ControllerBase
{
    private readonly AppHub _appHub;

    public QuizController(AppHub appHub)
    {
        _appHub = appHub;
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<Quiz>>> GetUserQuizzes(string userId)
    {
        return Ok(await _appHub.GetQuizzesFromUser(userId));
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<Quiz>>> Search([FromQuery] string? query)
    {
        return Ok(await _appHub.SearchQuizzes(query ?? ""));
    }

    [HttpGet("code/{code}")]
    public async Task<ActionResult<Quiz>> GetByCode(string code)
    {
        var set = await _appHub.GetQuizByCode(code);
        return Ok(set);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Quiz>> GetById(string id)
    {
        var set = await _appHub.GetQuiz(id);
        return Ok(set);
    }

    [HttpPost]
    public async Task<ActionResult<Quiz>> Create([FromBody] CreateQuizRequest req)
    {
        var created = await _appHub.CreateQuiz(
            new Quiz
            {
                userId = req.userId.Trim() ?? "",
                name = req.name.Trim() ?? "",
                description = req.description.Trim() ?? "",
                published = req.published ?? false,
                timerMinutes = req.timerMinutes,
                cost = req.cost ?? 0,
                code = string.IsNullOrWhiteSpace(req.code)
                    ? Guid.NewGuid().ToString("N")[..10].ToUpperInvariant()
                    : req.code.Trim(),
            }
        );
        return Ok(created);
    }

    [HttpPatch("{id}")]
    public async Task<ActionResult<Quiz>> Update(string id, [FromBody] UpdateQuizRequest req)
    {
        var existing = await _appHub.GetQuiz(id);
        existing.name = req.name ?? existing.name;
        existing.description = req.description ?? existing.description;
        existing.published = req.published ?? existing.published;
        existing.timerMinutes = req.timerMinutes ?? existing.timerMinutes;
        existing.cost = req.cost ?? existing.cost;
        existing.code = req.code ?? existing.code;

        return Ok(await _appHub.UpdateQuiz(existing));
    }

    [HttpGet("{id}/questions")]
    public async Task<ActionResult<List<Question>>> GetQuestions(string id)
    {
        return Ok(await _appHub.GetQuestions(id));
    }

    [HttpPost("{id}/questions")]
    public async Task<ActionResult<Question>> CreateQuestion(
        string id,
        [FromBody] UpsertQuestionRequest req
    )
    {
        var type = NormalizeQuestionType(req.type);
        var answers = NormalizeAnswers(type, req.answers);

        var created = await _appHub.CreateQuestion(
            new Question
            {
                quizId = id,
                text = req.text.Trim() ?? "",
                type = type,
                attachments = req.attachments ?? [],
                answers = answers,
            }
        );
        return Ok(created);
    }

    [HttpPatch("{id}/questions/{questionId}")]
    public async Task<ActionResult<Question>> UpdateQuestion(
        string id,
        string questionId,
        [FromBody] UpsertQuestionRequest req
    )
    {
        var questions = await _appHub.GetQuestions(id);
        var existing = questions.FirstOrDefault(x => x.id == questionId);
        var type = NormalizeQuestionType(req.type ?? existing.type);
        existing.quizId = id;
        existing.text = req.text ?? existing.text;
        existing.type = type;
        existing.attachments = req.attachments ?? existing.attachments ?? [];
        existing.answers = NormalizeAnswers(type, req.answers ?? existing.answers ?? []);
        return Ok(await _appHub.UpdateQuestion(existing));
    }

    [HttpDelete("{id}/questions/{questionId}")]
    public async Task<IActionResult> DeleteQuestion(string id, string questionId)
    {
        await _appHub.RemoveQuestion(questionId);
        return NoContent();
    }

    [HttpPost("{id}/submit")]
    public async Task<ActionResult<QuizSubmission>> Submit(
        string id,
        [FromBody] SubmitQuizRequest req
    )
    {
        var sub = await _appHub.SubmitQuiz(
            new QuizSubmission
            {
                quizId = id,
                userId = req.userId.Trim(),
                answers = req.answers ?? [],
                multiAnswers = req.multiAnswers ?? [],
                textAnswers = req.textAnswers ?? [],
                date = DateTime.Now,
            }
        );
        return Ok(sub);
    }

    [HttpGet("{id}/submissions")]
    public async Task<ActionResult<List<QuizSubmission>>> GetSubmissions(string id)
    {
        return Ok(await _appHub.GetQuizSubmissions(id));
    }

    [HttpGet("banks/user/{userId}")]
    public async Task<ActionResult<List<QuestionBank>>> GetBanks(string userId)
    {
        return Ok(await _appHub.GetQuestionBanks(userId));
    }

    [HttpPost("banks")]
    public async Task<ActionResult<QuestionBank>> CreateBank([FromBody] UpsertQuestionBankRequest req)
    {
        var bank = await _appHub.CreateQuestionBank(
            new QuestionBank
            {
                userId = req.userId.Trim(),
                name = req.name.Trim(),
                description = req.description?.Trim() ?? "",
            }
        );
        return Ok(bank);
    }

    [HttpPatch("banks/{bankId}")]
    public async Task<ActionResult<QuestionBank>> UpdateBank(
        string bankId,
        [FromBody] UpsertQuestionBankRequest req
    )
    {
        var existing = (await _appHub.GetQuestionBanks(req.userId ?? ""))
            .FirstOrDefault(x => x.id == bankId);
        existing.name = req.name ?? existing.name;
        existing.description = req.description ?? existing.description;
        return Ok(await _appHub.UpdateQuestionBank(existing));
    }

    [HttpDelete("banks/{bankId}")]
    public async Task<IActionResult> DeleteBank(string bankId)
    {
        await _appHub.RemoveQuestionBank(bankId);
        return NoContent();
    }

    [HttpGet("banks/{bankId}/questions")]
    public async Task<ActionResult<List<QuestionBankItem>>> GetBankQuestions(string bankId)
    {
        return Ok(await _appHub.GetQuestionBankItems(bankId));
    }

    [HttpPost("banks/{bankId}/questions")]
    public async Task<ActionResult<QuestionBankItem>> AddBankQuestion(
        string bankId,
        [FromBody] UpsertQuestionRequest req
    )
    {
        var type = NormalizeQuestionType(req.type);
        var answers = NormalizeAnswers(type, req.answers);
        var item = await _appHub.CreateQuestionBankItem(
            new QuestionBankItem
            {
                bankId = bankId,
                userId = req.userId,
                text = req.text,
                type = type,
                attachments = req.attachments ?? [],
                answers = answers,
            }
        );
        return Ok(item);
    }

    [HttpDelete("banks/{bankId}/questions/{itemId}")]
    public async Task<IActionResult> DeleteBankQuestion(string bankId, string itemId)
    {
        await _appHub.RemoveQuestionBankItem(itemId);
        return NoContent();
    }

    [HttpPost("{id}/questions/from-bank/{itemId}")]
    public async Task<ActionResult<Question>> AddQuestionFromBank(string id, string itemId)
    {
        var selected = await _appHub.GetQuestionBankItem(itemId);
        var created = await _appHub.CreateQuestion(
            new Question
            {
                quizId = id,
                text = selected.text,
                type = NormalizeQuestionType(selected.type),
                attachments = selected.attachments ?? [],
                answers = selected.answers ?? [],
            }
        );
        return Ok(created);
    }

    private static string NormalizeQuestionType(string? type)
    {
        var t = type?.Trim().ToLowerInvariant();
        return t switch
        {
            "fill_gap" => "fill_gap",
            "short_answer" => "short_answer",
            _ => "multiple_choice",
        };
    }

    private static List<Answer> NormalizeAnswers(string type, List<Answer>? answers)
    {
        var normalized = (answers ?? [])
            .Where(x => !string.IsNullOrWhiteSpace(x?.text))
            .Select(x =>
                new Answer
                {
                    text = x!.text!.Trim(),
                    isCorrect = x.isCorrect ?? false,
                    weight = x.weight ?? ((x.isCorrect ?? false) ? 1f : 0f),
                    attachments = x.attachments ?? [],
                }
            )
            .ToList();

        if (type == "multiple_choice")
        {
            if (!normalized.Any(x => x.isCorrect == true) && normalized.Count > 0)
                normalized[0].isCorrect = true;
            normalized = normalized
                .Select(x =>
                {
                    if (x.isCorrect == true && (x.weight ?? 0f) <= 0f)
                        x.weight = 1f;
                    if (x.isCorrect != true && (x.weight ?? 0f) < 0f)
                        x.weight = 0f;
                    return x;
                })
                .ToList();
            return normalized;
        }

        if (normalized.Count == 0)
            normalized.Add(new Answer { text = "", isCorrect = true });

        for (int i = 0; i < normalized.Count; i++)
            normalized[i].isCorrect = i == 0;
        normalized[0].weight = normalized[0].weight is null || normalized[0].weight <= 0f
            ? 1f
            : normalized[0].weight;
        return [normalized[0]];
    }
}

public class CreateQuizRequest
{
    public string? userId { get; set; }
    public string? name { get; set; }
    public string? description { get; set; }
    public bool? published { get; set; }
    public int? timerMinutes { get; set; }
    public float? cost { get; set; }
    public string? code { get; set; }
}

public class UpdateQuizRequest
{
    public string? name { get; set; }
    public string? description { get; set; }
    public bool? published { get; set; }
    public int? timerMinutes { get; set; }
    public float? cost { get; set; }
    public string? code { get; set; }
}

public class UpsertQuestionRequest
{
    public string? userId { get; set; }
    public string? text { get; set; }
    public string? type { get; set; }
    public List<Attachment>? attachments { get; set; }
    public List<Answer>? answers { get; set; }
}

public class UpsertQuestionBankRequest
{
    public string? userId { get; set; }
    public string? name { get; set; }
    public string? description { get; set; }
}

public class SubmitQuizRequest
{
    public string? userId { get; set; }
    public List<int?>? answers { get; set; }
    public List<List<int>>? multiAnswers { get; set; }
    public List<string?>? textAnswers { get; set; }
}
