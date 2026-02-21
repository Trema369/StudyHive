using System;
using System.Collections.Generic;

namespace studbud.Shared.Models;

public class Chat
{
    public string? name { get; set; }
    public List<string>? userIds { get; set; }
    public string? id { get; set; }

    public Chat() { }
}

public class Message
{
    public string? parentId { get; set; }
    public DateTime? date { get; set; }
    public string? userId { get; set; }
    public string? text { get; set; }
    public string? id { get; set; }

    public Message() { }
}
