using System.Collections.Generic;

namespace studbud.Shared.Models;

public class Quiz
{
    public string? name { get; set; }
    public float? cost {get; set;}
    public bool? published {get; set;}
    public string? description { get; set; }
    public string? userId { get; set; }
    public string? code { get; set; }
    public string? id { get; set; }

    public Quiz() { }
}

public class Question
{
    public string? quizId { get; set; }
    public string? text { get; set; }
    public List<Answer>? answers { get; set; }
    public string? id { get; set; }

    public Question() { }
}

public class Answer
{
    public string? text { get; set; }
    public bool? isCorrect { get; set; }

    public Answer() { }
}

public class QuizSubmission
{
    public string? quizId { get; set; }
    public string? userId { get; set; }
    public List<int?>? answers { get; set; }
    public DateTime? date { get; set; }
    public int? score { get; set; }
    public string? id { get; set; }

    public QuizSubmission() { }
}
