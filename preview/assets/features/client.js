import { createDemoBrief, isBrief, validateInput } from './domain.js';
import { readSSE } from './stream.js';
function pause(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal.aborted)
            return reject(new DOMException('Aborted', 'AbortError'));
        const aborted = () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
        };
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', aborted);
            resolve();
        }, ms);
        signal.addEventListener('abort', aborted, { once: true });
    });
}
export async function generateBrief(input, mode, signal, onEvent) {
    const error = validateInput(input);
    if (error)
        throw new Error(error);
    if (mode === 'demo') {
        for (const message of ['正在读取沟通内容…', '正在整理事实与待确认项…', '正在生成可编辑草稿…']) {
            onEvent({ type: 'status', message });
            await pause(360, signal);
        }
        const brief = createDemoBrief(input);
        onEvent({ type: 'result', brief });
        return brief;
    }
    const response = await fetch('/api/briefs/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal
    });
    for await (const record of readSSE(response, signal)) {
        let event;
        try {
            event = JSON.parse(record.data);
        }
        catch {
            throw new Error('服务返回了无法解析的内容，请重试。');
        }
        if (event.type === 'error')
            throw new Error(event.message || '生成失败，请重试。');
        if (event.type === 'result') {
            if (!isBrief(event.brief))
                throw new Error('返回的工单格式不完整，请重试。');
            onEvent(event);
            return event.brief;
        }
        if (event.type === 'status' || event.type === 'delta')
            onEvent(event);
    }
    throw new Error('响应已结束，但没有生成完整工单，请重试。');
}
