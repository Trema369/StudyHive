public class Flashcard
{
    public string? id { get; set; }
    public float? cost {get; set;}
    public string? userId { get; set; }
    public bool? published {get; set;}
    public string? name { get; set; }
    public string? description { get; set; }
    public string? code { get; set; }
    public Flashcard() { }
}

public class FlashcardCard
{
    public string? front { get; set; }
    public string? back { get; set; }
    public string? flashcardId { get; set; }
    public string? id { get; set; }
    public FlashcardCard() { }
}