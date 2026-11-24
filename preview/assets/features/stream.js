// SSE records are separated by a blank line, never by a network chunk boundary.
// Each request gets its own decoder and buffer, so concurrent runs cannot share state.
export async function* readSSE(response, signal) {
    if (!response.ok)
        throw new Error(response.status === 503 ? 'AI 服务尚未配置，请在服务端设置模型密钥。' : `服务请求失败（${response.status}），请稍后重试。`);
    if (!response.body)
        throw new Error('服务没有返回可读取的响应。');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const abort = () => { void reader.cancel().catch(() => { }); };
    signal?.addEventListener('abort', abort, { once: true });
    const parseRecord = (record) => {
        let event = 'message';
        const data = [];
        for (const line of record.split(/\r\n|\r|\n/)) {
            if (!line || line.startsWith(':'))
                continue;
            const colon = line.indexOf(':');
            const field = colon < 0 ? line : line.slice(0, colon);
            let value = colon < 0 ? '' : line.slice(colon + 1);
            if (value.startsWith(' '))
                value = value.slice(1);
            if (field === 'event')
                event = value;
            if (field === 'data')
                data.push(value);
        }
        return data.length ? { event, data: data.join('\n') } : null;
    };
    try {
        while (true) {
            if (signal?.aborted)
                throw new DOMException('Aborted', 'AbortError');
            const { done, value } = await reader.read();
            if (signal?.aborted)
                throw new DOMException('Aborted', 'AbortError');
            buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
            if (buffer.length > 200000)
                throw new Error('响应片段过大，请缩短输入后重试。');
            let match;
            while ((match = buffer.match(/\r\n\r\n|\n\n|\r\r/))) {
                const index = match.index;
                const record = parseRecord(buffer.slice(0, index));
                buffer = buffer.slice(index + match[0].length);
                if (record)
                    yield record;
            }
            if (done) {
                // An unterminated event must not be mistaken for a completed result.
                if (buffer.trim())
                    throw new Error('响应意外中断，工单未保存，请重试。');
                break;
            }
        }
    }
    finally {
        signal?.removeEventListener('abort', abort);
        try {
            await reader.cancel();
        }
        catch { /* The network may already have closed. */ }
        reader.releaseLock();
    }
}
