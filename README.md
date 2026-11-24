# DevBrief

**把零散沟通，整理成可行动的技术工单。**

DevBrief 是一个基于 Vue 3 与 FastAPI 的轻量 AI 工单整理助手。输入客户反馈、需求讨论或会议记录，生成包含已知事实、待确认信息、建议行动和建议完成条件的可编辑草稿，支持本地历史与 Markdown 导出。

项目基于 [chatgpt-vue3-light-mvp](https://github.com/pdsuwwz/chatgpt-vue3-light-mvp) 二次开发，保留上游工程与聊天页面，新增面向技术协作的工单工作台和服务端模型接入。

[快速体验](#快速体验) · [接入模型](#接入模型) · [本地开发](#本地开发) · [API 文档](docs/API.md) · [架构与实现](docs/PROJECT-WALKTHROUGH.md)

## 为什么做这个工具

“点击打印没反应”“想增加一个批量导出”“下周再确认上线时间”这类反馈，往往混合了现象、诉求、猜测和未确定的安排。进入研发流程前，还需要补充背景、澄清问题和明确下一步。

DevBrief 为这一步提供一个小型工作台：保留原始文本，将事实与建议分开，允许人工修订，再导出为便于沟通的工单。它适用于个人开发者、小型团队和需要整理技术反馈的业务对接场景。

## 功能

| 功能 | 说明 |
| --- | --- |
| 三类场景模板 | 故障整理、需求梳理、沟通摘要，提供不同的整理目标与示例 |
| 结构化草稿 | 标题、摘要、已知事实、待确认信息、建议行动、建议完成条件 |
| 原文与背景分开输入 | 原始内容最多 12,000 字符，补充背景最多 500 字符 |
| 人工编辑 | 标题、摘要和各分项均可修改，分项每行一条 |
| 本地历史 | 编辑后防抖保存，保留最近 30 条记录 |
| 复制与导出 | 将当前编辑内容复制或导出为 Markdown |
| 生成状态管理 | 显示进度、停止请求、错误提示；中断结果不保存为成功工单 |
| 服务端模型接入 | FastAPI 调用 OpenAI-compatible 接口，密钥保存在服务端 |
| 无密钥演示 | 提供规则生成路径，可直接体验交互与导出流程 |

## 使用示例

输入：

> 客户反馈，点击打印按钮偶尔没有反应，刷新页面后又可以打印。换一台电脑也遇到过，今天上午出现了两次，还没有收集浏览器版本和报错日志。

整理时关注：

| 分类 | 应当保留或补充的内容 |
| --- | --- |
| 已知事实 | 打印偶发无响应、刷新后恢复、另一台电脑也出现过 |
| 待确认信息 | 浏览器与系统版本、触发步骤、日志、打印服务状态 |
| 建议行动 | 复现并记录现象，收集前端请求和本地服务日志 |
| 建议完成条件 | 与相关人员确认验收方式，验证问题能否稳定复现及修复 |

这是整理目标示例。模型输出可能不同；已知事实与建议仍需人工核对。

## 快速体验

### 方式一：直接打开单文件演示

下载源码 ZIP，解压后使用 Chrome、Edge 或 Safari 打开根目录的 `DevBrief-preview.html`。

选择模板 → 点击“试试示例”或输入文本 → 整理成工单 → 编辑 → 复制或导出。

单文件演示无需安装依赖、不调用模型。生成结果会标注“规则演示草稿”。若浏览器限制本地文件的历史存储，可使用方式二。

### 方式二：通过本地 HTTP 预览

需要 Python 3.10+，在项目根目录运行：

```bash
python3 scripts/serve-preview.py --open
```

访问 http://127.0.0.1:2048 。此方式只提供规则演示，不启动模型接口。

## 接入模型

需要 Python 3.10+。在项目根目录执行：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/env.example .env
```

Windows 可使用 `py` 替换 `python3`，并通过 `.venv\Scripts\activate` 激活环境。

编辑 `.env`：

```ini
DEVBRIEF_MODE=live
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
LLM_API_KEY=填入自己的密钥
```

模型服务需要支持 OpenAI-compatible `chat/completions`、流式返回和 JSON object 输出。不同供应商的兼容程度需要分别验证。

启动后端：

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

打开 http://127.0.0.1:8000 ，选择“AI 服务”。后端会同时托管随包附带的工作台预览；若已有 `dist/`，则优先托管完整前端构建。无需先安装前端依赖即可通过预览工作台接入后端。

想先检查接口链路，可把 `DEVBRIEF_MODE` 设为 `mock`。服务端会返回明确的规则演示标识，不会把模拟结果标成 AI 结果。

| 配置 | 用途 |
| --- | --- |
| `DEVBRIEF_MODE` | `live` 调用模型；`mock` 使用服务端规则演示 |
| `LLM_BASE_URL` | 供应商 API 基础地址，末尾不包含 `/chat/completions` |
| `LLM_MODEL` | 模型标识符 |
| `LLM_API_KEY` | 服务端密钥，不提交到版本库 |

## 本地开发

前端需要 Node.js >=22.12 和 pnpm 10，项目声明的包管理器版本为 10.33.0。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

前端默认运行在 http://127.0.0.1:2048 。`/api` 请求代理到本机 8000 端口，使用真实模型时需另开终端启动后端。

| 路径 | 页面 |
| --- | --- |
| `/workbench` | 新增 DevBrief 工作台，也是默认首页 |
| `/chat` | 保留的上游聊天页面 |

```bash
pnpm build:gh-pages  # 生成使用 hash 路由的 dist
pnpm build:preview   # 重新生成工作台 preview/ 和单文件演示
```

独立预览中的“原版对话”打开上游在线示例；完整工程中打开本项目的 `/chat` 页面。GitHub Pages 可用于托管演示页面，FastAPI 需在支持 Python 的运行环境中单独启动。

## 技术实现

| 层次 | 技术与职责 |
| --- | --- |
| 工作台 | Vue 3、TypeScript；模板选择、状态管理、编辑和导出 |
| 原有前端工程 | Vite、Pinia、Naive UI、UnoCSS 与 Vue Router |
| 流式处理 | Fetch、ReadableStream、TextDecoder、SSE 事件缓冲 |
| 后端 | Python、FastAPI、Pydantic、HTTPX |
| 数据保存 | 浏览器 localStorage，不依赖数据库 |
| 验证 | Node Test Runner、Vue 自定义渲染器、FastAPI TestClient |

核心设计是将输入校验、模型通信、事件解析、结果编辑和持久化分开。模型流式生成的内容先在后端积累并校验，只有完整结构通过校验后才作为工单保存。

文件职责和具体设计取舍见 [架构与实现](docs/PROJECT-WALKTHROUGH.md)。

## 测试与验证状态

```bash
pnpm test
pnpm typecheck:brief
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

已通过 18 项测试：10 项业务与流式测试、1 项 Vue 组件交互测试、7 项后端测试。工单核心 TypeScript 类型检查、新页面 SFC 编译和独立预览脚本语法检查通过。

完整 Vite 构建、真实浏览器视觉检查及真实模型联调仍待完成。测试范围与环境记录见 [验证记录](docs/VALIDATION.md)。

## 当前范围

- 面向本机单用户使用；历史记录保存在当前浏览器，不做跨设备同步。
- 当前没有账号系统、数据库、团队权限、RAG 检索或工单平台集成。
- 结构校验不等于事实核验，生成草稿需要人工确认。
- 新工单模块的密钥由后端管理；保留的上游聊天页面使用其原有配置机制。
- 真实 API 模式会将输入内容发送给配置的供应商，请自行选择适合的数据和服务。

后续可考虑补充真实模型回归用例、真实页面截图、服务端持久化，以及 GitHub Issues 等工单平台对接。

## 来源与许可

上游项目：[pdsuwwz/chatgpt-vue3-light-mvp](https://github.com/pdsuwwz/chatgpt-vue3-light-mvp)，作者 Wisdom。使用的源码快照为 `e0f4678c5f6c7476f3ee8dda6308657a401f5b18`。

DevBrief 新增工单工作台、结构化结果契约、FastAPI 模型网关、本地工单历史、编辑导出和相关测试。上游原有功能及第三方组件保留其来源与权利说明，详见 [NOTICE](NOTICE)、[LICENSE](LICENSE) 和 [上游 README](docs/upstream-README.md)。

欢迎按 [贡献说明](CONTRIBUTING.md) 反馈问题或提交改进。
