using backend.Hubs;
using backend.Shared;
using backend.Shared.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly AppHub _appHub;
        private readonly IHubContext<AppHub, IAppHubClient> _hubContext;

        public ChatController(AppHub appHub, IHubContext<AppHub, IAppHubClient> hubContext)
        {
            _appHub = appHub;
            _hubContext = hubContext;
        }

        private static bool IsAdmin(Chat chat, string? userId)
        {
            var admins = chat.adminIds ?? [];
            return admins.Contains(userId ?? "");
        }

        private async Task<List<string>> ResolveUsernamesToIds(List<string>? usernames)
        {
            var ids = new List<string>();

            foreach (var raw in usernames ?? [])
            {
                var user = await _appHub.GetUserFromUsername(raw.Trim());
                ids.Add(user!.id!);
            }

            return ids.Distinct().ToList();
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<List<Chat>>> GetUserChats(string userId)
        {
            return Ok(await _appHub.GetChatsFromUser(userId));
        }

        [HttpGet("{chatId}")]
        public async Task<ActionResult<Chat>> GetChat(string chatId, [FromQuery] string? userId)
        {
            if (!string.IsNullOrWhiteSpace(userId))
                return Ok(await _appHub.GetChatWithName(chatId, userId));
            return Ok(await _appHub.GetChat(chatId));
        }

        [HttpPost]
        public async Task<ActionResult<Chat>> CreateChat([FromBody] CreateChatRequest req)
        {
            var users = (req.userIds ?? [])
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToList();
            var fromUsernames = await ResolveUsernamesToIds(req.usernames);
            users = users.Concat(fromUsernames).Distinct().ToList();
            if (!string.IsNullOrWhiteSpace(req.creatorUserId) && !users.Contains(req.creatorUserId))
                users.Add(req.creatorUserId);
            if (users.Count < 2)
                return BadRequest(new { message = "At least two users are required" });

            var isDirect = req.isDirect ?? false;
            if (!isDirect && string.IsNullOrWhiteSpace(req.name))
                return BadRequest(new { message = "Group chats need a custom name" });

            var created = await _appHub.CreateChat(
                new Chat
                {
                    name = isDirect ? null : req.name?.Trim(),
                    userIds = users,
                    adminIds = string.IsNullOrWhiteSpace(req.creatorUserId)
                        ? users.Take(1).ToList()
                        : [req.creatorUserId],
                    accentColor = req.accentColor ?? "#3b82f6",
                    adminOnly = req.adminOnly ?? false,
                    isDirect = isDirect,
                }
            );
            return Ok(created);
        }

        [HttpPatch("{chatId}")]
        public async Task<ActionResult<Chat>> UpdateChat(
            string chatId,
            [FromBody] UpdateChatRequest req
        )
        {
            var existing = await _appHub.GetChat(chatId);
            if (existing is null)
                return NotFound();
            if (!IsAdmin(existing, req.requestingUserId))
                return Forbid();

            existing.name = existing.isDirect == true ? null : (req.name ?? existing.name);
            existing.accentColor = req.accentColor ?? existing.accentColor;
            existing.adminOnly = req.adminOnly ?? existing.adminOnly;
            if (req.adminIds is not null)
                existing.adminIds = req.adminIds.Distinct().ToList();
            else if ((existing.adminIds ?? []).Count == 0 && existing.isDirect == true)
                existing.adminIds = (existing.userIds ?? []).Distinct().ToList();

            return Ok(await _appHub.UpdateChat(existing));
        }

        [HttpPost("{chatId}/users")]
        public async Task<ActionResult<Chat>> AddUser(
            string chatId,
            [FromBody] AddUserToChatRequest req
        )
        {
            var chat = await _appHub.GetChat(chatId);
            if (!IsAdmin(chat, req.requestingUserId))
                return Forbid();

            if (string.IsNullOrWhiteSpace(req.userId) && !string.IsNullOrWhiteSpace(req.username))
            {
                var user = await _appHub.GetUserFromUsername(req.username.Trim());
                req.userId = user?.id;
            }

            var updated = await _appHub.AddUserToChat(chatId, req.userId);
            return Ok(updated);
        }

        [HttpGet("{chatId}/people")]
        public async Task<ActionResult<List<ChatPerson>>> GetPeople(string chatId)
        {
            var chat = await _appHub.GetChat(chatId);
            var ids = chat.userIds ?? [];
            var users = await _appHub.GetUsers(ids);
            var adminSet = new HashSet<string>(chat.adminIds ?? []);

            return Ok(
                users.Select(x => new ChatPerson
                {
                    id = x.id,
                    username = x.username ?? x.id,
                    isAdmin = x.id is not null && adminSet.Contains(x.id),
                })
            );
        }

        [HttpGet("{chatId}/messages")]
        public async Task<ActionResult<List<Message>>> GetMessages(string chatId)
        {
            var messages = await _appHub.GetMessages(chatId);
            return Ok(messages);
        }

        [HttpPost("message")]
        public async Task<ActionResult<Message>> SendMessage([FromBody] Message message)
        {
            var chat = await _appHub.GetChatOrNull(message.parentId);

            if (chat is not null && (chat.adminOnly ?? false) && !IsAdmin(chat, message.userId))
                return Forbid();

            message.date ??= DateTime.Now;
            var saved = await _appHub.SaveMessage(message);
            await _hubContext.Clients.Group(saved.parentId!).ReceiveMessage(saved);
            return Ok(saved);
        }

        [HttpPost("{chatId}/ai")]
        public async Task<ActionResult<Message>> SendAIMessage(
            string chatId,
            [FromBody] AIChatRequest request
        )
        {
            var response = await _appHub.AddAIResponseToChat(request.model, chatId);
            if (response is null)
                return BadRequest(new { message = "Unable to generate AI response" });

            return Ok(response);
        }

        [HttpGet("ai/models")]
        public async Task<ActionResult<List<string>>> GetAIModels()
        {
            var models = await _appHub.GetAIModels();
            return Ok(models ?? new List<string>());
        }

        [HttpDelete("{chatId}/messages")]
        public async Task<IActionResult> ResetChat(string chatId)
        {
            await _appHub.ResetChat(chatId);
            return NoContent();
        }
    }

    public class AIChatRequest
    {
        public string model { get; set; } = string.Empty;
    }

    public class CreateChatRequest
    {
        public string? name { get; set; }
        public List<string>? userIds { get; set; }
        public List<string>? usernames { get; set; }
        public string? creatorUserId { get; set; }
        public string? accentColor { get; set; }
        public bool? adminOnly { get; set; }
        public bool? isDirect { get; set; }
    }

    public class UpdateChatRequest
    {
        public string? requestingUserId { get; set; }
        public string? name { get; set; }
        public string? accentColor { get; set; }
        public bool? adminOnly { get; set; }
        public List<string>? adminIds { get; set; }
    }

    public class AddUserToChatRequest
    {
        public string? requestingUserId { get; set; }
        public string? userId { get; set; }
        public string? username { get; set; }
    }

    public class ChatPerson
    {
        public string? id { get; set; }
        public string? username { get; set; }
        public bool isAdmin { get; set; }
    }
}
