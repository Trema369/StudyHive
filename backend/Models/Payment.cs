using SurrealDb.Net.Models;

public class DbPayment : Record
{
    public string? fromId { get; set; }
    public string? toId { get; set; }
    public float? amount { get; set; }
    public string? reason { get; set; }
    public PaymentReasonType? reasonType { get; set; }
    public string? id { get; set; }

    public DbPayment() { }

    public DbPayment(Payment payment)
    {
        this.fromId = payment.fromId;
        this.toId = payment.toId;
        this.amount = payment.amount;
        this.reason = payment.reason;
        this.reasonType = payment.reasonType;
        if (payment.id is not null)
        {
            this.Id = new RecordIdOfString("payment", payment.id);
        }
    }

    public Payment ToBase()
    {
        return new Payment
        {
            fromId = this.fromId,
            toId = this.toId,
            amount = this.amount,
            reason = this.reason,
            reasonType = this.reasonType,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}

