/**
 * 浏览器端 SSE 流式读取（`data: <json>` 行协议）。
 *
 * 网络分片不保证按行边界切分，因此必须在跨 chunk 间维护行缓冲，
 * 否则跨 chunk 的 `data: {...}` 行会被截断为两个非法 JSON 而静默丢字。
 */
export async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (data: string) => void,
  decoder = new TextDecoder(),
): Promise<void> {
  const reader = body.getReader();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // 只有当出现换行时才逐行消费；最后一段留作下次前缀（可能被后续分片补全）
      if (!buffer.includes('\n')) continue;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.replace(/\r$/, '');
        if (!trimmed.startsWith('data: ')) continue;
        onEvent(trimmed.slice(6));
      }
    }
    // 流结束后消费残留的最后一段（无结尾换行的最后一行）
    const tail = buffer.replace(/\r$/, '');
    if (tail.startsWith('data: ')) onEvent(tail.slice(6));
  } finally {
    reader.releaseLock();
  }
}
