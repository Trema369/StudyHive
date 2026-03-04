using System.Collections.Generic;
using System.Text.Json.Serialization;
using SurrealDb.Net.Models;

namespace backend.Shared.Models;

public class DbChat : Record
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? name { get; set; }
    public List<string>? userIds { get; set; }
    public List<string>? adminIds { get; set; }
    public string? accentColor { get; set; }
    public bool? adminOnly { get; set; }
    public bool? isDirect { get; set; }

    public DbChat() { }

    public DbChat(Chat chat)
    {
        this.name = chat.name;
        this.userIds = chat.userIds;
        this.adminIds = chat.adminIds;
        this.accentColor = chat.accentColor ?? "#3b82f6";
        this.adminOnly = chat.adminOnly ?? false;
        this.isDirect = chat.isDirect ?? false;
        if (chat.id is not null)
        {
            this.Id = new RecordIdOfString("chat", chat.id);
        }
    }

    public Chat ToBase()
    {
        return new Chat
        {
            name = this.name,
            userIds = this.userIds,
            adminIds = this.adminIds,
            accentColor = this.accentColor ?? "#3b82f6",
            adminOnly = this.adminOnly ?? false,
            isDirect = this.isDirect ?? false,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}

public class DbMessage : Record
{
    public string? parentId { get; set; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? parentMessageId { get; set; }
    public DateTime? date { get; set; }
    public string? userId { get; set; }
    public string? text { get; set; }
    public List<Attachment>? attachments { get; set; }

    public DbMessage() { }

    public DbMessage(Message msg)
    {
        this.parentId = msg.parentId;
        this.parentMessageId = msg.parentMessageId;
        this.userId = msg.userId;
        this.text = msg.text;
        this.attachments = msg.attachments ?? [];
        this.date = msg.date;
        if (msg.id is not null)
        {
            this.Id = new RecordIdOfString("message", msg.id);
        }
    }

    public Message ToBase()
    {
        return new Message
        {
            parentId = this.parentId,
            parentMessageId = this.parentMessageId,
            userId = this.userId,
            text = this.text,
            attachments = this.attachments ?? [],
            date = this.date,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}
