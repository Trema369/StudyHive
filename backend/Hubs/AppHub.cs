using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.SignalR;
using studbud.Shared;
using studbud.Shared.Models;
using SurrealDb.Net;
using SurrealDb.Net.Models;

namespace studbud.Hubs;

public class AppHub : Hub<IAppHubClient>, IAppHubServer
{
    private Dictionary<String, String> connectedChats = new();
    HttpClient httpClient = new HttpClient();
    private readonly SurrealDbClient dbClient;
    private readonly OllamaSharp.OllamaApiClient AIClient;
    private readonly EcocashClient ecocashClient;

    public AppHub(SurrealDbClient dbClient)
    {
        this.dbClient = dbClient;
        this.AIClient = new OllamaSharp.OllamaApiClient("http://localhost:11434/");
        this.ecocashClient = new EcocashClient("QVYPAT1icVGSxlD20aTH4ZV2SMg8bdUN");
    }

    public override Task OnConnectedAsync()
    {
        Console.WriteLine("Connected");
        return base.OnConnectedAsync();
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        Console.WriteLine("Disconnected");
        Console.WriteLine(exception);
        return base.OnDisconnectedAsync(exception);
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

    public async Task<Payment?> ProcessPayment(Payment payment) {
        if (payment.reasonType == PaymentReasonType.Buy)
        {
            var res = await ecocashClient.InitPayment(payment.fromId, payment.amount ?? 0.0f, payment.reason);
            Thread verifyThread = new Thread(new ThreadStart(() => EnsureTransaction(res, payment)));
            verifyThread.Start();
            return await GetDisplayPayment(payment, payment.toId);
        }


        var user = await GetUser(payment.fromId);
        if (user.money > payment.amount) {
            RecordId fromId = ("user", payment.fromId);
            await dbClient.Query($"UPDATE {fromId} SET money -= {payment.amount};");
            RecordId toId = ("user", payment.toId!);
            await dbClient.Query($"UPDATE {toId} SET money += {payment.amount};");
            var res = (await dbClient.Create("payment", new DbPayment(payment))).ToBase();
            return await GetDisplayPayment(res, res.fromId) ;
        }
        else
        {
            return null;
        }
    }

    public async Task<Message> SendMessage(Message msg)
    {
        var res = await dbClient.Create("message", new DbMessage(msg));
        var message = res.ToBase();
        //await Clients.Clients(connectedChats.Where((x) => x.Value == msg.parentId && x.Key != Context.ConnectionId).Select((x) => x.Key)).ReceiveMessage(message);
        await Clients.AllExcept(Context.ConnectionId).ReceiveMessage(message);
        return message;
    }

    public async Task<Chat> CreateChat(Chat chat)
    {
        var res = await dbClient.Create("chat", new DbChat(chat));
        return res.ToBase();
    }

    public async Task<Chat> UpdateChat(Chat chat)
    {
        var res = await dbClient.Update(new DbChat(chat));
        return res.ToBase();
    }

    public async Task<Class> CreateClass(Class clss)
    {
        clss.code ??= new Random().Next(99999).ToString();

        var res = await dbClient.Create("class", new DbClass(clss));
        return res.ToBase();
    }

    public async Task<Class?> JoinClass(string userId, string code)
    {
        var result = await dbClient.Query(
            $"UPDATE class WHERE code = {code} SET userIds += {userId};"
        );
        return result?.GetValue<List<DbClass>>(0)?.First()?.ToBase();
    }

    public async Task ConnectToChat(string parent)
    {
        connectedChats.Add(Context.ConnectionId, parent);
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

    public async Task<List<FlashcardCard>> GetAIFlashcards(string prompt)
    {
        var result = await GetAIResponse("ministral", [new Message {userId="User", date=DateTime.Now, text=$"Generate as many flashcards as you can from these notes::\n{prompt}"}]);
        var jsonDoc = JsonDocument.Parse(result?.text ?? "");
        string flashcardsText = jsonDoc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();

        var lines = flashcardsText.Split("\n");
        var cards = new List<FlashcardCard>();
        FlashcardCard? currentCard = null;

        foreach (var line in lines)
        {
            if (line.StartsWith("**Front:**") || line.Contains("Front:"))
            {
                currentCard = new FlashcardCard();
                currentCard.front = line.Replace("**Front:**", "").Replace("Front:", "").Trim();
                currentCard.front = new Regex(@"^\s*\d+\.\s*").Replace(currentCard.front, "").Trim();
            }
            else if (line.StartsWith("**Back:**") || line.Contains("Back:"))
            {
                currentCard!.back = line.Replace("**Back:**", "").Replace("Back:", "").Trim();
                currentCard.back = new Regex(@"^\s*\d+\.\s*").Replace(currentCard.back, "").Trim();
                cards.Add(currentCard);
                currentCard = null;
            }
        }

        return cards;
    }

    public async Task<Message?> GetAIResponse(string model, List<Message> msgs)
    {

        var res = "";
        if (model == "ministral" || !await IsAIAvailable())
        {
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "Vsf0g0De4A5r0H1sWqBhI6X9qjN0R4sO");

            var requestBody = new
            {
                model = "ministral-8b-2410",
                messages = msgs
                .Select(
                    (x) =>
                        new {
                            role = x.userId == "AI"
                                ? "assistant"
                                : "user",
                            content = SplitThink(x.text ?? "").Item1
                        }
                )
                .ToList(),
                max_tokens = 300
            };

            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync("https://api.mistral.ai/v1/chat/completions", content);
            res = await response.Content.ReadAsStringAsync();
        }else {
            var chat = new OllamaSharp.Chat(AIClient);
            chat.Model = model;
            var message = msgs.Last();
            msgs.RemoveAt(msgs.Count - 1);
            chat.Messages = msgs
                .Select(
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
        return await SendMessage(response);
    }

    private async Task<Payment> GetDisplayPayment(Payment payment, string userId)
    {
        if (payment.fromId == userId)
        {
            payment.toId = (await GetUser(payment.toId)).username;
        } else if (payment.reasonType != PaymentReasonType.Buy){
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

    public async Task<Class> UpdateClassInfo(string classId, string? name, string? description)
    {
        var updates = new List<string>();
        if (name is not null)
            updates.Add($"name = '{name}'");
        if (description is not null)
            updates.Add($"description = '{description}'");
        if (updates.Count > 0)
        {
            var upd = string.Join(", ", updates);
            await dbClient.RawQuery($"UPDATE class:{classId} SET {upd};");
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
            $"UPDATE {id} SET pinnedLinks = array::filter(pinnedLinks, (v) -> v.id != {linkId});"
        );
        var res = await dbClient.Select<DbClass>(("class", classId));
        return res!.ToBase();
    }

    public async Task<Assignment> CreateAssignment(Assignment ass)
    {
        var res = await dbClient.Create("assignment", new DbAssignment(ass));
        return res.ToBase();
    }

    public async Task<List<Assignment>> GetAssignments(string classId)
    {
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
        var res = await dbClient.Create("quiz", new DbQuiz(quiz));
        return res.ToBase();
    }

    public async Task<Quiz> UpdateQuiz(Quiz quiz)
    {
        var res = await dbClient.Update(new DbQuiz(quiz));
        return res.ToBase();
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

    public async Task<QuizSubmission> SubmitQuiz(QuizSubmission sub)
    {
        int score = 0;
        if (sub.quizId is not null)
        {
            var qres = await dbClient.Query(
                $"SELECT * FROM question WHERE quizId = {sub.quizId} ORDER BY id ASC;"
            );
            var qarr = qres.GetValue<List<DbQuestion>>(0);
            if (qarr is not null && sub.answers is not null)
            {
                var questions = qarr.Select(x => x.ToBase()).ToList();
                for (int i = 0; i < questions.Count && i < sub.answers.Count; i++)
                {
                    var q = questions[i];
                    int? correctIndex = null;
                    if (q.answers is not null)
                    {
                        for (int ai = 0; ai < q.answers.Count; ai++)
                        {
                            var ans = q.answers[ai];
                            if (ans is not null && ans.isCorrect == true)
                            {
                                correctIndex = ai;
                                break;
                            }
                        }
                    }
                    var given = sub.answers[i];
                    if (correctIndex is not null && given is not null && correctIndex == given)
                        score++;
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

    public async Task<List<Quiz>> SearchQuizzes(string search)
    {
        List<DbQuiz> quizzes = [];

        if (search.Trim().Any()) {
            var res = await dbClient.Query(
                $"SELECT *, search::score(1) + search::score(2) + search::score(3) * 1.5 AS score FROM quiz WHERE name @1@ {search} or description @2@ {search} or code @3@ {search} ORDER BY score DESC;"
            );
            quizzes = res.GetValue<List<DbQuiz>>(0);
            if (quizzes is not null && quizzes.Any())
            {
                return quizzes.Select((x) => x.ToBase()).ToList();
            }
        }
            
        var result = await dbClient.Query(
            $"SELECT * FROM quiz LIMIT 20;"
        );
        quizzes = result.GetValue<List<DbQuiz>>(0);
        if (quizzes is not null)
        {
            return quizzes.Select((x) => x.ToBase()).ToList();
        }
            
        return [];
    }

    public async Task<List<Flashcard>> SearchFlashcards(string search)
    {
        List<DbFlashcard> flashcards = [];

        if (search.Trim().Any()) {
            var res = await dbClient.Query(
                $"SELECT *, search::score(1) + search::score(2) + search::score(3) * 1.5 AS score FROM flashcard WHERE name @1@ {search} or description @2@ {search} or code @3@ {search} ORDER BY score DESC;"
            );
            flashcards = res.GetValue<List<DbFlashcard>>(0);
            if (flashcards is not null && flashcards.Any())
            {
                return flashcards.Select((x) => x.ToBase()).ToList();
            }
        }

        var result = await dbClient.Query(
            $"SELECT * FROM flashcard LIMIT 20;"
        );
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

        if (search.Trim().Any()) {
            var res = await dbClient.Query(
                $"SELECT *, search::score(1) + search::score(2) AS score FROM user WHERE username @1@ {search} or email @2@ {search} ORDER BY score DESC;"
            );
            users = res.GetValue<List<DbUser>>(0);
            if (users is not null && users.Any())
            {
                return users.Select((x) => x.ToBase()).ToList();
            }
        }

        var result = await dbClient.Query(
            $"SELECT * FROM flashcard LIMIT 20;"
        );
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
        if (chat.name is null || !chat.name.Any())
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
        else
        {
            return chat.name;
        }
    }

    public async Task<string> GetChatName(Chat chat, string userId)
    {
        return await GetChatNameInternal(chat, userId);
    }

    public async Task<User?> SignIn(string username, string password)
    {
        var res = await dbClient.Query(
            $"SELECT * FROM user WHERE username = {username} and password = {password} LIMIT 1;"
        );

        var res2 = res.GetValue<List<DbUser>>(0);

        if (res2 is not null)
        {
            if (res2.Count > 0)
            {
                return res2.First().ToBase();
            }
        }

        return null;
    }

    public async Task<User?> SignUp(UserInfo user)
    {
        var res = await dbClient.Query(
            $"SELECT * FROM user WHERE username = {user.username} and password = {user.password} LIMIT 1;"
        );

        var res2 = res.GetValue<List<DbUser>>(0);

        if (res2 is not null)
        {
            if (res2.Count > 0)
            {
                return res2.First().ToBase();
            }
        }

        res = await dbClient.Query($"SELECT * FROM user WHERE username = {user.username};");
        res2 = res.GetValue<List<DbUser>>(0);

        if (res2 is not null)
        {
            if (res2.Count > 0)
            {
                return null;
            }
        }

        var usr = await dbClient.Create("user", new DbUserInfo(user));
        var ret_user = usr.ToBase().ToBase();

        if (ret_user is not null)
        {
            await CreateChat(new Chat { userIds = [ret_user.id, "AI"], name = "AI" });
            await CreateChat(new Chat { userIds = [ret_user.id], name = "You" });
        }
        return ret_user;
    }
}
