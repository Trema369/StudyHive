using System.Collections.Generic;

namespace backend.Shared.Models;

public class Quiz
{
    public string? name { get; set; }
    public float? cost { get; set; }
    public bool? published { get; set; }
    public int? timerMinutes { get; set; }
    public string? description { get; set; }
    public string? userId { get; set; }
    public string? code { get; set; }
    public string? id { get; set; }

    public Quiz() { }
}

public class QuestionBank
{
    public string? userId { get; set; }
    public string? name { get; set; }
    public string? description { get; set; }
    public string? id { get; set; }

    public QuestionBank() { }
}

public class QuestionBankItem
{
    public string? bankId { get; set; }
    public string? userId { get; set; }
    public string? text { get; set; }
    public string? type { get; set; }
    public List<Attachment>? attachments { get; set; }
    public List<Answer>? answers { get; set; }
    public string? id { get; set; }

    public QuestionBankItem() { }
}

public class Question
{
    public string? quizId { get; set; }
    public string? text { get; set; }
    public string? type { get; set; }
    public List<Attachment>? attachments { get; set; }
    public List<Answer>? answers { get; set; }
    public string? id { get; set; }

    public Question() { }
}

public class Answer
{
    public string? text { get; set; }
    public bool? isCorrect { get; set; }
    public float? weight { get; set; }
    public List<Attachment>? attachments { get; set; }

    public Answer() { }
}

public class QuizSubmission
{
    public string? quizId { get; set; }
    public string? userId { get; set; }
    public List<int?>? answers { get; set; }
    public List<List<int>>? multiAnswers { get; set; }
    public List<string?>? textAnswers { get; set; }
    public DateTime? date { get; set; }
    public float? score { get; set; }
    public string? id { get; set; }

    public QuizSubmission() { }
}
