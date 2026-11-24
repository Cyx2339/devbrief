import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readSSE } from '../src/features/devbrief/stream.ts'

function response(text: string, size = 1) {
  const bytes = new TextEncoder().encode(text)
  return new Response(new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += size) controller.enqueue(bytes.slice(i, i + size))
    controller.close()
  } }))
}

test('SSE survives byte-level fragmentation, Chinese UTF-8 and CRLF', async () => {
  const stream = ': ping\r\n\r\nevent: result\r\ndata:{"title":"中文工单"}\r\n\r\n'
  const events = []
  for await (const event of readSSE(response(stream))) events.push(event)
  assert.deepEqual(events, [{ event: 'result', data: '{"title":"中文工单"}' }])
})

test('multiple events in a chunk and multiline data are distinct records', async () => {
  const events = []
  for await (const event of readSSE(response('data: first\ndata: second\n\ndata: third\n\n', 200))) events.push(event)
  assert.deepEqual(events.map(event => event.data), ['first\nsecond', 'third'])
})

test('truncated event is rejected instead of being counted as complete', async () => {
  await assert.rejects(async () => {
    for await (const _ of readSSE(response('data: {"type":"result"}'))) { /* consume */ }
  }, /意外中断/)
})

test('abort cancels a pending read', async () => {
  let cancelled = false
  const controller = new AbortController()
  const res = new Response(new ReadableStream({ cancel() { cancelled = true } }))
  const iterator = readSSE(res, controller.signal)
  const waiting = iterator.next()
  controller.abort()
  await assert.rejects(waiting, { name: 'AbortError' })
  assert.equal(cancelled, true)
})

test('unconfigured service has a clear error', async () => {
  await assert.rejects(async () => {
    for await (const _ of readSSE(new Response('', { status: 503 }))) { /* consume */ }
  }, /尚未配置/)
})
