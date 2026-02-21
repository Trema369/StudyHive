public class Payment
{
    public string? fromId { get; set; }
    public string? toId { get; set; }
    public float? amount { get; set; }
    public string? reason { get; set; }
    public PaymentReasonType? reasonType { get; set; }
    public string? id { get; set; }

    public Payment() { }
}

public enum PaymentReasonType
{
    Quiz,
    Flashcard,
    Transfer,
    Buy,
}