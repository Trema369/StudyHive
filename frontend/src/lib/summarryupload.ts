// lib/summaryUpload.ts

export async function extractFileTextForSummary(
    fileUrl: string
): Promise<string> {
    const formData = new FormData();
    formData.append('fileUrl', fileUrl);

    const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/textextraction/from-url`,
        { method: 'POST', body: formData }
    );

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
