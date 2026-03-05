using System.Threading.Tasks;
using backend.Hubs;
using backend.Shared.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AISummaryController : ControllerBase
    {
        private readonly AppHub _appHub;

        public AISummaryController(AppHub appHub)
        {
            _appHub = appHub;
        }

        [HttpPost]
        [Route("generate")]
        public async Task<ActionResult<object>> GenerateSummary([FromBody] AISummaryRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.notes))
                return BadRequest(new { message = "Notes cannot be empty" });

            var summary = await _appHub.GetAISummary(req.notes);

            return Ok(new { summary });
        }
    }
}
