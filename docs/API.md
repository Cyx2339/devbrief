# DevBrief API

默认地址为 `http://127.0.0.1:8000`。模型密钥和供应商地址由服务端环境变量配置，不通过请求体或浏览器传入。接口当前面向本机单用户运行。

## GET /api/health

检查进程状态和配置是否存在，不会实际调用供应商。

```json
{"ok":true,"mode":"live","configured":false}
```

`configured=true` 表示已提供模型密钥，或服务运行于 `mock` 模式；不表示密钥有效或供应商可达。

## POST /api/briefs/stream

请求类型：`application/json`。

```json
{
  "template": "incident",
  "source": "客户反馈打印按钮偶尔没有响应，刷新后恢复，需要补充日志进一步排查。",
  "environment": "Vue 3 管理后台，连接本地打印服务。"
}
```

| 字段 | 要求 |
| --- | --- |
| `template` | 必填；`incident`、`requirement` 或 `meeting` |
| `source` | 必填；至少 10 个有效字符，最多 12,000 字符 |
| `environment` | 可选，默认空字符串；最多 500 字符 |

额外字段会被拒绝。请求体实际字节数上限为 100,000 字节。

```bash
curl -N http://127.0.0.1:8000/api/briefs/stream \
  -H 'Content-Type: application/json' \
  -d '{"template":"incident","source":"打印按钮偶尔没有响应，刷新后恢复，需要补充日志进一步排查。","environment":""}'
```

返回类型为 `text/event-stream`。每条消息采用 `data: JSON`，事件之间以空行分隔；客户端应读取 JSON 中的 `type` 字段。

### 事件

| type | 字段 | 用途 |
| --- | --- | --- |
| `status` | `message` | 当前处理阶段 |
| `delta` | `content` | 模型返回的原始 JSON 文本增量，不是已验证的工单 |
| `result` | `brief`、`mode` | 完整并通过结构校验的工单；mode 为 live 或 mock |
| `error` | `message` | 生成失败，不应创建成功历史 |

```text
data: {"type":"status","message":"正在连接模型服务…"}

data: {"type":"delta","content":"{\"title\":"}

data: {"type":"result","mode":"live","brief":{"title":"打印偶发无响应","summary":"客户反馈打印偶发无响应，刷新后恢复。","facts":["打印偶发无响应"],"missing":["需要补充日志"],"actions":["建议记录复现步骤"],"acceptance":["待确认验收方式"]}}

```

上面的片段是协议示例，不代表真实模型调用记录。一次请求可能产生多条 status 和 delta，最终返回 result 或 error。

### brief 数据结构

| 字段 | 类型 | 服务端限制 |
| --- | --- | --- |
| `title` | string | 非空，最多 200 字符 |
| `summary` | string | 最多 4,000 字符 |
| `facts` | string[] | 已知事实 |
| `missing` | string[] | 待确认信息 |
| `actions` | string[] | 建议行动 |
| `acceptance` | string[] | 建议验收或完成条件 |

每个数组最多 40 项，每项最多 2,000 字符。结构不完整、超限或格式异常会返回 error，不会被保存为有效工单。

### 错误与中断

| 情况 | 返回 |
| --- | --- |
| 输入非法、模板无效或额外字段 | HTTP 422 |
| 请求体过大 | HTTP 413 |
| 未配置密钥或服务端模式无效 | HTTP 503 |
| 模型超时、限流、无效结果或网络故障 | 流内 error 事件 |

流已经建立后，HTTP 状态仍可能是 200；客户端必须检查事件，不能只凭 HTTP 200 判断成功。上游响应正文不直接转发给浏览器。

前端通过 AbortController 停止请求；后端检测连接断开后结束处理。只有完整 result 才进入成功历史。

## 配置与本地测试

将 `backend/env.example` 复制为根目录 `.env`。`LLM_BASE_URL` 填基础地址，例如 `https://api.deepseek.com/v1`，服务端会追加 `/chat/completions`。

设置 `DEVBRIEF_MODE=mock` 可在无密钥条件下检查接口返回，result 会明确携带 `mode=mock`。前端本地规则演示与服务端 mock 是两条不同的路径。

FastAPI 自动生成的交互文档位于 `/docs`，OpenAPI 描述位于 `/openapi.json`。
