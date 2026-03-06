using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using backend.Shared;
using backend.Shared.Models;
using Microsoft.AspNetCore.SignalR;
using SurrealDb.Net;
using SurrealDb.Net.Exceptions;
using SurrealDb.Net.Models;
using SurrealDb.Net.Models.Auth;

namespace backend.Hubs;

public class AppHub : Hub<IAppHubClient>, IAppHubServer
{
    private readonly ConcurrentDictionary<
        string,
        ConcurrentDictionary<string, bool>
    > connectedChats = new();

    // At the top of the class, alongside connectedChats
    private static readonly ConcurrentDictionary<string, string> _onlineUsers = new();

    // connectionId -> userId
    HttpClient httpClient = new HttpClient();
    private readonly SurrealDbClient dbClient;
    private readonly SurrealDbOptions dbOptions;
    private readonly OllamaSharp.OllamaApiClient AIClient;
    private readonly EcocashClient ecocashClient;

    public AppHub(SurrealDbClient dbClient, SurrealDbOptions dbOptions)
    {
        this.dbClient = dbClient;
        this.dbOptions = dbOptions;
        this.AIClient = new OllamaSharp.OllamaApiClient("http://localhost:11434/");
        this.ecocashClient = new EcocashClient("QVYPAT1icVGSxlD20aTH4ZV2SMg8bdUN");
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
        if (!string.IsNullOrEmpty(userId))
        {
            _onlineUsers[Context.ConnectionId] = userId;
            await Clients.All.UserOnline(userId);
        }
        Console.WriteLine("Connected");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Existing chat cleanup
        if (connectedChats.TryRemove(Context.ConnectionId, out var parents))
        {
            var tasks = parents.Keys.Select(p =>
                Groups.RemoveFromGroupAsync(Context.ConnectionId, p)
            );
            await Task.WhenAll(tasks);
        }

        // New presence cleanup
        if (_onlineUsers.TryRemove(Context.ConnectionId, out var userId))
        {
            await Clients.All.UserOffline(userId);
        }

        Console.WriteLine("Disconnected");
        await base.OnDisconnectedAsync(exception);
    }

    public Task<List<string>> GetOnlineUsers()
    {
        return Task.FromResult(_onlineUsers.Values.Distinct().ToList());
    }

    public async Task<User?> AddMoneyToUser(string userId, float amt)
    {
        RecordId id = ("user", userId);
        await dbClient.Query($"UPDATE {id} SET money += {amt};");
        var res = await dbClient.Select<DbUser>(id);
        return res?.ToBase();
    }

    public async Task EnsureTransaction(InitPaymentResponse response, Payment payment)
    {
        var res = await ecocashClient.PollTransaction(response);
        if (res.paymentSuccess)
        {
            RecordId toId = ("user", payment.toId!);
            await dbClient.Query($"UPDATE {toId} SET money += {payment.amount};");
            await dbClient.Create("payment", new DbPayment(payment));
        }
    }

    public async Task<Payment?> ProcessPayment(Payment payment)
    {
        if (payment.reasonType == PaymentReasonType.Buy)
        {
            var res = await ecocashClient.InitPayment(
                payment.fromId,
                payment.amount ?? 0.0f,
                payment.reason
            );
            Thread verifyThread = new Thread(
                new ThreadStart(() => EnsureTransaction(res, payment))
            );
            verifyThread.Start();
            return await GetDisplayPayment(payment, payment.toId);
        }

        var user = await GetUser(payment.fromId);
        if (user.money > payment.amount)
        {
            RecordId fromId = ("user", payment.fromId);
            await dbClient.Query($"UPDATE {fromId} SET money -= {payment.amount};");
            RecordId toId = ("user", payment.toId!);
            await dbClient.Query($"UPDATE {toId} SET money += {payment.amount};");
            var res = (await dbClient.Create("payment", new DbPayment(payment))).ToBase();
            return await GetDisplayPayment(res, res.fromId);
        }
        else
        {
            return null;
        }
    }

    public async Task<Message> SendMessage(Message msg)
    {
        var message = await SaveMessage(msg);
        if (!string.IsNullOrWhiteSpace(message.parentId))
        {
            await Clients.OthersInGroup(message.parentId).ReceiveMessage(message);
        }
        return message;
    }

    public async Task<Message> SaveMessage(Message msg)
    {
        var messageId = string.IsNullOrWhiteSpace(msg.id) ? Guid.NewGuid().ToString("N") : msg.id!;
        msg.date ??= DateTime.Now;
        msg.attachments ??= [];
        RecordId id = ("message", messageId);
        if (string.IsNullOrWhiteSpace(msg.parentMessageId))
        {
            await dbClient.Query(
                $"CREATE {id} SET parentId = {msg.parentId}, userId = {msg.userId}, text = {msg.text}, attachments = {msg.attachments}, date = {msg.date};"
            );
        }
        else
        {
            await dbClient.Query(
                $"CREATE {id} SET parentId = {msg.parentId}, parentMessageId = {msg.parentMessageId}, userId = {msg.userId}, text = {msg.text}, attachments = {msg.attachments}, date = {msg.date};"
            );
        }
        var res = await dbClient.Select<DbMessage>(id);
        if (res is null)
            throw new Exception("Message create did not persist");
        return res.ToBase();
    }

    public async Task<Chat> CreateChat(Chat chat)
    {
        chat.userIds ??= [];
        chat.adminIds ??= [];
        if (chat.adminIds.Count == 0 && chat.userIds.Count > 0)
        {
            chat.adminIds = [chat.userIds[0]];
        }
        chat.accentColor ??= "#3b82f6";
        chat.adminOnly ??= false;
        chat.isDirect ??= false;
        var chatId = string.IsNullOrWhiteSpace(chat.id) ? Guid.NewGuid().ToString("N") : chat.id!;
        RecordId id = ("chat", chatId);
        if (string.IsNullOrWhiteSpace(chat.name))
        {
            await dbClient.Query(
                $"CREATE {id} SET userIds = {chat.userIds}, adminIds = {chat.adminIds}, accentColor = {chat.accentColor}, adminOnly = {chat.adminOnly.Value}, isDirect = {chat.isDirect.Value};"
            );
        }
        else
        {
            await dbClient.Query(
                $"CREATE {id} SET name = {chat.name}, userIds = {chat.userIds}, adminIds = {chat.adminIds}, accentColor = {chat.accentColor}, adminOnly = {chat.adminOnly.Value}, isDirect = {chat.isDirect.Value};"
            );
        }
        var res = await dbClient.Select<DbChat>(id);
        if (res is null)
            throw new Exception("Chat create did not persist");
        return res.ToBase();
    }

