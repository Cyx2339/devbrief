import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDemoBrief, exportName, isBrief, toMarkdown, validateInput } from '../src/features/devbrief/domain.ts'
import { readHistory, writeHistory } from '../src/features/devbrief/history.ts'
import { generateBrief } from '../src/features/devbrief/client.ts'

const input = { template: 'incident' as const, source: '打印按钮偶尔没有响应。刷新后可以使用，原因还未确认。', environment: '' }

test('demo facts preserve source, without claiming a diagnosis', () => {
  const brief = createDemoBrief(input)
  assert.ok(isBrief(brief))
  assert.deepEqual(brief.facts, ['打印按钮偶尔没有响应。', '刷新后可以使用，原因还未确认。'])
  assert.ok(brief.actions.every(item => item.startsWith('建议')))
  assert.notDeepEqual(brief.missing, createDemoBrief({ ...input, template: 'meeting' }).missing)
})

test('invalid inputs and incomplete results are rejected', () => {
  assert.ok(validateInput({ ...input, source: ' '.repeat(15) }))
  assert.ok(validateInput({ ...input, source: 'a'.repeat(12001) }))
  assert.equal(isBrief({ title: 'title' }), false)
})

test('export includes edited content and demo provenance', () => {
  const brief = createDemoBrief(input)
  brief.title = '人工核对后的标题'
  brief.actions = ['人工补充的排查步骤']
  assert.match(toMarkdown(brief, 'demo'), /人工补充的排查步骤/)
  assert.match(toMarkdown(brief, 'demo'), /规则演示草稿/)
  assert.equal(exportName('../a:b/c'), '-a-b-c.md')
})

test('history roundtrip is capped and corrupted data is preserved for recovery', () => {
  let raw: string | null = null
  const storage = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value } }
  const entry = { id: '1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), mode: 'demo' as const, input, brief: createDemoBrief(input) }
  writeHistory(Array.from({ length: 35 }, (_, index) => ({ ...entry, id: String(index) })), storage)
  assert.equal(readHistory(storage).length, 30)
  raw = '{broken'
  assert.throws(() => readHistory(storage))
  assert.equal(raw, '{broken')
})

test('demo can be stopped before any result is produced', async () => {
  const controller = new AbortController()
  const promise = generateBrief(input, 'demo', controller.signal, () => {})
  controller.abort()
  await assert.rejects(promise, { name: 'AbortError' })
})
