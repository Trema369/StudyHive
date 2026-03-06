using System.Collections.Generic;
using System.Text.Json.Serialization;
using SurrealDb.Net.Models;

namespace backend.Shared.Models;

public class DbQuiz : Record
{
    public string? name { get; set; }
    public float? cost { get; set; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? timerMinutes { get; set; }
    public string? description { get; set; }
    public bool? published { get; set; }
    public string? userId { get; set; }
    public string? code { get; set; }

    public DbQuiz() { }

    public DbQuiz(Quiz quiz)
    {
        this.name = quiz.name;
        this.published = quiz.published ?? false;
        this.description = quiz.description;
        this.userId = quiz.userId;
        this.cost = quiz.cost;
        this.timerMinutes = quiz.timerMinutes;
        this.code = quiz.code;
        if (quiz.id is not null)
        {
            this.Id = new RecordIdOfString("quiz", quiz.id);
        }
    }

    public Quiz ToBase()
    {
        return new Quiz
        {
            name = this.name,
            description = this.description,
            published = this.published ?? false,
            userId = this.userId,
            cost = this.cost,
            timerMinutes = this.timerMinutes,
            code = this.code,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}

public class DbQuestionBank : Record
{
    public string? userId { get; set; }
    public string? name { get; set; }
    public string? description { get; set; }

    public DbQuestionBank() { }

    public DbQuestionBank(QuestionBank bank)
    {
        userId = bank.userId;
        name = bank.name;
        description = bank.description;
        if (bank.id is not null)
            Id = new RecordIdOfString("question_bank", bank.id);
    }

    public QuestionBank ToBase()
    {
        return new QuestionBank
        {
            userId = userId,
            name = name,
            description = description,
            id = Id?.DeserializeId<string>(),
        };
    }
}

public class DbQuestionBankItem : Record
{
    public string? bankId { get; set; }
    public string? userId { get; set; }
    public string? text { get; set; }
    public string? type { get; set; }
    public List<Attachment>? attachments { get; set; }
    public List<Answer>? answers { get; set; }

    public DbQuestionBankItem() { }

    public DbQuestionBankItem(QuestionBankItem item)
    {
        bankId = item.bankId;
        userId = item.userId;
        text = item.text;
        type = item.type;
        attachments = item.attachments;
        answers = item.answers;
        if (item.id is not null)
            Id = new RecordIdOfString("question_bank_item", item.id);
    }

    public QuestionBankItem ToBase()
    {
        return new QuestionBankItem
        {
            bankId = bankId,
            userId = userId,
            text = text,
            type = type,
            attachments = attachments,
            answers = answers,
            id = Id?.DeserializeId<string>(),
        };
    }
}

public class DbQuestion : Record
{
    public string? quizId { get; set; }
    public string? text { get; set; }
    public string? type { get; set; }
    public List<Attachment>? attachments { get; set; }
    public List<Answer>? answers { get; set; }

    public DbQuestion() { }

    public DbQuestion(Question que)
    {
        this.quizId = que.quizId;
        this.text = que.text;
        this.type = que.type;
        this.attachments = que.attachments;
        this.answers = que.answers;
        if (que.id is not null)
        {
            this.Id = new RecordIdOfString("question", que.id);
        }
    }

    public Question ToBase()
    {
        return new Question
        {
            quizId = this.quizId,
            answers = this.answers,
            attachments = this.attachments,
            text = this.text,
            type = this.type,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}

public class DbQuizSubmission : Record
{
    public string? quizId { get; set; }
    public string? userId { get; set; }
    public List<int?>? answers { get; set; }
    public List<List<int>>? multiAnswers { get; set; }
    public List<string?>? textAnswers { get; set; }
    public DateTime? date { get; set; }
    public float? score { get; set; }

    public DbQuizSubmission() { }

    public DbQuizSubmission(QuizSubmission sub)
    {
        this.quizId = sub.quizId;
        this.userId = sub.userId;
        this.answers = sub.answers;
        this.multiAnswers = sub.multiAnswers;
        this.textAnswers = sub.textAnswers;
        this.date = sub.date;
        this.score = sub.score;
        if (sub.id is not null)
        {
            this.Id = new RecordIdOfString("quizsubmission", sub.id);
        }
    }

    public QuizSubmission ToBase()
    {
        return new QuizSubmission
        {
            quizId = this.quizId,
            userId = this.userId,
            answers = this.answers,
            multiAnswers = this.multiAnswers,
            textAnswers = this.textAnswers,
            date = this.date,
            score = this.score,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}
