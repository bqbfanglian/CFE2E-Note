export const clientOrigin = "http://127.0.0.1:8765";
export const headers = {
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": clientOrigin,
  "Access-Control-Expose-Headers": "ETag",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export function error(status, message, extraHeaders) {
  return Response.json({ error: message }, { status, headers: { ...headers, ...extraHeaders } });
}

export async function readText(request, limit) {
  if (Number(request.headers.get("Content-Length")) > limit) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let length = 0;
  let text = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch {
    return "";
  } finally {
    reader.releaseLock();
  }
}