    public async Task<Chat> UpdateChat(Chat chat)
    {
        chat.userIds ??= [];
        if (chat.isDirect ?? false)
        {
            chat.adminIds = chat.userIds ?? [];
        }
        else
        {
            chat.adminIds ??= [];
        }
        chat.accentColor ??= "#3b82f6";
        chat.adminOnly ??= false;
        chat.isDirect ??= false;

        RecordId id = ("chat", chat.id);
        await dbClient.Query($"UPDATE {id} UNSET name WHERE name = NULL OR name = NONE;");

        if (string.IsNullOrWhiteSpace(chat.name))
        {
            await dbClient.Query(
                $"UPDATE {id} SET userIds = {chat.userIds}, adminIds = {chat.adminIds}, accentColor = {chat.accentColor}, adminOnly = {chat.adminOnly.Value}, isDirect = {chat.isDirect.Value};"
            );
            await dbClient.Query($"UPDATE {id} UNSET name;");
        }
        else
        {
            await dbClient.Query(
                $"UPDATE {id} SET name = {chat.name}, userIds = {chat.userIds}, adminIds = {chat.adminIds}, accentColor = {chat.accentColor}, adminOnly = {chat.adminOnly.Value}, isDirect = {chat.isDirect.Value};"
            );
        }

        var res = await dbClient.Select<DbChat>(id);
        if (res is null)
            throw new Exception("Chat update did not persist");
        return res.ToBase();
    }

    public async Task<Class> CreateClass(Class clss)
    {
        clss.code ??= new Random().Next(99999).ToString();
        clss.isPublic ??= false;
        clss.accentColor ??= "#3b82f6";
        clss.teacherIds ??= [];
        clss.userIds ??= [];
        clss.pinnedLinks ??= [];

        var res = await dbClient.Create("class", new DbClass(clss));
        return res.ToBase();
    }

