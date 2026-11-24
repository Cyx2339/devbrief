import { isBrief, validateInput } from './domain.js';
import { HISTORY_LIMIT } from './types.js';
const KEY = 'devbrief.history.v1';
export function readHistory(storage = localStorage) {
    const raw = storage.getItem(KEY);
    if (!raw)
        return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed))
        throw new Error('历史记录格式异常。');
    return parsed.filter((value) => {
        if (!value || typeof value !== 'object')
            return false;
        const entry = value;
        return typeof entry.id === 'string' && typeof entry.createdAt === 'string'
            && typeof entry.updatedAt === 'string' && ['demo', 'service'].includes(entry.mode)
            && entry.input && typeof entry.input.source === 'string'
            && typeof entry.input.environment === 'string'
            && !validateInput(entry.input) && isBrief(entry.brief);
    }).slice(0, HISTORY_LIMIT);
}
export function writeHistory(entries, storage = localStorage) {
    storage.setItem(KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
}
