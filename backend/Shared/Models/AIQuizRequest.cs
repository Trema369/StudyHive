namespace backend.Shared.Models
{
    public class AIQuizRequest
    {
        public string notes { get; set; } = string.Empty;
        public string? model { get; set; }
    }
}
