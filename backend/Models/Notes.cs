using System;
using System.Collections.Generic;
using SurrealDb.Net.Models;
using backend.Shared.Models;

namespace backend.Shared.Models;

public class DbNoteGroup : Record
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

    public DbNoteGroup() { }

    public DbNoteGroup(NoteGroup group)
    {
        userId = group.userId;
        name = group.name;
        description = group.description;
        labels = group.labels ?? [];
        accentColor = group.accentColor ?? "#3b82f6";
        isPublic = group.isPublic ?? false;
        code = group.code;
        sourceGroupId = group.sourceGroupId;
        fetchedAt = group.fetchedAt;
        createdAt = group.createdAt ?? DateTime.Now;
        if (!string.IsNullOrWhiteSpace(group.id))
            Id = new RecordIdOfString("note_group", group.id);
    }

    public NoteGroup ToBase()
    {
        return new NoteGroup
        {
            userId = userId,
            name = name,
            description = description,
            labels = labels ?? [],
            accentColor = accentColor ?? "#3b82f6",
            isPublic = isPublic ?? false,
            code = code,
            sourceGroupId = sourceGroupId,
            fetchedAt = fetchedAt,
            createdAt = createdAt,
            id = Id?.DeserializeId<string>(),
        };
    }
}

public class DbNote : Record
{
    public string? groupId { get; set; }
    public string? userId { get; set; }
    public string? title { get; set; }
    public string? content { get; set; }
    public List<Attachment>? attachments { get; set; }
    public DateTime? updatedAt { get; set; }

    public DbNote() { }

    public DbNote(Note note)
    {
        groupId = note.groupId;
        userId = note.userId;
        title = note.title;
        content = note.content;
        attachments = note.attachments ?? [];
        updatedAt = note.updatedAt ?? DateTime.Now;
        if (!string.IsNullOrWhiteSpace(note.id))
            Id = new RecordIdOfString("note", note.id);
    }

    public Note ToBase()
    {
        return new Note
        {
            groupId = groupId,
            userId = userId,
            title = title,
            content = content,
            attachments = attachments ?? [],
            updatedAt = updatedAt,
            id = Id?.DeserializeId<string>(),
        };
    }
}

public class DbTodoItem : Record
{
    public string? userId { get; set; }
    public string? title { get; set; }
    public string? description { get; set; }
    public string? status { get; set; }
    public string? priority { get; set; }
    public DateTime? dueAt { get; set; }
    public List<string>? labels { get; set; }
    public List<TodoChecklistItem>? checklist { get; set; }
    public string? linkedGroupId { get; set; }
    public string? linkedNoteId { get; set; }
    public DateTime? createdAt { get; set; }
    public DateTime? updatedAt { get; set; }

    public DbTodoItem() { }

    public DbTodoItem(TodoItem todo)
    {
        userId = todo.userId;
        title = todo.title;
        description = todo.description;
        status = todo.status ?? "todo";
        priority = todo.priority ?? "medium";
        dueAt = todo.dueAt;
        labels = todo.labels ?? [];
        checklist = todo.checklist ?? [];
        linkedGroupId = todo.linkedGroupId;
        linkedNoteId = todo.linkedNoteId;
        createdAt = todo.createdAt ?? DateTime.Now;
        updatedAt = todo.updatedAt ?? DateTime.Now;
        if (!string.IsNullOrWhiteSpace(todo.id))
            Id = new RecordIdOfString("todo_item", todo.id);
    }

    public TodoItem ToBase()
    {
        return new TodoItem
        {
            userId = userId,
            title = title,
            description = description,
            status = status ?? "todo",
            priority = priority ?? "medium",
            dueAt = dueAt,
            labels = labels ?? [],
            checklist = checklist ?? [],
            linkedGroupId = linkedGroupId,
            linkedNoteId = linkedNoteId,
            createdAt = createdAt,
            updatedAt = updatedAt,
            id = Id?.DeserializeId<string>(),
        };
    }
}
