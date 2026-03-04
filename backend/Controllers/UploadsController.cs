using backend.Shared.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UploadsController : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<Attachment>> Upload([FromForm] IFormFile? file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file provided" });

        var ext = Path.GetExtension(file.FileName);
        var safeName = $"{Guid.NewGuid():N}{ext}";
        var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
        Directory.CreateDirectory(uploadsPath);
        var fullPath = Path.Combine(uploadsPath, safeName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream);
        }

        var attachment = new Attachment
        {
            url = $"/uploads/{safeName}",
            name = file.FileName,
            contentType = string.IsNullOrWhiteSpace(file.ContentType)
                ? "application/octet-stream"
                : file.ContentType,
            size = file.Length,
        };
        return Ok(attachment);
    }
}