    public async Task<Class?> JoinClass(string userId, string code)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(code))
            return null;
        var result = await dbClient.Query(
            $"UPDATE class WHERE code = {code} SET userIds += {userId};"
        );
        return result?.GetValue<List<DbClass>>(0)?.FirstOrDefault()?.ToBase();
    }

    public async Task ConnectToChat(string parent)
    {
        if (string.IsNullOrWhiteSpace(parent))
            return;
        var groups = connectedChats.GetOrAdd(Context.ConnectionId, _ => new());
        groups[parent] = true;
        await Groups.AddToGroupAsync(Context.ConnectionId, parent);
    }

    public async Task<List<Message>> GetMessages(string parent)
    {
        var result = await dbClient.Query(
            $"SELECT * FROM message WHERE parentId = {parent} ORDER BY Date ASC;"
        );
        var messages_res = result.GetValue<List<DbMessage>>(0);
        if (messages_res is not null)
        {
            return messages_res.Select((x) => x.ToBase()).ToList();
        }
        else
        {
            return [];
        }
    }

    public async Task<User?> GetUserFromUsername(string username)
    {
        var res = await dbClient.Query($"SELECT * FROM user WHERE username = {username} LIMIT 1;");
        return res.GetValue<List<DbUser>>(0)?.First()?.ToBase();
    }

    public async Task<User?> GetUserFromEmail(string email)
    {
        var normalized = email.Trim().ToLowerInvariant();
        var res = await dbClient.Query(
            $"SELECT * FROM user WHERE string::lowercase(email) = {normalized} LIMIT 1;"
        );
        return res.GetValue<List<DbUser>>(0)?.FirstOrDefault()?.ToBase();
    }

    public async Task<Chat> GetChat(string id)
    {
        var res = await dbClient.Select<DbChat>(("chat", id));
        return res!.ToBase();
    }

    public async Task<Chat> AddUserToChat(string chatId, string userId)
    {
        RecordId id = ("chat", chatId);
        await dbClient.Query($"UPDATE {id} SET userIds += {userId};");
        var res = await dbClient.Select<DbChat>(("chat", chatId));
        return res!.ToBase();
    }

    public async Task<Chat> SetChatName(string chatId, string name)
    {
        RecordId id = ("chat", chatId);
        await dbClient.Query($"UPDATE {id} SET name = {name};");
        var res = await dbClient.Select<DbChat>(("chat", chatId));
        return res!.ToBase();
    }

    public Task<bool> IsAIAvailable()
    {
        return AIClient.IsRunningAsync();
    }

    public async Task<List<string>?> GetAIModels()
    {
        if (!await IsAIAvailable())
        {
            return ["ministral"];
        }

        var models = await AIClient.ListLocalModelsAsync();
        var modelNames = models.Select((x) => x.Name)?.ToList() ?? [];
        modelNames.Add("ministral");
        return modelNames;
    }

    private (string, string?) SplitThink(String text)
    {
        if (!(text.Contains("<think>") && text.Contains("</think>")))
            return (text, null);

        var split = text.Split("<think>");

        var content = split[0];
        split = split[1].Split("</think>");
        content += split[1];
        return (content, split[0]);
    }

    public async Task<List<FlashcardCard>> GetAIFlashcards(string notes)
    {
        var aiResponse = await GetAIResponse(
            "ministral",
            new List<Message>
            {
                new Message
                {
                    userId = "User",
                    date = DateTime.Now,
                    text =
                        $"Create up to 10 flashcards from these notes. Format each card as:\nFront: ...\nBack: ...\n\nNotes:\n{notes}",
                },
            }
        );
        Console.WriteLine(aiResponse?.text);

        if (string.IsNullOrWhiteSpace(aiResponse?.text))
            return new List<FlashcardCard>();

        var cards = new List<FlashcardCard>();
        FlashcardCard? currentCard = null;

        foreach (var line in aiResponse.text.Split("\n"))
        {
            var trimmed = line.Trim();

            // Handle bold Markdown **Front:** or plain Front:
            if (
                trimmed.StartsWith("Front:", StringComparison.OrdinalIgnoreCase)
                || trimmed.StartsWith("**Front:**", StringComparison.OrdinalIgnoreCase)
            )
            {
                currentCard = new FlashcardCard
                {
                    front = trimmed
                        .Replace("Front:", "", StringComparison.OrdinalIgnoreCase)
                        .Replace("**", "")
                        .Trim(),
                };
            }
            else if (
                (
                    trimmed.StartsWith("Back:", StringComparison.OrdinalIgnoreCase)
                    || trimmed.StartsWith("**Back:**", StringComparison.OrdinalIgnoreCase)
                )
                && currentCard != null
            )
            {
                currentCard.back = trimmed
                    .Replace("Back:", "", StringComparison.OrdinalIgnoreCase)
                    .Replace("**", "")
                    .Trim();

                cards.Add(currentCard);
                currentCard = null;
            }
        }

        return cards;
    }

    public async Task<string> GetAISummary(string notes)
    {
        var aiResponse = await GetAIResponse(
            "ministral",
            new List<Message>
            {
                new Message
                {
                    userId = "User",
                    date = DateTime.Now,
                    text =
                        $"Summarize the following notes clearly for studying. "
                        + $"Use concise bullet points and keep the important concepts.\n\nNotes:\n{notes}",
                },
            }
        );

        Console.WriteLine(aiResponse?.text);

        if (string.IsNullOrWhiteSpace(aiResponse?.text))
            return "";

        return aiResponse.text.Trim();
    }

    public async Task<Message?> GetAIResponse(string model, List<Message> msgs)
    {
        var res = "";
        if (model == "ministral" || !await IsAIAvailable())
        {
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                "rqtkZkCk4gYJ96MTbyqzYxDnPsZlLvP9"
            );

            var requestBody = new
            {
                model = "ministral-14b-latest",
                messages = msgs.Select(
                        (x) =>
                            new
                            {
                                role = x.userId == "AI" ? "assistant" : "user",
                                content = SplitThink(x.text ?? "").Item1,
                            }
                    )
                    .ToList(),
                max_tokens = 300,
            };

            var content = new StringContent(
                JsonSerializer.Serialize(requestBody),
                Encoding.UTF8,
                "application/json"
            );
            var response = await httpClient.PostAsync(
                "https://api.mistral.ai/v1/chat/completions",
                content
            );
            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            res =
                doc.RootElement.GetProperty("choices")[0]
                    .GetProperty("message")
                    .GetProperty("content")
                    .GetString()
                ?? "";
        }
        else
        {
            var chat = new OllamaSharp.Chat(AIClient);
            chat.Model = model;
            var message = msgs.Last();
            msgs.RemoveAt(msgs.Count - 1);
            chat.Messages = msgs.Select(
                    (x) =>
                        new OllamaSharp.Models.Chat.Message(
                            x.userId == "AI"
                                ? OllamaSharp.Models.Chat.ChatRole.Assistant
                                : OllamaSharp.Models.Chat.ChatRole.User,
                            SplitThink(x.text ?? "").Item1
                        )
                )
                .ToList();

            await foreach (var txt in chat.SendAsync(message.text ?? ""))
            {
                res += txt;
            }
        }

        return new Message
        {
            userId = "AI",
            text = res,
            date = DateTime.Now,
        };
    }

    public async Task<Message?> AddAIResponseToChat(string model, string parent)
    {
        var messages = await GetMessages(parent);
        var response = await GetAIResponse(model, messages);
        if (response is null)
            return null;
        response.parentId = parent;
        var saved = await SaveMessage(response);
        await Clients.Group(parent).ReceiveMessage(saved);
        return saved;
    }

    private async Task<Payment> GetDisplayPayment(Payment payment, string userId)
    {
        if (payment.fromId == userId)
        {
            payment.toId = (await GetUser(payment.toId)).username;
        }
        else if (payment.reasonType != PaymentReasonType.Buy)
        {
            payment.fromId = (await GetUser(payment.fromId)).username;
        }

        switch (payment.reasonType)
        {
            case PaymentReasonType.Quiz:
                payment.reason = (await GetQuiz(payment.reason)).name;
                break;
            case PaymentReasonType.Flashcard:
                payment.reason = (await GetFlashcard(payment.reason)).name;
                break;
        }

        return payment;
    }

    public async Task<List<Payment>> GetDisplayPayments(string userId)
    {
        var result = await dbClient.Query(
            $"SELECT * FROM payment WHERE fromId = {userId} or toId = {userId};"
        );

        var arr = result.GetValue<List<DbPayment>>(0);
        if (arr is not null)
        {
            var payments = arr.Select(x => x.ToBase()).ToList();

            for (var i = 0; payments.Count > i; i++)
            {
                payments[i] = await GetDisplayPayment(payments[i], userId);
            }

            return payments;
        }
        else
        {
            return [];
        }
    }

    public async Task ResetChat(string parent)
    {
        await dbClient.Query($"DELETE message WHERE parentId = {parent};");
    }

    public async Task<Class> GetClass(string id)
    {
        var res = await dbClient.Select<DbClass>(("class", id));
        return res!.ToBase();
    }

    public async Task<List<Class>> GetPublicClasses()
    {
        var result = await dbClient.Query($"SELECT * FROM class WHERE isPublic = true;");
        var classes = result.GetValue<List<DbClass>>(0);
        if (classes is not null)
        {
            return classes.Select((x) => x.ToBase()).ToList();
        }
        return [];
    }

    public async Task<Class> UpdateClassInfo(string classId, string? name, string? description)
    {
        RecordId id = ("class", classId);
        if (name is not null && description is not null)
        {
            await dbClient.Query($"UPDATE {id} SET name = {name}, description = {description};");
        }
        else if (name is not null)
        {
            await dbClient.Query($"UPDATE {id} SET name = {name};");
        }
        else if (description is not null)
        {
            await dbClient.Query($"UPDATE {id} SET description = {description};");
        }
        var res = await dbClient.Select<DbClass>(("class", classId));
        return res!.ToBase();
    }

    public async Task<Class> AddStudentToClass(string classId, string userId)
    {
        RecordId id = ("class", classId);
        await dbClient.Query($"UPDATE {id} SET userIds += {userId};");
        var res = await dbClient.Select<DbClass>(("class", classId));
        return res!.ToBase();
    }

    public async Task<Class> PromoteTeacher(string classId, string userId)
    {
        RecordId id = ("class", classId);
        await dbClient.Query($"UPDATE {id} SET teacherIds += {userId}, userIds += {userId};");
        var res = await dbClient.Select<DbClass>(("class", classId));
        return res!.ToBase();
    }

    public Task<Class> PromoteToTeacher(string classId, string userId)
    {
        return PromoteTeacher(classId, userId);
    }

    public async Task<Class> SetClassVisibility(string classId, bool isPublic)
    {
        RecordId id = ("class", classId);
        await dbClient.Query($"UPDATE {id} SET isPublic = {isPublic};");
        var res = await dbClient.Select<DbClass>(("class", classId));
        return res!.ToBase();
    }

    public async Task<Class> SetClassAccentColor(string classId, string accentColor)
    {
        RecordId id = ("class", classId);
        await dbClient.Query($"UPDATE {id} SET accentColor = {accentColor};");
        var res = await dbClient.Select<DbClass>(("class", classId));
        return res!.ToBase();
    }

    public async Task<ClassThreadPost> CreateClassThreadPost(ClassThreadPost post)
    {
        post.date ??= DateTime.Now;
        var res = await dbClient.Create("class_thread_post", new DbClassThreadPost(post));
        return res.ToBase();
    }

    public async Task<List<ClassThreadPost>> GetClassThreadPosts(string classId)
    {
        var result = await dbClient.Query(
            $"SELECT * FROM class_thread_post WHERE classId = {classId} ORDER BY date ASC;"
        );
        var posts = result.GetValue<List<DbClassThreadPost>>(0);
        if (posts is not null)
        {
            return posts.Select((x) => x.ToBase()).ToList();
        }
        return [];
    }

    public async Task<ClassThread> CreateClassThread(ClassThread thread)
    {
        thread.date ??= DateTime.Now;
        var res = await dbClient.Create("class_thread", new DbClassThread(thread));
        return res.ToBase();
    }

    public async Task<ClassThread> UpdateClassThread(ClassThread thread)
    {
        var res = await dbClient.Update(new DbClassThread(thread));
        return res.ToBase();
    }

    public async Task<List<ClassThread>> GetClassThreads(string classId)
    {
        var result = await dbClient.Query(
            $"SELECT * FROM class_thread WHERE classId = {classId} ORDER BY date DESC;"
        );
        var rows = result.GetValue<List<DbClassThread>>(0);
        if (rows is not null)
        {
            return rows.Select(x => x.ToBase()).ToList();
        }
        return [];
    }

    public async Task<ClassThreadComment> CreateClassThreadComment(ClassThreadComment comment)
    {
        comment.date ??= DateTime.Now;
        var commentId = string.IsNullOrWhiteSpace(comment.id)
            ? Guid.NewGuid().ToString("N")
            : comment.id!;
        RecordId id = ("class_thread_comment", commentId);

        if (string.IsNullOrWhiteSpace(comment.parentCommentId))
        {
            await dbClient.Query(
                $"CREATE {id} SET threadId = {comment.threadId}, userId = {comment.userId}, text = {comment.text}, attachments = {comment.attachments ?? []}, date = {comment.date};"
            );
        }
        else
        {
            await dbClient.Query(
                $"CREATE {id} SET threadId = {comment.threadId}, userId = {comment.userId}, text = {comment.text}, attachments = {comment.attachments ?? []}, date = {comment.date}, parentCommentId = {comment.parentCommentId};"
            );
        }

        var created = await dbClient.Select<DbClassThreadComment>(id);
        if (created is null)
            throw new Exception("Thread comment create did not persist");
        return created.ToBase();
    }

    public async Task<ClassThreadComment> UpdateClassThreadComment(ClassThreadComment comment)
    {
        RecordId id = ("class_thread_comment", comment.id);
        if (string.IsNullOrWhiteSpace(comment.parentCommentId))
        {
            await dbClient.Query(
                $"UPDATE {id} SET threadId = {comment.threadId}, userId = {comment.userId}, text = {comment.text}, attachments = {comment.attachments ?? []}, date = {comment.date ?? DateTime.Now} UNSET parentCommentId;"
            );
        }
        else
        {
            await dbClient.Query(
                $"UPDATE {id} SET threadId = {comment.threadId}, userId = {comment.userId}, text = {comment.text}, attachments = {comment.attachments ?? []}, date = {comment.date ?? DateTime.Now}, parentCommentId = {comment.parentCommentId};"
            );
        }

        var res = await dbClient.Select<DbClassThreadComment>(id);
        if (res is null)
            throw new Exception("Thread comment update did not persist");
        return res.ToBase();
    }

    public async Task<List<ClassThreadComment>> GetClassThreadComments(string threadId)
    {
        var result = await dbClient.Query(
            $"SELECT * FROM class_thread_comment WHERE threadId = {threadId} ORDER BY date ASC;"
        );
        var rows = result.GetValue<List<DbClassThreadComment>>(0);
        if (rows is not null)
        {
            return rows.Select(x => x.ToBase()).ToList();
        }
        return [];
    }

    public async Task<Class> RemoveStudentFromClass(string classId, string userId)
    {
        RecordId id = ("class", classId);
        await dbClient.Query($"UPDATE {id} SET userIds -= {userId};");
        var res = await dbClient.Select<DbClass>(("class", classId));
        return res!.ToBase();
    }

    public async Task<Class> AddPinnedLink(string classId, PinnedLink link)
    {
        RecordId id = ("class", classId);
        await dbClient.Query(
            $"UPDATE {id} SET pinnedLinks += {new { title = link.title, url = link.url, code = link.code ?? System.Guid.NewGuid().ToString() }};"
        );
        var res = await dbClient.Select<DbClass>(("class", classId));
        return res!.ToBase();
    }

    public async Task<Class> RemovePinnedLink(string classId, string linkId)
    {
        RecordId id = ("class", classId);
        await dbClient.Query(
            $"UPDATE {id} SET pinnedLinks = array::filter(pinnedLinks, (v) -> v.code != {linkId});"
        );
        var res = await dbClient.Select<DbClass>(("class", classId));
        return res!.ToBase();
    }

    public async Task<Class> SetPinnedLinks(string classId, List<PinnedLink> links)
    {
        RecordId id = ("class", classId);
        var normalized = links
            .Where(x => !(string.IsNullOrWhiteSpace(x.title) || string.IsNullOrWhiteSpace(x.url)))
            .Select(x => new
            {
                title = x.title!.Trim(),
                url = x.url!.Trim(),
                code = x.code ?? Guid.NewGuid().ToString(),
            })
            .ToList();
        await dbClient.Query($"UPDATE {id} SET pinnedLinks = {normalized};");
        var res = await dbClient.Select<DbClass>(("class", classId));
        return res!.ToBase();
    }

    public async Task<Assignment> CreateAssignment(Assignment ass)
    {
        var assignmentId = string.IsNullOrWhiteSpace(ass.id)
            ? Guid.NewGuid().ToString("N")
            : ass.id!;
        // Options seem to be just broken right now so I'm going to instead use this BS system
        if (ass.due is null && ass.maxMark is null)
        {
            await dbClient.Query(
                $"CREATE type::thing('assignment', {assignmentId}) SET classId = {ass.classId}, name = {ass.name}, text = {ass.text}, attachments = {ass.attachments ?? []};"
            );
        }
        else if (ass.due is null)
        {
            await dbClient.Query(
                $"CREATE type::thing('assignment', {assignmentId}) SET classId = {ass.classId}, name = {ass.name}, text = {ass.text}, attachments = {ass.attachments ?? []}, maxMark = {ass.maxMark!.Value};"
            );
        }
        else if (ass.maxMark is null)
        {
            await dbClient.Query(
                $"CREATE type::thing('assignment', {assignmentId}) SET classId = {ass.classId}, name = {ass.name}, text = {ass.text}, attachments = {ass.attachments ?? []}, due = {ass.due.Value};"
            );
        }
        else
        {
            await dbClient.Query(
                $"CREATE type::thing('assignment', {assignmentId}) SET classId = {ass.classId}, name = {ass.name}, text = {ass.text}, attachments = {ass.attachments ?? []}, due = {ass.due.Value}, maxMark = {ass.maxMark.Value};"
            );
        }

        RecordId id = ("assignment", assignmentId);
        var selected = await dbClient.Select<DbAssignment>(id);
        if (selected is null)
            throw new Exception("Assignment create did not persist");
        return selected.ToBase();
    }

    public async Task<Assignment> UpdateAssignment(Assignment ass)
    {
        if (string.IsNullOrWhiteSpace(ass.id))
            throw new Exception("Assignment id is required");
        RecordId id = ("assignment", ass.id);
        if (ass.due is null && ass.maxMark is null)
        {
            await dbClient.Query(
                $"UPDATE {id} SET classId = {ass.classId}, name = {ass.name}, text = {ass.text}, attachments = {ass.attachments ?? []} UNSET due, maxMark;"
            );
        }
        else if (ass.due is null)
        {
            await dbClient.Query(
                $"UPDATE {id} SET classId = {ass.classId}, name = {ass.name}, text = {ass.text}, attachments = {ass.attachments ?? []}, maxMark = {ass.maxMark!.Value} UNSET due;"
            );
        }
        else if (ass.maxMark is null)
        {
            await dbClient.Query(
                $"UPDATE {id} SET classId = {ass.classId}, name = {ass.name}, text = {ass.text}, attachments = {ass.attachments ?? []}, due = {ass.due.Value} UNSET maxMark;"
            );
        }
        else
        {
            await dbClient.Query(
                $"UPDATE {id} SET classId = {ass.classId}, name = {ass.name}, text = {ass.text}, attachments = {ass.attachments ?? []}, due = {ass.due.Value}, maxMark = {ass.maxMark.Value};"
            );
        }

        var selected = await dbClient.Select<DbAssignment>(id);
        if (selected is null)
            throw new Exception("Assignment update did not persist");
        return selected.ToBase();
    }

    public async Task<List<Assignment>> GetAssignments(string classId)
    {
        await dbClient.Query($"UPDATE assignment UNSET due WHERE due = NULL OR due = NONE;");
        await dbClient.Query(
            $"UPDATE assignment UNSET maxMark WHERE maxMark = NULL OR maxMark = NONE;"
        );
        var result = await dbClient.Query(
            $"SELECT * FROM assignment WHERE classId = {classId} ORDER BY due ASC;"
        );
        var arr = result.GetValue<List<DbAssignment>>(0);
        if (arr is not null)
        {
            return arr.Select(x => x.ToBase()).ToList();
        }
        else
        {
            return new List<Assignment>();
        }
    }

    public async Task<Submission> SubmitAssignment(Submission sub)
    {
        if (sub.id is not null)
        {
            DbSubmission result = await dbClient.Update(new DbSubmission(sub));
            return result.ToBase();
        }
        else
        {
            var res = await dbClient.Create("submission", new DbSubmission(sub));
            return res.ToBase();
        }
    }

    public async Task<Submission> SetSubmissionMark(string submissionId, int mark)
    {
        RecordId id = ("submission", submissionId);
        var result = await dbClient.Query($"UPDATE {id} SET mark = {mark};");
        var arr = result.GetValue<List<DbSubmission>>(0);
        if (arr is not null && arr.Count > 0)
        {
            return arr.First().ToBase();
        }
        else
        {
            var sel = await dbClient.Select<DbSubmission>(("submission", submissionId));
            return sel!.ToBase();
        }
    }

    public async Task<List<Submission>> GetSubmissions(string assignmentId)
    {
        var result = await dbClient.Query(
            $"SELECT * FROM submission WHERE assignmentId = {assignmentId} ORDER BY date ASC;"
        );
        var arr = result.GetValue<List<DbSubmission>>(0);
        if (arr is not null)
        {
            return arr.Select(x => x.ToBase()).ToList();
        }
        else
        {
            return new List<Submission>();
        }
    }

    public async Task<Flashcard> CreateFlashcard(Flashcard flash)
    {
        var res = await dbClient.Create("flashcard", new DbFlashcard(flash));
        return res.ToBase();
    }

    public async Task<Flashcard> UpdateFlashcard(Flashcard flash)
    {
        var res = await dbClient.Update(new DbFlashcard(flash));
        return res.ToBase();
    }

    public async Task<Flashcard> GetFlashcard(string flashId)
    {
        var res = await dbClient.Select<DbFlashcard>(("flashcard", flashId));
        return res?.ToBase();
    }

    public async Task<FlashcardCard> CreateFlashcardCard(FlashcardCard card)
    {
        var res = await dbClient.Create("flashcard_card", new DbFlashcardCard(card));
        return res.ToBase();
    }

    public async Task<FlashcardCard> UpdateFlashcardCard(FlashcardCard card)
    {
        var res = await dbClient.Update(new DbFlashcardCard(card));
        return res.ToBase();
    }

    public async Task RemoveFlashcardCard(string cardId)
    {
        await dbClient.Delete(("flashcard_card", cardId));
    }

    public async Task<List<FlashcardCard>> GetFlashcardCards(string flashId)
    {
        var result = await dbClient.Query(
            $"SELECT * FROM flashcard_card WHERE flashcardId = {flashId} ORDER BY front ASC;"
        );
        var arr = result.GetValue<List<DbFlashcardCard>>(0);
        if (arr is not null)
        {
            return arr.Select(x => x.ToBase()).ToList();
        }
        else
        {
            return new List<FlashcardCard>();
        }
    }

    public async Task<Quiz> CreateQuiz(Quiz quiz)
    {
        RecordId quizId = ("quiz" , quiz.id ?? Guid.NewGuid().ToString("N"));
        var timer = quiz.timerMinutes is > 0 ? quiz.timerMinutes : null;
        if (timer is null) {
            await dbClient.Query($"CREATE {quizId} SET name = {quiz.name}, cost = {quiz.cost ?? 0f}, published = {quiz.published ?? false}, description = {quiz.description ?? ""}, userId = {quiz.userId}, code = {quiz.code ?? ""};");           
        } else {
            await dbClient.Query($"CREATE {quizId} SET name = {quiz.name}, cost = {quiz.cost ?? 0f}, published = {quiz.published ?? false}, description = {quiz.description ?? ""}, userId = {quiz.userId}, code = {quiz.code ?? ""}, timerMinutes = {timer};");
        }

        var res = await dbClient.Select<DbQuiz>(quizId);
        return res!.ToBase();        
    }

    public async Task<Quiz> UpdateQuiz(Quiz quiz)
    {
        RecordId quizId = ("quiz", quiz.id);
        var timer = quiz.timerMinutes is > 0 ? quiz.timerMinutes : null;

        if (timer is null) {
            await dbClient.Query($"UPDATE {quizId} SET name = {quiz.name}, cost = {quiz.cost ?? 0f}, published = {quiz.published ?? false}, description = {quiz.description ?? ""}, userId = {quiz.userId}, code = {quiz.code ?? ""};");           
        } else {
            await dbClient.Query($"UPDATE {quizId} SET name = {quiz.name}, cost = {quiz.cost ?? 0f}, published = {quiz.published ?? false}, description = {quiz.description ?? ""}, userId = {quiz.userId}, code = {quiz.code ?? ""}, timerMinutes = {timer};");
        }
        
        var res = await dbClient.Select<DbQuiz>(quizId);
        return res!.ToBase(); 
    }

    public async Task<Question> CreateQuestion(Question q)
    {
        var res = await dbClient.Create("question", new DbQuestion(q));
        return res.ToBase();
    }

    public async Task<Question> UpdateQuestion(Question q)
    {
        var res = await dbClient.Update(new DbQuestion(q));
        return res.ToBase();
    }

    public async Task RemoveQuestion(string questionId)
    {
        await dbClient.Delete(("question", questionId));
    }

    public async Task<Quiz> GetQuiz(string quizId)
    {
        var res = await dbClient.Select<DbQuiz>(("quiz", quizId));
        return res!.ToBase();
    }

    public async Task<List<Question>> GetQuestions(string quizId)
    {
        var result = await dbClient.Query(
            $"SELECT * FROM question WHERE quizId = {quizId} ORDER BY id ASC;"
        );
        var arr = result.GetValue<List<DbQuestion>>(0);
        if (arr is not null)
        {
            return arr.Select(x => x.ToBase()).ToList();
        }
        else
        {
            return new List<Question>();
        }
    }

    public async Task<List<QuestionBank>> GetQuestionBanks(string userId)
    {
        var result = await dbClient.Query(
            $"SELECT * FROM question_bank WHERE userId = {userId} ORDER BY name ASC;"
        );
        var arr = result.GetValue<List<DbQuestionBank>>(0);
        return (arr ?? []).Select(x => x.ToBase()).ToList();
    }

    public async Task<QuestionBank> CreateQuestionBank(QuestionBank bank)
    {
        var res = await dbClient.Create("question_bank", new DbQuestionBank(bank));
        return res.ToBase();
    }

    public async Task<QuestionBank> UpdateQuestionBank(QuestionBank bank)
    {
        var res = await dbClient.Update(new DbQuestionBank(bank));
        return res.ToBase();
    }

    public async Task RemoveQuestionBank(string bankId)
    {
        await dbClient.Query($"DELETE question_bank_item WHERE bankId = {bankId};");
        await dbClient.Delete(("question_bank", bankId));
    }

    public async Task<List<QuestionBankItem>> GetQuestionBankItems(string bankId)
    {
        var query = string.IsNullOrWhiteSpace(bankId)
            ? "SELECT * FROM question_bank_item ORDER BY id ASC;"
            : $"SELECT * FROM question_bank_item WHERE bankId = {bankId} ORDER BY id ASC;";
        var result = await dbClient.RawQuery(query);
        var arr = result.GetValue<List<DbQuestionBankItem>>(0);
        return (arr ?? []).Select(x => x.ToBase()).ToList();
    }

    public async Task<QuestionBankItem?> GetQuestionBankItem(string itemId)
    {
        var res = await dbClient.Select<DbQuestionBankItem>(("question_bank_item", itemId));
        return res?.ToBase();
    }

    public async Task<QuestionBankItem> CreateQuestionBankItem(QuestionBankItem item)
    {
        var res = await dbClient.Create("question_bank_item", new DbQuestionBankItem(item));
        return res.ToBase();
    }

    public async Task RemoveQuestionBankItem(string itemId)
    {
        await dbClient.Delete(("question_bank_item", itemId));
    }

    public async Task<QuizSubmission> SubmitQuiz(QuizSubmission sub)
    {
        float score = 0f;
        sub.answers = (sub.answers ?? []).Select(x => (int?)(x ?? -1)).ToList();
        sub.multiAnswers = (sub.multiAnswers ?? []).Select(x => (x ?? []).Distinct().ToList()).ToList();
        sub.textAnswers = (sub.textAnswers ?? []).Select(x => (string?)(x ?? "")).ToList();
        if (sub.quizId is not null)
        {
            var qres = await dbClient.Query(
                $"SELECT * FROM question WHERE quizId = {sub.quizId} ORDER BY id ASC;"
            );
            var qarr = qres.GetValue<List<DbQuestion>>(0);
            if (qarr is not null)
            {
                var questions = qarr.Select(x => x.ToBase()).ToList();
                for (int i = 0; i < questions.Count; i++)
                {
                    var q = questions[i];
                    var qType = q.type?.Trim().ToLowerInvariant() ?? "multiple_choice";

                    if (qType == "fill_gap" || qType == "short_answer")
                    {
                        var expected = q.answers?.FirstOrDefault(x => x?.isCorrect == true)?.text;
                        var givenText = i < sub.textAnswers.Count ? sub.textAnswers[i] : null;
                        if (
                            !string.IsNullOrWhiteSpace(expected)
                            && !string.IsNullOrWhiteSpace(givenText)
                            && string.Equals(
                                expected.Trim(),
                                givenText.Trim(),
                                StringComparison.OrdinalIgnoreCase
                            )
                        )
                            score += Math.Max(1f, q.answers?.FirstOrDefault(x => x?.isCorrect == true)?.weight ?? 1f);
                        continue;
                    }

                    var allAnswers = q.answers ?? [];
                    var selected = i < sub.multiAnswers.Count
                        ? (sub.multiAnswers[i] ?? [])
                        : [];
                    if (selected.Count == 0 && i < sub.answers.Count && (sub.answers[i] ?? -1) >= 0)
                        selected = [sub.answers[i]!.Value];

                    var positiveWeight = 0f;
                    for (int ai = 0; ai < allAnswers.Count; ai++)
                    {
                        var ans = allAnswers[ai];
                        if (ans?.isCorrect == true)
                            positiveWeight += Math.Max(0f, ans.weight ?? 1f);
                    }
                    if (positiveWeight <= 0f)
                        positiveWeight = allAnswers.Any(x => x?.isCorrect == true) ? 1f : 0f;

                    float earned = 0f;
                    foreach (var si in selected.Distinct())
                    {
                        if (si < 0 || si >= allAnswers.Count)
                            continue;
                        var ans = allAnswers[si];
                        if (ans is null)
                            continue;
                        if (ans.isCorrect == true)
                            earned += Math.Max(0f, ans.weight ?? 1f);
                        else
                            earned -= Math.Max(0f, ans.weight ?? 1f);
                    }
                    if (positiveWeight > 0f)
                    {
                        var normalized = Math.Clamp(earned / positiveWeight, 0f, 1f);
                        score += normalized * positiveWeight;
                    }
                }
            }
        }
        sub.score = score;

        if (sub.id is not null)
        {
            var updated = await dbClient.Update(new DbQuizSubmission(sub));
            return updated.ToBase();
        }
        else
        {
            var res = await dbClient.Create("quizsubmission", new DbQuizSubmission(sub));
            return res.ToBase();
        }
    }

    public async Task<List<QuizSubmission>> GetQuizSubmissions(string quizId)
    {
        var result = await dbClient.Query(
            $"SELECT * FROM quizsubmission WHERE quizId = {quizId} ORDER BY date ASC;"
        );
        var arr = result.GetValue<List<DbQuizSubmission>>(0);
        if (arr is not null)
        {
            return arr.Select(x => x.ToBase()).ToList();
        }
        else
        {
            return new List<QuizSubmission>();
        }
    }

    public async Task<List<Class>> GetClassesFromUser(string id)
    {
        var result = await dbClient.Query(
            $"SELECT * FROM class WHERE userIds CONTAINS {id} OR teacherIds CONTAINS {id};"
        );
        var classes = result.GetValue<List<DbClass>>(0);
        if (classes is not null)
        {
            return classes.Select((x) => x.ToBase()).ToList();
        }
        else
        {
            return [];
        }
    }

    public async Task<List<Chat>> GetChatsFromUser(string id)
    {
        var result = await dbClient.Query($"SELECT * FROM chat WHERE userIds CONTAINS {id};");
        var chats = result.GetValue<List<DbChat>>(0);
        if (chats is not null)
        {
            var chts = chats.Select((x) => x.ToBase()).ToList();
            for (int i = 0; i < chts.Count; i++)
            {
                chts[i].name = await GetChatNameInternal(chts[i], id);
            }
            return chts;
        }
        else
        {
            return [];
        }
    }

    public async Task<List<Quiz>> GetQuizzesFromUser(string id)
    {
        var result = await dbClient.Query($"SELECT * FROM quiz WHERE userId = {id};");
        var quizzes = result.GetValue<List<DbQuiz>>(0);
        if (quizzes is not null)
        {
            return quizzes.Select((x) => x.ToBase()).ToList();
        }
        else
        {
            return [];
        }
    }

    public async Task<List<Flashcard>> GetFlashcardsFromUser(string id)
    {
        var result = await dbClient.Query($"SELECT * FROM flashcard WHERE userId = {id};");
        var flashcards = result.GetValue<List<DbFlashcard>>(0);
        if (flashcards is not null)
        {
            return flashcards.Select((x) => x.ToBase()).ToList();
        }
        else
        {
            return [];
        }
    }

    public async Task<Flashcard?> GetFlashcardByCode(string code)
    {
        var result = await dbClient.Query($"SELECT * FROM flashcard WHERE code = {code} LIMIT 1;");
        return result.GetValue<List<DbFlashcard>>(0)?.FirstOrDefault()?.ToBase();
    }

    public async Task<Contribution> CreateContribution(Contribution contribution)
    {
        contribution.createdAt ??= DateTime.Now;
        contribution.attachments ??= [];
        var created = await dbClient.Create("contribution", new DbContribution(contribution));
        return created.ToBase();
    }

    public async Task<List<Contribution>> GetContributions(int limit = 30)
    {
        var result = await dbClient.Query(
            $"SELECT * FROM contribution ORDER BY createdAt DESC LIMIT {limit};"
        );
        var rows = result.GetValue<List<DbContribution>>(0) ?? [];
        return rows.Select(x => x.ToBase()).ToList();
    }

    public async Task<List<Contribution>> GetContributionsFromUser(string userId)
    {
        var result = await dbClient.Query(
            $"SELECT * FROM contribution WHERE userId = {userId} ORDER BY createdAt DESC;"
        );
        var rows = result.GetValue<List<DbContribution>>(0) ?? [];
        return rows.Select(x => x.ToBase()).ToList();
    }

    public async Task<List<NoteGroup>> GetNoteGroups(string userId)
    {
        var result = await dbClient.Query(
            $"SELECT * FROM note_group WHERE userId = {userId} ORDER BY createdAt ASC;"
        );
        var rows = result.GetValue<List<DbNoteGroup>>(0) ?? [];
        return rows.Select(x => x.ToBase()).ToList();
    }

    public async Task<List<Note>> GetNotesForGroup(string groupId)
    {
        var result = await dbClient.Query(
            $"SELECT * FROM note WHERE groupId = {groupId} ORDER BY updatedAt DESC;"
        );
        var rows = result.GetValue<List<DbNote>>(0) ?? [];
        return rows.Select(x => x.ToBase()).ToList();
    }

    public async Task<List<TodoItem>> GetTodos(string userId)
    {
        var result = await dbClient.Query(
            $"SELECT * FROM todo_item WHERE userId = {userId} ORDER BY createdAt DESC;"
        );
        var rows = result.GetValue<List<DbTodoItem>>(0) ?? [];
        return rows.Select(x => x.ToBase()).ToList();
    }

    public async Task<List<Quiz>> SearchQuizzes(string search)
    {
        List<DbQuiz> quizzes = [];

        if (search.Trim().Any())
        {
            var res = await dbClient.Query(
                $"SELECT *, search::score(1) + search::score(2) + search::score(3) * 1.5 AS score FROM quiz WHERE name @1@ {search} or description @2@ {search} or code @3@ {search} ORDER BY score DESC;"
            );
            quizzes = res.GetValue<List<DbQuiz>>(0);
            if (quizzes is not null && quizzes.Any())
            {
                return quizzes.Select((x) => x.ToBase()).ToList();
            }
        }

        var result = await dbClient.Query($"SELECT * FROM quiz LIMIT 20;");
        quizzes = result.GetValue<List<DbQuiz>>(0);
        if (quizzes is not null)
        {
            return quizzes.Select((x) => x.ToBase()).ToList();
        }

        return [];
    }

    public async Task<Quiz?> GetQuizByCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return null;
        var result = await dbClient.Query(
            $"SELECT * FROM quiz WHERE code = {code.Trim()} LIMIT 1;"
        );
        return result.GetValue<List<DbQuiz>>(0)?.FirstOrDefault()?.ToBase();
    }

    public async Task<List<Flashcard>> SearchFlashcards(string search)
    {
        List<DbFlashcard> flashcards = [];

        if (search.Trim().Any())
        {
            var res = await dbClient.Query(
                $"SELECT *, search::score(1) + search::score(2) + search::score(3) * 1.5 AS score FROM flashcard WHERE name @1@ {search} or description @2@ {search} or code @3@ {search} ORDER BY score DESC;"
            );
            flashcards = res.GetValue<List<DbFlashcard>>(0);
            if (flashcards is not null && flashcards.Any())
            {
                return flashcards.Select((x) => x.ToBase()).ToList();
            }
        }

        var result = await dbClient.Query($"SELECT * FROM flashcard LIMIT 20;");
        flashcards = result.GetValue<List<DbFlashcard>>(0);
        if (flashcards is not null)
        {
            return flashcards.Select((x) => x.ToBase()).ToList();
        }

        return [];
    }

    public async Task<List<User>> SearchUsers(string search)
    {
        List<DbUser> users = [];

        if (search.Trim().Any())
        {
            var res = await dbClient.Query(
                $"SELECT *, search::score(1) + search::score(2) AS score FROM user WHERE username @1@ {search} or email @2@ {search} ORDER BY score DESC;"
            );
            users = res.GetValue<List<DbUser>>(0);
            if (users is not null && users.Any())
            {
                return users.Select((x) => x.ToBase()).ToList();
            }
        }

        var result = await dbClient.Query($"SELECT * FROM flashcard LIMIT 20;");
        users = result.GetValue<List<DbUser>>(0);
        if (users is not null)
        {
            return users.Select((x) => x.ToBase()).ToList();
        }

        return [];
    }

    public async Task<Chat> GetChatWithName(string chatId, string userId)
    {
        var chat = (await dbClient.Select<DbChat>(("chat", chatId)))!.ToBase();
        chat.name = await GetChatNameInternal(chat, userId);
        return chat;
    }

    public async Task<User> GetUser(string id)
    {
        var res = await dbClient.Select<DbUser>(("user", id));
        return res!.ToBase();
    }

    public async Task<User?> CheckUser(string id)
    {
        var res = await dbClient.Select<DbUser>(("user", id));
        return res?.ToBase();
    }

    public async Task<List<User>> GetUsers(List<string> ids)
    {
        List<User> users = [];
        foreach (var id in ids)
        {
            if (id == "AI")
            {
                users.Add(
                    new User
                    {
                        username = "AI",
                        email = "ai@studbud.ai",
                        id = "AI",
                    }
                );
            }
            else
            {
                users.Add((await dbClient.Select<DbUser>(("user", id)))!.ToBase());
            }
        }
        return users;
    }

    public async Task<string> GetChatNameInternal(Chat chat, string userId)
    {
        var isDirect = chat.isDirect == true || (chat.userIds?.Count ?? 0) <= 2;
        if (isDirect)
        {
            var other = chat.userIds?.FirstOrDefault();
            if (other is null)
            {
                return userId;
            }

            if (other == userId)
            {
                if (chat.userIds is not null && chat.userIds.Count > 1)
                {
                    other = chat.userIds[1];
                }
            }

            var res = await dbClient.Select<DbUser>(("user", other));
            if (res is not null)
            {
                return res.username ?? other;
            }
            else
            {
                return other;
            }
        }

        if (!string.IsNullOrWhiteSpace(chat.name))
        {
            return chat.name!;
        }

        return "Group chat";
    }

    public async Task<string> GetChatName(Chat chat, string userId)
    {
        return await GetChatNameInternal(chat, userId);
    }

    private sealed class AppUserAccessAuth : ScopeAuth
    {
        public string? email { get; set; }
        public string? username { get; set; }
        public string? password { get; set; }
    }

    public async Task<User?> SignIn(string username, string password)
    {
        username = username.Trim().ToLowerInvariant();
        var authClient = new SurrealDbClient(dbOptions);
        try
        {
            var token = await authClient.SignIn(
                new AppUserAccessAuth
                {
                    Namespace = "main",
                    Database = "main",
                    Access = "account",
                    username = username,
                    password = password,
                }
            );
        }
        catch (SurrealDbException)
        {
            return null;
        }

        var res = await dbClient.Query(
            $"SELECT * FROM user WHERE string::lowercase(username) = {username} LIMIT 1;"
        );
        return res.GetValue<List<DbUser>>(0)?.FirstOrDefault()?.ToBase();
    }

    public async Task<User?> SignUp(UserInfo user)
    {
        var username = user.username?.Trim() ?? "";
        var email = (user.email ?? "").Trim().ToLowerInvariant();
        var password = user.password ?? "";

        var authClient = new SurrealDbClient(dbOptions);
        try
        {
            var token = await authClient.SignUp(
                new AppUserAccessAuth
                {
                    Namespace = "main",
                    Database = "main",
                    Access = "account",
                    username = username,
                    email = email,
                    password = password,
                }
            );
        }
        catch (SurrealDbException)
        {
            return null;
        }

        var res = await dbClient.Query(
            $"SELECT * FROM user WHERE string::lowercase(email) = {email} LIMIT 1;"
        );
        var ret_user = res.GetValue<List<DbUser>>(0)?.FirstOrDefault()?.ToBase();

        if (ret_user is not null)
        {
            await CreateChat(
                new Chat
                {
                    userIds = [ret_user.id, "AI"],
                    name = null,
                    isDirect = true,
                    adminIds = [ret_user.id],
                }
            );
            await CreateChat(
                new Chat
                {
                    userIds = [ret_user.id],
                    name = null,
                    isDirect = true,
                    adminIds = [ret_user.id],
                }
            );
        }
        return ret_user;
    }
}
