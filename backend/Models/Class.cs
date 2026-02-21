using System;
using System.Collections.Generic;
using SurrealDb.Net.Models;

namespace studbud.Shared.Models;

public class DbClass : Record
{
    public string? name { get; set; }
    public string? description { get; set; }
    public List<string>? userIds { get; set; }
    public List<string>? teacherIds { get; set; }
    public string? code { get; set; }
    public List<PinnedLink>? pinnedLinks { get; set; }

    public DbClass() { }

    public DbClass(Class clss)
    {
        this.name = clss.name;
        this.description = clss.description;
        this.userIds = clss.userIds;
        this.teacherIds = clss.teacherIds;
        this.code = clss.code ?? new Random().Next(99999).ToString();
        if (clss.pinnedLinks is not null)
        {
            this.pinnedLinks = clss.pinnedLinks;
        }
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
            pinnedLinks = this.pinnedLinks,
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

    public DbAssignment() { }

    public DbAssignment(Assignment ass)
    {
        this.name = ass.name;
        this.classId = ass.classId;
        this.due = ass.due;
        this.text = ass.text;
        this.maxMark = ass.maxMark;
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
    public int? mark { get; set; }

    public DbSubmission() { }

    public DbSubmission(Submission sub)
    {
        this.assignmentId = sub.assignmentId;
        this.userId = sub.userId;
        this.text = sub.text;
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
            date = this.date,
            mark = this.mark,
            id = this.Id?.DeserializeId<string>(),
        };
    }
}
