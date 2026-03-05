using System.Text;
using DocumentFormat.OpenXml.Packaging;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using iText.Kernel.Pdf.Canvas.Parser.Listener;
using Microsoft.AspNetCore.Mvc;
using Tesseract;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TextExtractionController : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<object>> Extract([FromForm] IFormFile? file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        var ext = Path.GetExtension(file.FileName).ToLower();

        string text = "";

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        ms.Position = 0;

        if (ext == ".pdf")
        {
            text = ExtractPdfText(ms);
        }
        else if (ext == ".docx")
        {
            text = ExtractDocxText(ms);
        }
        else if (ext == ".txt")
        {
            using var reader = new StreamReader(ms);
            text = await reader.ReadToEndAsync();
        }
        else if (file.ContentType.StartsWith("image/"))
        {
            text = ExtractImageText(ms);
        }

        return Ok(new { text });
    }

    private string ExtractPdfText(Stream stream)
    {
        var sb = new StringBuilder();

        using var pdfReader = new PdfReader(stream);
        using var pdfDoc = new PdfDocument(pdfReader);

        for (int i = 1; i <= pdfDoc.GetNumberOfPages(); i++)
        {
            var page = pdfDoc.GetPage(i);
            var strategy = new SimpleTextExtractionStrategy();
            var pageText = PdfTextExtractor.GetTextFromPage(page, strategy);
            sb.AppendLine(pageText);
        }

        return sb.ToString();
    }

    private string ExtractDocxText(Stream stream)
    {
        using var doc = WordprocessingDocument.Open(stream, false);
        return doc.MainDocumentPart?.Document.Body?.InnerText ?? "";
    }

    private string ExtractImageText(Stream stream)
    {
        using var engine = new TesseractEngine("./tessdata", "eng", EngineMode.Default);

        var bytes = ReadAllBytes(stream);

        using var img = Pix.LoadFromMemory(bytes);
        using var page = engine.Process(img);

        return page.GetText();
    }

    private byte[] ReadAllBytes(Stream stream)
    {
        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        return ms.ToArray();
    }
}
