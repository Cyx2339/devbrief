import { SOURCE_LIMIT } from './types.ts'
import type { Brief, BriefInput, TemplateId } from './types.ts'

export const sectionLabels: Record<keyof Omit<Brief, 'title' | 'summary'>, string> = {
  facts: '已知事实',
  missing: '待确认信息',
  actions: '建议行动',
  acceptance: '建议验收 / 完成条件'
}

export function validateInput(input: BriefInput): string | null {
  if (!['incident', 'requirement', 'meeting'].includes(input.template)) return '请选择有效的整理模板。'
  if (input.source.trim().length < 10) return '请至少输入 10 个字符，描述你希望整理的内容。'
  if (input.source.length > SOURCE_LIMIT) return `原始内容最多支持 ${ SOURCE_LIMIT } 个字符。`
  if (input.environment.length > 500) return '补充背景最多支持 500 个字符。'
  return null
}

export function isBrief(value: unknown): value is Brief {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.title === 'string' && !!v.title.trim() && v.title.length <= 200
    && typeof v.summary === 'string' && v.summary.length <= 4000
    && Object.keys(sectionLabels).every(key => Array.isArray(v[key])
      && (v[key] as unknown[]).length <= 40
      && (v[key] as unknown[]).every(item => typeof item === 'string' && item.length <= 2000))
}

// The demo intentionally uses only source excerpts for facts. It is not an AI result.
export function createDemoBrief(input: BriefInput): Brief {
  const facts = input.source.trim().split(/(?<=[。！？!?\n])\s*/u).filter(Boolean)
  const kind: Record<TemplateId, string> = { incident: '故障', requirement: '需求', meeting: '沟通' }
  const questions = {
    incident: ['具体的触发条件、操作步骤和发生频率是什么？', '能否补充浏览器 / 系统版本，以及发生时的日志或截图？'],
    requirement: ['本次必须完成的功能与明确不包含的范围是什么？', '谁来确认字段、权限、数据规模和最终验收标准？'],
    meeting: ['各行动项由谁负责，截止时间和依赖条件是什么？', '哪些事项已经形成决定，哪些仍需进一步确认？']
  }
  const actions = {
    incident: ['建议按原始反馈复现问题，记录环境、步骤与实际结果。', '建议收集日志，分别检查前端请求、服务响应与外部设备状态。'],
    requirement: ['建议将需求拆成页面交互、接口约定与权限要求。', '建议与业务方逐项确认范围，再补充可验证的验收用例。'],
    meeting: ['建议为每项待办补充负责人和明确的完成日期。', '建议在下一次评审前核对阻塞事项及进展。']
  }
  return {
    title: `${ kind[input.template] }整理：${ facts[0]?.slice(0, 34) || '待补充标题' }`,
    summary: input.source.trim().slice(0, 500),
    facts: [...facts.slice(0, 12), ...(input.environment.trim() ? [`补充背景：${ input.environment.trim() }`] : [])],
    missing: questions[input.template],
    actions: actions[input.template],
    acceptance: ['建议由相关人员核对本草稿，确认事实与推测已经分开。', '具体完成条件待沟通确认，本演示未推断实际解决结果。']
  }
}

export function toMarkdown(brief: Brief, mode: 'demo' | 'service'): string {
  return [
    `# ${ brief.title }`,
    `> ${ mode === 'demo' ? '规则演示草稿' : 'AI 辅助草稿' } · 请核对事实与建议`,
    '## 摘要', brief.summary,
    ...Object.entries(sectionLabels).flatMap(([key, label]) => [
      `## ${ label }`,
      (brief[key as keyof typeof sectionLabels] as string[]).map(item => `- ${ item.replace(/\n/g, '\n  ') }`).join('\n') || '- 待补充'
    ])
  ].join('\n\n') + '\n'
}

export function exportName(title: string): string {
  return (title.replace(/[\\/:*?"<>|\u0000-\u001F]/g, '-').replace(/^\.+/, '').trim().slice(0, 60) || 'devbrief') + '.md'
}
