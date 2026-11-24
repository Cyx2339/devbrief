// Component-level interaction test using Vue's custom renderer, without a browser.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { webcrypto } = require('node:crypto')
const { test } = require('node:test')

function makeNode(tag, text = '') {
  const node = {
    tag, tagName: tag.toUpperCase(), text, children: [], props: {}, listeners: {}, value: '', parent: null,
    addEventListener(name, fn) { this.listeners[name] = fn },
    removeEventListener(name) { delete this.listeners[name] },
    getRootNode() { let node = this; while (node.parent) node = node.parent; return node },
    setAttribute(name, value) { this.props[name] = value },
    removeAttribute(name) { delete this.props[name] }
  }
  Object.defineProperty(node, 'options', { get() { return this.children.filter(item => item.tag === 'option') } })
  return node
}

test('actual compiled workbench generates, edits, saves, stops and deletes a draft', async () => {
  let stored = null
  const document = { activeElement: null, createElement: makeNode, createElementNS: (_ns, tag) => makeNode(tag) }
  const context = vm.createContext({
    console, document, Document: class Document {}, ShadowRoot: class ShadowRoot {}, location: { protocol: 'https:' },
    navigator: { clipboard: { writeText: async () => {} } },
    localStorage: { getItem: () => stored, setItem: (_key, value) => { stored = value } },
    setTimeout, clearTimeout, TextDecoder, TextEncoder, ReadableStream, Response,
    AbortController, DOMException, URL, Blob, crypto: webcrypto, structuredClone
  })
  const html = fs.readFileSync(path.join(__dirname, '../DevBrief-preview.html'), 'utf8')
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1]
  const appIndex = script.lastIndexOf('const app=Vue.createApp(Workbench);')
  assert.ok(appIndex > 0)
  vm.runInContext(script.slice(0, appIndex) + '\nthis.harness={Vue,Workbench};', context)
  const { Vue, Workbench } = context.harness
  const renderer = Vue.createRenderer({
    createElement: makeNode,
    createText: text => makeNode('#text', text),
    createComment: text => makeNode('#comment', text),
    insert(node, parent, anchor) {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      node.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : -1
      if (index < 0) parent.children.push(node)
      else parent.children.splice(index, 0, node)
    },
    remove(node) {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      node.parent = null
    },
    setText(node, text) { node.text = text },
    setElementText(node, text) { node.text = text; node.children = [] },
    parentNode: node => node.parent,
    nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] || null,
    patchProp(node, key, _previous, next) { node.props[key] = next; if (key === 'value') node.value = next },
    insertStaticContent(html, parent, anchor) {
      const node = makeNode('static', html)
      node.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : -1
      if (index < 0) parent.children.push(node)
      else parent.children.splice(index, 0, node)
      return [node, node]
    }
  })
  const root = makeNode('root')
  const app = renderer.createApp(Workbench)
  const renderErrors = []
  app.config.errorHandler = error => renderErrors.push(error)
  app.component('RouterLink', { render: () => null })
  app.mount(root)
  const all = (node = root) => [node, ...node.children.flatMap(child => all(child))]
  const text = node => [node.text.replace(/<[^>]+>/g, ''), ...node.children.map(text)].join('')
  const button = label => all().find(node => node.tag === 'button' && text(node).includes(label))
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
  button('试试示例').props.onClick()
  await Vue.nextTick()
  await button('整理成工单').props.onClick()
  await Vue.nextTick()
  assert.equal(JSON.parse(stored).length, 1)
  assert.ok(text(root).includes('规则演示草稿'))
  const title = all().find(node => node.props.id === 'db-title')
  title.value = '人工编辑后的故障工单'
  title.listeners.input({ target: title })
  await Vue.nextTick()
  await pause(420)
  assert.equal(JSON.parse(stored)[0].brief.title, '人工编辑后的故障工单')

  const generating = button('整理成工单').props.onClick()
  await Vue.nextTick()
  button('停止生成').props.onClick()
  await generating
  await Vue.nextTick()
  assert.equal(JSON.parse(stored).length, 1)
  assert.ok(text(root).includes('整理已暂停'))

  const remove = all().find(node => node.tag === 'button' && node.props['aria-label']?.startsWith('删除记录：'))
  remove.props.onClick()
  await Vue.nextTick()
  assert.equal(JSON.parse(stored).length, 0)
  assert.deepEqual(renderErrors, [])
  app.unmount()
})
