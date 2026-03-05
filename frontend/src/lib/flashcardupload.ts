export async function extractFileText(
    apiBase: string,
    file: File
): Promise<string> {
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`${apiBase}/api/TextExtraction`, {
        method: 'POST',
        body: form,
    });

    if (!res.ok) {
        let message = 'Text extraction failed';

        try {
            const payload = await res.json();
            if (payload?.message) message = payload.message;
        } catch { }

        throw new Error(message);
    }

    const data = await res.json();
    return data.text ?? '';
}
