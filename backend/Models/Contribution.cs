using System;
using System.Collections.Generic;
using SurrealDb.Net.Models;
using backend.Shared.Models;

namespace backend.Shared.Models;

public class DbContribution : Record
{
    public string? userId { get; set; }
    public string? title { get; set; }
    public string? description { get; set; }
    public string? category { get; set; }
    public List<Attachment>? attachments { get; set; }
    public DateTime? createdAt { get; set; }

    public DbContribution() { }

    public DbContribution(Contribution contribution)
    {
        userId = contribution.userId;
        title = contribution.title;
        description = contribution.description;
        category = contribution.category;
        attachments = contribution.attachments ?? [];
        createdAt = contribution.createdAt ?? DateTime.Now;
        if (!string.IsNullOrWhiteSpace(contribution.id))
        {
            Id = new RecordIdOfString("contribution", contribution.id);
        }
    }

    public Contribution ToBase()
    {
        return new Contribution
        {
            userId = userId,
            title = title,
            description = description,
            category = category,
            attachments = attachments ?? [],
            createdAt = createdAt,
            id = Id?.DeserializeId<string>(),
        };
    }
}

