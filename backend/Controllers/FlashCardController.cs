using System.Collections.Generic;
using System.Threading.Tasks;
using backend.Hubs;
using backend.Shared.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AIFlashcardsController : ControllerBase
    {
        private readonly AppHub _appHub;

        public AIFlashcardsController(AppHub appHub)
        {
            _appHub = appHub;
        }

        [HttpPost]
        [Route("generate")]
        public async Task<ActionResult<List<FlashcardCard>>> GenerateFlashcards(
            [FromBody] AIFlashcardRequest req
        )
        {
            if (string.IsNullOrWhiteSpace(req.notes))
                return BadRequest(new { message = "Notes cannot be empty" });

            var cards = await _appHub.GetAIFlashcards(req.notes);
            return Ok(cards);
        }
    }
}
