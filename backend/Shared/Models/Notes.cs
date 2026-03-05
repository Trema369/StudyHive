using System;
using System.Collections.Generic;

namespace backend.Shared.Models;

public class NoteGroup
{
    public string? userId { get; set; }
    public string? name { get; set; }
    public string? description { get; set; }
    public List<string>? labels { get; set; }
    public string? accentColor { get; set; }
    public bool? isPublic { get; set; }
    public string? code { get; set; }
    public string? sourceGroupId { get; set; }
    public DateTime? fetchedAt { get; set; }
    public DateTime? createdAt { get; set; }
    public string? id { get; set; }
}

public class Note
{
    public string? groupId { get; set; }
    public string? userId { get; set; }
    public string? title { get; set; }
    public string? content { get; set; }
    public List<Attachment>? attachments { get; set; }
    public DateTime? updatedAt { get; set; }
    public string? id { get; set; }
}

public class TodoChecklistItem
{
    public string? id { get; set; }
    public string? text { get; set; }
    public bool done { get; set; }
}

public class TodoItem
{
    public string? userId { get; set; }
    public string? title { get; set; }
    public string? description { get; set; }
    public string? status { get; set; } // TODO turn these into an enum for now a string that should be : todo, in_progress, blocked or done
    public string? priority { get; set; } // low, medium, high, urgent
    public DateTime? dueAt { get; set; }
    public List<string>? labels { get; set; }
    public List<TodoChecklistItem>? checklist { get; set; }
    public string? linkedGroupId { get; set; }
    public string? linkedNoteId { get; set; }
    public DateTime? createdAt { get; set; }
    public DateTime? updatedAt { get; set; }
    public string? id { get; set; }
}
