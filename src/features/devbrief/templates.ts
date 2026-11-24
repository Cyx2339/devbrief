import type { TemplateId } from './types'

export const templates: { id: TemplateId; name: string; description: string; example: string }[] = [
  {
    id: 'incident',
    name: '故障整理',
    description: '把模糊反馈整理为可排查的技术工单。',
    example: '客户反馈，点击打印按钮偶尔没有反应，刷新页面后又可以打印。换一台电脑也遇到过，今天上午出现了两次。目前还没有收集浏览器版本和报错日志，希望先整理需要补充的信息及排查步骤。'
  },
  {
    id: 'requirement',
    name: '需求梳理',
    description: '明确目标、功能边界和需要确认的验收条件。',
    example: '业务方想在预约列表中增加批量导出。希望按照当前筛选条件导出 Excel，只导出姓名、预约日期、套餐和状态。导出是否需要权限、最多支持多少条，以及是否异步处理，还没有确认。'
  },
  {
    id: 'meeting',
    name: '沟通摘要',
    description: '保留已知事实，把讨论转成可以跟进的行动。',
    example: '今天讨论了新版本的上线准备。前端页面开发已完成，测试反馈还有两个问题需要修复。产品需要进一步确认导出字段。暂定周五再次评审，具体上线时间、问题负责人和修复截止时间尚未确定。'
  }
]
