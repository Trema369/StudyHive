using System;
using System.Collections.Generic;

namespace studbud.Shared.Models;

public class Class
{
    public string? name { get; set; }
    public string? description { get; set; }
    public List<string>? userIds { get; set; }
    public List<string>? teacherIds { get; set; }
    public string? code { get; set; }
    public List<PinnedLink>? pinnedLinks { get; set; }
    public string? id { get; set; }

    public Class() { }
}

public class PinnedLink
{
    public string? title { get; set; }
    public string? url { get; set; }
    public string? code { get; set; }

    public PinnedLink() { }
}

public class Assignment
{
    public string? name { get; set; }
    public string? classId { get; set; }
    public DateTime? due { get; set; }
    public string? text { get; set; }
    public int? maxMark { get; set; }
    public string? id { get; set; }

    public Assignment() { }
}

public class Submission
{
    public string? assignmentId { get; set; }
    public DateTime? date { get; set; }
    public string? userId { get; set; }
    public string? text { get; set; }
    public int? mark { get; set; }
    public string? id { get; set; }

    public Submission() { }
}
