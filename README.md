# DevBrief · AI 技术工单整理助手

把零散的客户反馈、需求讨论或会议记录，整理成可核对、可编辑、可导出的工单。

基于 [pdsuwwz/chatgpt-vue3-light-mvp](https://github.com/pdsuwwz/chatgpt-vue3-light-mvp) 二次开发。保留原作者署名与 MIT 许可证；原项目说明见 [docs/upstream-README.md](docs/upstream-README.md)。

## 立即体验

双击根目录 `DevBrief-preview.html`，无需安装依赖即可体验规则演示。

1. 选择故障整理、需求梳理或沟通摘要。
2. 点击“试试示例”，或输入至少10个字符的真实场景描述。
3. 点击“整理成工单”。
4. 修改标题、摘要和分项内容，再复制或导出 Markdown。
5. 刷新页面后可以从当前浏览器的本地历史继续编辑。

单文件预览是规则演示，不会调用模型，也不能证明真实 AI 的内容质量。浏览器如果不允许本地文件保存历史，请使用下面的HTTP预览方式。

```bash
python3 scripts/serve-preview.py --open
```

打开 http://127.0.0.1:2048 。此方式同样无需安装前端依赖，只提供演示功能。

## 使用真实模型

需要 Python 3.10+。在项目根目录：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/env.example .env
```

Windows 激活方式为 `.venv\Scripts\activate`。

编辑 `.env`，填写自己的 `LLM_API_KEY`，确认 `LLM_BASE_URL` 和 `LLM_MODEL` 与供应商一致。这个接口要求模型支持 OpenAI-compatible chat/completions、流式返回和 JSON object 输出。

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

打开 http://127.0.0.1:8000 ，在“生成方式”中选择“AI 服务”。密钥仅保存在服务端，工单工作台不会读取原项目的 `VITE_*_KEY`。请勿提交 `.env`。

若要只验证前后端联通，可在 `.env` 中设置 `DEVBRIEF_MODE=mock`。它会明确返回规则演示标识，仍然不会调用模型。

## 完整工程开发

需要 Node >=22.12 与 pnpm 10。本工程锁定 pnpm 10.33.0。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

根路由进入新增的 `/workbench`；原版聊天页保留在 `/chat`。开发环境 `/api` 代理到本机8000端口。

```bash
pnpm build:gh-pages
```

生成使用hash路由的 `dist`。FastAPI优先托管dist，未生成dist时托管随包附带的preview工作台。GitHub Pages只能托管规则演示，不能运行FastAPI。原项目自动发布流程改为手动触发，避免默认发布。

## 验证

```bash
pnpm test
pnpm typecheck:brief
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

当前记录：10项TypeScript功能测试、1项Vue组件交互测试、7项FastAPI测试通过，工单核心TypeScript类型检查通过。新增页面已经通过Vue官方SFC编译器编译，预览脚本语法检查通过。

完整Vite构建暂未验证：本次环境无法联网补齐原工程依赖，离线安装提示缺少 `@nzoth/toolkit@0.0.4`。Vue组件交互测试覆盖生成、编辑、自动保存、停止及删除。真实浏览器视觉验证受当前环境访问限制，尚未完成；请以实际打开预览的结果为准。真实模型调用需要你自己的模型配置，未在本次运行中调用付费服务。

## 重新生成预览

安装完整前端依赖后：

```bash
pnpm build:preview
```

脚本从同一份Vue工作台与业务模块生成 `preview/` 和单文件 `DevBrief-preview.html`。独立预览中的“原版对话”链接打开上游在线示例；完整工程中的同名链接打开本项目保留的聊天页。

## 功能与边界

- 三类模板；原文与背景分开输入。
- 事实、待确认信息、建议行动、建议验收条件分开展示。
- 可编辑草稿；350ms防抖保存；最近30条浏览器本地记录。
- Markdown复制和导出；基于当前编辑内容。
- SSE处理UTF-8半包、多事件、CRLF、完成与错误状态。
- 停止请求；失败或中断不创建成功历史。
- FastAPI服务端密钥、输入校验、模型结果结构校验。

历史仅在当前浏览器中，不具备多设备同步、团队协作和账号权限。接口目前面向本机单用户运行，未加入公开服务需要的鉴权和限流。JSON结构校验不保证模型内容事实准确，草稿仍需核对。

## 来源与开发记录

上游源码快照：`e0f4678c5f6c7476f3ee8dda6308657a401f5b18`，来源为用户下载的官方GitHub源码ZIP。

本地Git历史的首个提交是“源码归档导入”，不是上游原始提交历史。新增功能位于 `feat/devbrief-workspace` 分支。目前未创建GitHub fork、未提交PR、未公开部署。

实现结构、设计取舍、面试练习和可用的简历事实边界见 [docs/PROJECT-WALKTHROUGH.md](docs/PROJECT-WALKTHROUGH.md)。
