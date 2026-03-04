export type Attachment = {
  url?: string;
  name?: string;
  contentType?: string;
  size?: number;
};

export async function uploadFile(
  apiBase: string,
  file: File,
): Promise<Attachment> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${apiBase}/api/uploads`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(payload?.message ?? "Upload failed");
  }
  return (await res.json()) as Attachment;
}
