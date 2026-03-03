using backend.Hubs;
using backend.Shared;
using backend.Shared.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Mvc;

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

        [HttpGet("{chatId}/messages")]
        public async Task<ActionResult<List<Message>>> GetMessages(string chatId)
        {
            var messages = await _appHub.GetMessages(chatId);
            return Ok(messages);
        }

        [HttpPost("message")]
        public async Task<ActionResult<Message>> SendMessage([FromBody] Message message)
        {
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
}
