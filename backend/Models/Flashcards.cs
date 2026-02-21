using SurrealDb.Net.Models;

public class DbFlashcard : Record
{
    public string? userId { get; set; }
    public float? cost { get; set; }
    public string? name { get; set; }
    public bool? published { get; set; }
    public string? description { get; set; }
    public string? code { get; set; }

    public DbFlashcard() { }

    public DbFlashcard(Flashcard quiz)
    {
        this.name = quiz.name;
        this.published = quiz.published ?? false;
        this.description = quiz.description;
        this.userId = quiz.userId;
        this.cost = quiz.cost ?? 0.0f;
        this.code = quiz.code;
        if (quiz.id is not null)
        {
            this.Id = new RecordIdOfString("flashcard", quiz.id);
        }
    }

    public Flashcard ToBase()
    {
        return new Flashcard
        {
            name = this.name,
            description = this.description,
            published = this.published ?? false,
            userId = this.userId,
            cost = this.cost ?? 0.0f,
            code = this.code,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}

public class DbFlashcardCard : Record
{
    public string? front { get; set; }
    public string? back { get; set; }
    public string? flashcardId { get; set; }

    public DbFlashcardCard() { }

    public DbFlashcardCard(FlashcardCard que)
    {
        this.front = que.front;
        this.back = que.back;
        this.flashcardId = que.flashcardId;
        if (que.id is not null)
        {
            this.Id = new RecordIdOfString("flashcard_card", que.id);
        }
    }

    public FlashcardCard ToBase()
    {
        return new FlashcardCard
        {
            front = this.front,
            back = this.back,
            flashcardId = this.flashcardId,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}

