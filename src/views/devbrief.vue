<script setup lang="tsx">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { generateBrief } from '@/features/devbrief/client'
import { exportName, isBrief, sectionLabels, toMarkdown, validateInput } from '@/features/devbrief/domain'
import { readHistory, writeHistory } from '@/features/devbrief/history'
import { templates } from '@/features/devbrief/templates'
import { HISTORY_LIMIT, SOURCE_LIMIT } from '@/features/devbrief/types'
import type { Brief, BriefInput, HistoryEntry, RunState, TemplateId } from '@/features/devbrief/types'

const input = reactive<BriefInput>({ template: 'incident', source: '', environment: '' })
const mode = ref<'demo' | 'service'>('demo')
const filePreview = location.protocol === 'file:'
const state = ref<RunState>('idle')
const result = ref<Brief | null>(null)
const history = ref<HistoryEntry[]>([])
const activeId = ref<string | null>(null)
const status = ref('')
const error = ref('')
const notice = ref('')
const saved = ref(true)
const showHistory = ref(false)
const resultMode = ref<'demo' | 'service'>('demo')
let controller: AbortController | null = null
let saveTimer: ReturnType<typeof setTimeout> | undefined
let noticeTimer: ReturnType<typeof setTimeout> | undefined
const busy = computed(() => state.value === 'generating')
const currentTemplate = computed(() => templates.find(item => item.id === input.template)!)
const sections = Object.entries(sectionLabels) as [keyof typeof sectionLabels, string][]

try { history.value = readHistory() } catch { error.value = '无法读取本地历史。你仍可整理内容，原有数据未被覆盖。' }
// Do not overwrite unreadable data automatically; users may still export the current draft.
const historyReadable = ref(!error.value)

function toast(message: string) {
  notice.value = message
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = '' }, 3000)
}

function persist() {
  if (!historyReadable.value) {
    saved.value = false
    return
  }
  try {
    writeHistory(history.value)
    saved.value = true
  } catch {
    saved.value = false
    error.value = '浏览器未能保存历史，请及时导出当前草稿。'
  }
}

function saveEdits() {
  if (!activeId.value || !result.value) return
  if (!isBrief(result.value)) {
    saved.value = false
    return
  }
  const entry = history.value.find(item => item.id === activeId.value)
  if (entry) {
    entry.brief = JSON.parse(JSON.stringify(result.value))
    entry.updatedAt = new Date().toISOString()
    persist()
  }
}

watch(result, () => {
  if (!activeId.value || !result.value || busy.value) return
  saved.value = false
  clearTimeout(saveTimer)
  saveTimer = setTimeout(saveEdits, 350)
}, { deep: true })

function reset() {
  if (busy.value) return
  clearTimeout(saveTimer)
  saveEdits()
  activeId.value = null
  result.value = null
  input.source = ''
  input.environment = ''
  state.value = 'idle'
  error.value = ''
  status.value = ''
  showHistory.value = false
}

function selectTemplate(id: TemplateId) {
  if (busy.value) return
  input.template = id
}

function useExample() {
  input.source = currentTemplate.value.example
  error.value = ''
}

async function submit() {
  if (busy.value) return
  const invalid = validateInput(input)
  if (invalid) { error.value = invalid; return }
  clearTimeout(saveTimer)
  saveEdits()
  const requestInput = { ...input }
  const requestMode = mode.value
  let actualMode = requestMode
  const runController = new AbortController()
  controller = runController
  activeId.value = null
  result.value = null
  state.value = 'generating'
  status.value = '正在准备整理…'
  error.value = ''
  try {
    const brief = await generateBrief(requestInput, requestMode, runController.signal, (event) => {
      if (event.type === 'status') status.value = event.message
      if (event.type === 'delta') status.value = '正在生成草稿，完成后即可编辑…'
      if (event.type === 'result' && event.mode === 'mock') actualMode = 'demo'
    })
    if (runController.signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const now = new Date().toISOString()
    const entry: HistoryEntry = {
      id: crypto.randomUUID(), createdAt: now, updatedAt: now,
      mode: actualMode, input: requestInput, brief
    }
    history.value = [entry, ...history.value].slice(0, HISTORY_LIMIT)
    result.value = JSON.parse(JSON.stringify(brief))
    resultMode.value = actualMode
    activeId.value = entry.id
    state.value = 'completed'
    status.value = ''
    persist()
  } catch (cause) {
    if (runController.signal.aborted) {
      state.value = 'stopped'
      status.value = '已停止生成。你可以调整内容后重新整理。'
    } else {
      state.value = 'failed'
      error.value = cause instanceof Error ? cause.message : '生成失败，请重试。'
    }
  } finally {
    if (controller === runController) controller = null
  }
}

function stop() { controller?.abort() }

function openEntry(entry: HistoryEntry) {
  if (busy.value) return
  clearTimeout(saveTimer)
  saveEdits()
  Object.assign(input, entry.input)
  mode.value = entry.mode
  resultMode.value = entry.mode
  result.value = JSON.parse(JSON.stringify(entry.brief))
  activeId.value = entry.id
  state.value = 'completed'
  error.value = ''
  status.value = ''
  saved.value = true
  showHistory.value = false
}

function deleteEntry(id: string) {
  if (busy.value) return
  clearTimeout(saveTimer)
  history.value = history.value.filter(entry => entry.id !== id)
  if (activeId.value === id) {
    activeId.value = null
    result.value = null
    state.value = 'idle'
  }
  persist()
  toast('已删除这条本地记录')
}

function editLines(key: keyof typeof sectionLabels, event: Event) {
  if (!result.value) return
  result.value[key] = (event.target as HTMLTextAreaElement).value.split('\n')
}

async function copy() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(toMarkdown(result.value, resultMode.value))
    toast('已复制为 Markdown')
  } catch { toast('浏览器未允许复制，请使用“导出文件”。') }
}

