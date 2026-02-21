using System.Collections.Generic;
using SurrealDb.Net.Models;

namespace studbud.Shared.Models;

public class DbChat : Record
{
    public string? name { get; set; }
    public List<string>? userIds { get; set; }

    public DbChat() { }

    public DbChat(Chat chat)
    {
        this.name = chat.name;
        this.userIds = chat.userIds;
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
            id = this.Id?.DeserializeId<string>(),
        };
    }
}

public class DbMessage : Record
{
    public string? parentId { get; set; }
    public DateTime? date { get; set; }
    public string? userId { get; set; }
    public string? text { get; set; }

    public DbMessage() { }

    public DbMessage(Message msg)
    {
        this.parentId = msg.parentId;
        this.userId = msg.userId;
        this.text = msg.text;
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
            userId = this.userId,
            text = this.text,
            date = this.date,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}
