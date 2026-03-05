using System.Text;
using DocumentFormat.OpenXml.Packaging;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using Tesseract;

namespace backend.Services;

public static class TextExtractionService
{
    public static string ExtractText(string filePath, string mimeType)
    {
        if (mimeType == "application/pdf")
            return ExtractPdf(filePath);

        if (mimeType.Contains("wordprocessingml"))
            return ExtractDocx(filePath);

        if (mimeType.StartsWith("image/"))
            return ExtractImage(filePath);

        if (mimeType == "text/plain")
            return File.ReadAllText(filePath);

        return "";
    }

    private static string ExtractPdf(string filePath)
    {
        var sb = new StringBuilder();

        using var pdf = new PdfDocument(new PdfReader(filePath));

        for (int i = 1; i <= pdf.GetNumberOfPages(); i++)
        {
            var page = pdf.GetPage(i);
            sb.Append(PdfTextExtractor.GetTextFromPage(page));
            sb.Append("\n");
        }

        return sb.ToString();
    }

    private static string ExtractDocx(string filePath)
    {
        using var doc = WordprocessingDocument.Open(filePath, false);

        return doc.MainDocumentPart.Document.Body.InnerText;
    }

    private static string ExtractImage(string filePath)
    {
        using var engine = new TesseractEngine("./tessdata", "eng", EngineMode.Default);
        using var img = Pix.LoadFromFile(filePath);
        using var page = engine.Process(img);

        return page.GetText();
    }
}
