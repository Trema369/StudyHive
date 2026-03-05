import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'

export async function extractTextFromFileBuffer(
    fileData: ArrayBuffer | Buffer,
    mimeType: string,
): Promise<string> {
    if (mimeType === 'application/pdf') {
        const buffer = Buffer.isBuffer(fileData) ? fileData : Buffer.from(fileData)
        const parser = new PDFParse({ data: buffer }) // create parser with data
        const result = await parser.getText()
        return result.text
    } else if (
        mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
        const buffer = Buffer.isBuffer(fileData) ? fileData : Buffer.from(fileData)
        const result = await mammoth.extractRawText({ buffer })
        return result.value
    } else if (mimeType === 'text/plain') {
        return Buffer.isBuffer(fileData)
            ? fileData.toString('utf-8')
            : new TextDecoder().decode(fileData)
    } else {
        return ''
    }
}
