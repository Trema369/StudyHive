using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using SurrealDb.Net.Models;

namespace backend.Shared.Models;

public class DbClass : Record
{
    public string? name { get; set; }
    public string? description { get; set; }
    public List<string>? userIds { get; set; }
    public List<string>? teacherIds { get; set; }
    public string? code { get; set; }
    public bool? isPublic { get; set; }
    public string? accentColor { get; set; }
    public List<PinnedLink>? pinnedLinks { get; set; }

    public DbClass() { }

    public DbClass(Class clss)
    {
        this.name = clss.name;
        this.description = clss.description;
        this.userIds = clss.userIds;
        this.teacherIds = clss.teacherIds;
        this.code = clss.code ?? new Random().Next(99999).ToString();
        this.isPublic = clss.isPublic ?? false;
        this.accentColor = clss.accentColor ?? "#3b82f6";
        this.pinnedLinks = clss.pinnedLinks ?? [];
        if (clss.id is not null)
        {
            this.Id = new RecordIdOfString("class", clss.id);
        }
    }

    public Class ToBase()
    {
        return new Class
        {
            name = this.name,
            description = this.description,
            userIds = this.userIds,
            teacherIds = this.teacherIds,
            code = this.code ?? new Random().Next(99999).ToString(),
            isPublic = this.isPublic ?? false,
            accentColor = this.accentColor ?? "#3b82f6",
            pinnedLinks = this.pinnedLinks ?? [],
            id = this.Id?.DeserializeId<string>(),
        };
    }
}

public class DbClassThreadPost : Record
{
    public string? classId { get; set; }
    public string? userId { get; set; }
    public string? title { get; set; }
    public string? text { get; set; }
    public string? parentPostId { get; set; }
    public DateTime? date { get; set; }

    public DbClassThreadPost() { }

    public DbClassThreadPost(ClassThreadPost post)
    {
        this.classId = post.classId;
        this.userId = post.userId;
        this.title = post.title;
        this.text = post.text;
        this.parentPostId = post.parentPostId;
        this.date = post.date;
        if (post.id is not null)
        {
            this.Id = new RecordIdOfString("class_thread_post", post.id);
        }
    }

    public ClassThreadPost ToBase()
    {
        return new ClassThreadPost
        {
            classId = this.classId,
            userId = this.userId,
            title = this.title,
            text = this.text,
            parentPostId = this.parentPostId,
            date = this.date,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}

public class DbClassThread : Record
{
    public string? classId { get; set; }
    public string? userId { get; set; }
    public string? title { get; set; }
    public string? text { get; set; }
    public List<Attachment>? attachments { get; set; }
    public DateTime? date { get; set; }

    public DbClassThread() { }

    public DbClassThread(ClassThread thread)
    {
        this.classId = thread.classId;
        this.userId = thread.userId;
        this.title = thread.title;
        this.text = thread.text;
        this.attachments = thread.attachments ?? [];
        this.date = thread.date;
        if (thread.id is not null)
        {
            this.Id = new RecordIdOfString("class_thread", thread.id);
        }
    }

    public ClassThread ToBase()
    {
        return new ClassThread
        {
            classId = this.classId,
            userId = this.userId,
            title = this.title,
            text = this.text,
            attachments = this.attachments ?? [],
            date = this.date,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}

public class DbClassThreadComment : Record
{
    public string? threadId { get; set; }
    public string? userId { get; set; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? parentCommentId { get; set; }
    public string? text { get; set; }
    public List<Attachment>? attachments { get; set; }
    public DateTime? date { get; set; }

    public DbClassThreadComment() { }

    public DbClassThreadComment(ClassThreadComment comment)
    {
        this.threadId = comment.threadId;
        this.userId = comment.userId;
        this.parentCommentId = comment.parentCommentId;
        this.text = comment.text;
        this.attachments = comment.attachments ?? [];
        this.date = comment.date;
        if (comment.id is not null)
        {
            this.Id = new RecordIdOfString("class_thread_comment", comment.id);
        }
    }

    public ClassThreadComment ToBase()
    {
        return new ClassThreadComment
        {
            threadId = this.threadId,
            userId = this.userId,
            parentCommentId = this.parentCommentId,
            text = this.text,
            attachments = this.attachments ?? [],
            date = this.date,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}


public class DbAssignment : Record
{
    public string? name { get; set; }
    public string? classId { get; set; }
    public DateTime? due { get; set; }
    public string? text { get; set; }
    public int? maxMark { get; set; }
    public List<Attachment>? attachments { get; set; }

    public DbAssignment() { }

    public DbAssignment(Assignment ass)
    {
        this.name = ass.name;
        this.classId = ass.classId;
        this.due = ass.due;
        this.text = ass.text;
        this.maxMark = ass.maxMark;
        this.attachments = ass.attachments ?? [];
        if (ass.id is not null)
        {
            this.Id = new RecordIdOfString("assignment", ass.id);
        }
    }

    public Assignment ToBase()
    {
        return new Assignment
        {
            name = this.name,
            classId = this.classId,
            text = this.text,
            due = this.due,
            maxMark = this.maxMark,
            attachments = this.attachments ?? [],
            id = this.Id?.DeserializeId<string>(),
        };
    }
}

public class DbSubmission : Record
{
    public string? assignmentId { get; set; }
    public DateTime? date { get; set; }
    public string? userId { get; set; }
    public string? text { get; set; }
    public List<Attachment>? attachments { get; set; }
    public int? mark { get; set; }

    public DbSubmission() { }

    public DbSubmission(Submission sub)
    {
        this.assignmentId = sub.assignmentId;
        this.userId = sub.userId;
        this.text = sub.text;
        this.attachments = sub.attachments ?? [];
        this.date = sub.date;
        this.mark = sub.mark;
        if (sub.id is not null)
        {
            this.Id = new RecordIdOfString("submission", sub.id);
        }
    }

    public Submission ToBase()
    {
        return new Submission
        {
            assignmentId = this.assignmentId,
            userId = this.userId,
            text = this.text,
            attachments = this.attachments ?? [],
            date = this.date,
            mark = this.mark,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}
