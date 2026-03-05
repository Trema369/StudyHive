using System;
using System.Collections.Generic;

namespace backend.Shared.Models;

public class Contribution
{
    public string? userId { get; set; }
    public string? title { get; set; }
    public string? description { get; set; }
    public string? category { get; set; }
    public List<Attachment>? attachments { get; set; }
    public DateTime? createdAt { get; set; }
    public string? id { get; set; }
}

