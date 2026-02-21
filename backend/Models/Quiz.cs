using System.Collections.Generic;
using SurrealDb.Net.Models;

namespace studbud.Shared.Models;

public class DbQuiz : Record
{
    public string? name { get; set; }
    public float? cost {get; set;}
    public string? description { get; set; }
    public bool? published {get; set;}
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
            code = this.code,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}

public class DbQuestion : Record
{
    public string? quizId { get; set; }
    public string? text { get; set; }
    public List<Answer>? answers { get; set; }

    public DbQuestion() { }

    public DbQuestion(Question que)
    {
        this.quizId = que.quizId;
        this.text = que.text;
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
            text = this.text,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}

public class DbQuizSubmission : Record
{
    public string? quizId { get; set; }
    public string? userId { get; set; }
    public List<int?>? answers { get; set; }
    public DateTime? date { get; set; }
    public int? score { get; set; }

    public DbQuizSubmission() { }

    public DbQuizSubmission(QuizSubmission sub)
    {
        this.quizId = sub.quizId;
        this.userId = sub.userId;
        this.answers = sub.answers;
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
            date = this.date,
            score = this.score,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}