function download() {
  if (!result.value) return
  const url = URL.createObjectURL(new Blob([toMarkdown(result.value, resultMode.value)], { type: 'text/markdown;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = exportName(result.value.title)
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  toast('已导出当前编辑内容')
}

function shortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    void submit()
  }
}

const formatTime = (value: string) => new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
onBeforeUnmount(() => {
  controller?.abort()
  clearTimeout(saveTimer)
  clearTimeout(noticeTimer)
  saveEdits()
})
</script>

<template>
  <div class="db-app" @keydown="shortcut">
    <aside class="db-sidebar" :class="{ 'is-open': showHistory }" aria-label="工作台导航与历史">
      <a class="db-brand" href="#" @click.prevent="reset"><span class="db-logomark">db<span>↗</span></span><span>DevBrief<small>从沟通，到行动</small></span></a>
      <button class="db-new" type="button" :disabled="busy" @click="reset"><span>＋</span> 新建工单 <span class="db-new-arrow">↗</span></button>
      <div class="db-history-head"><span>最近整理</span><span>{{ history.length }} / {{ HISTORY_LIMIT }}</span></div>
      <nav class="db-history" aria-label="历史记录">
        <div v-if="!history.length" class="db-history-empty">让第一条清晰的工单，<br>从这里开始。</div>
        <div v-for="entry in history" :key="entry.id" class="db-history-row" :class="{ 'is-active': entry.id === activeId }">
          <button class="db-history-item" type="button" :disabled="busy" @click="openEntry(entry)">
            <span class="db-history-icon">▤</span><span class="db-history-title">{{ entry.brief.title }}<small>{{ formatTime(entry.createdAt) }} · {{ entry.mode === 'demo' ? '规则演示' : 'AI 草稿' }}</small></span>
          </button>
          <button class="db-delete" type="button" :aria-label="`删除记录：${entry.brief.title}`" :disabled="busy" @click="deleteEntry(entry.id)">×</button>
        </div>
      </nav>
      <div class="db-sidebar-bottom"><p><span class="db-local-dot" /> 记录保存在当前浏览器</p><a href="https://github.com/pdsuwwz/chatgpt-vue3-light-mvp" target="_blank" rel="noopener noreferrer">基于开源项目构建 ↗</a><div class="db-profile"><span>CY</span><div>程宇唏的工作台<small>DevBrief · v0.1</small></div></div></div>
    </aside>

    <div class="db-main">
      <header class="db-topbar"><div><button class="db-mobile-menu" type="button" :aria-expanded="showHistory" @click="showHistory = !showHistory">☰ 历史</button><span class="db-breadcrumb">个人工作台 <span>/</span> 工单整理</span></div><RouterLink to="/chat" class="db-text-link">原版对话 ↗</RouterLink></header>
      <main class="db-workspace">
        <div class="db-heading"><div><div class="db-eyebrow"><span /> THINK CLEAR. BUILD BETTER.</div><h1>把零散沟通，<span>整理成行动。</span></h1><p>留住事实，补齐问题，让下一步更清楚。</p></div><div class="db-mode"><label for="db-mode-select">生成方式</label><select id="db-mode-select" v-model="mode" :disabled="busy"><option value="demo">规则演示 · 无需密钥</option><option value="service" :disabled="filePreview">{{ filePreview ? 'AI 服务 · 需启动后端' : 'AI 服务 · 后端调用' }}</option></select></div></div>

        <div class="db-columns">
          <section class="db-source-panel" aria-labelledby="db-input-heading">
            <div class="db-panel-heading"><span class="db-step">01</span><h2 id="db-input-heading">放入原始内容</h2><span class="db-panel-meta">INPUT</span></div>
            <div class="db-template-tabs" aria-label="整理模板"><button v-for="(template, index) in templates" :key="template.id" type="button" :class="{ 'is-selected': input.template === template.id }" :aria-pressed="input.template === template.id" :disabled="busy" @click="selectTemplate(template.id)"><small>0{{ index + 1 }}</small>{{ template.name }}</button></div>
            <p class="db-template-description">{{ currentTemplate.description }}</p>
            <div class="db-source-label"><label for="db-source">沟通记录 / 问题描述</label><button type="button" :disabled="busy" @click="useExample">试试示例 ↗</button></div>
            <textarea id="db-source" v-model="input.source" :maxlength="SOURCE_LIMIT" :disabled="busy" :placeholder="'直接粘贴客户反馈、需求讨论或会议记录。\n\n不必事先整理，保留原始描述即可。'" spellcheck="false" />
            <div class="db-input-foot"><span>支持纯文本 · 建议先移除敏感信息</span><span>{{ input.source.length.toLocaleString() }} / {{ SOURCE_LIMIT.toLocaleString() }}</span></div>
            <details class="db-context"><summary>补充背景 <span>可选</span><b>＋</b></summary><label for="db-environment">系统环境、业务背景或限制条件</label><textarea id="db-environment" v-model="input.environment" :disabled="busy" maxlength="500" rows="3" placeholder="例如：Vue 3 管理后台，Chrome 浏览器，使用本地打印服务。" /></details>
            <div v-if="error" class="db-error" role="alert">{{ error }}</div>
            <div class="db-generate-row"><button v-if="busy" class="db-primary db-stop" type="button" @click="stop"><span class="db-spinner" /> 停止生成 <span>■</span></button><button v-else class="db-primary" type="button" @click="submit">整理成工单 <span>↗</span></button><span class="db-shortcut">⌘ / Ctrl + Enter</span></div>
            <p class="db-mode-note">{{ mode === 'demo' ? '当前使用规则演示，事实摘录自输入内容；建议供体验流程。' : '内容将发送至你配置的模型服务，生成结果需要人工核对。' }}</p>
          </section>

          <section class="db-result-panel" aria-labelledby="db-output-heading">
            <div class="db-panel-heading"><span class="db-step">02</span><h2 id="db-output-heading">得到清晰草稿</h2><span class="db-panel-meta">{{ result ? '可直接编辑' : 'OUTPUT' }}</span></div>
            <div v-if="!result" class="db-output-empty" :class="{ 'is-generating': busy }" aria-live="polite">
              <div class="db-paper-art" aria-hidden="true"><div class="db-paper-top"><span /> <span /></div><div class="db-paper-line db-paper-line-title" /><div class="db-paper-line" /><div class="db-paper-line db-paper-line-short" /><div class="db-paper-divider" /><div class="db-paper-check">✓ <i /></div><div class="db-paper-check">✓ <i /></div><div class="db-paper-check">✓ <i /></div><span class="db-paper-stamp">↗</span></div>
              <h3>{{ busy ? '正在让信息变得清晰' : state === 'stopped' ? '整理已暂停' : '下一步，从清晰开始' }}</h3><p>{{ busy || state === 'stopped' ? status : '左侧放入内容，这里将生成可编辑的工单。' }}</p><div v-if="busy" class="db-loading-track"><span /></div><div v-else class="db-output-tags"><span>事实与建议分开</span><span>待确认项可追踪</span><span>Markdown 导出</span></div>
            </div>
            <div v-else class="db-draft">
              <div class="db-draft-toolbar"><span class="db-draft-status"><span /> {{ resultMode === 'demo' ? '规则演示草稿' : 'AI 辅助草稿' }}</span><div><button type="button" @click="copy">复制</button><button type="button" @click="download">导出文件 ↗</button></div></div>
              <div class="db-draft-editor"><label class="db-field-caption" for="db-title">工单标题</label><input id="db-title" v-model="result.title" maxlength="200" class="db-draft-title"><label class="db-field-caption" for="db-summary">摘要</label><textarea id="db-summary" v-model="result.summary" maxlength="4000" class="db-summary" rows="4" /><div v-for="([key, label], index) in sections" :key="key" class="db-draft-section"><label :for="`db-field-${key}`"><span>0{{ index + 1 }}</span>{{ label }}</label><textarea :id="`db-field-${key}`" :value="result[key].join('\n')" :rows="Math.min(9, Math.max(3, result[key].length + 1))" maxlength="20000" placeholder="每行一项，可自由编辑" @input="editLines(key, $event)" /></div></div>
              <div class="db-draft-footer"><span>{{ saved ? '✓ 已保存到本地历史' : '本地尚未保存，请及时导出' }}</span><span>每行一项 · 编辑后自动保存</span></div>
            </div>
          </section>
        </div>
        <footer class="db-page-footer"><span>DEVBRIEF / MAKE THE NEXT STEP CLEAR.</span><span>保留事实，也保留你的判断。</span></footer>
      </main>
    </div>
    <div v-if="notice" class="db-toast" role="status">{{ notice }}</div>
  </div>
</template>

<style lang="scss">
@use '@/styles/devbrief';
</style>
