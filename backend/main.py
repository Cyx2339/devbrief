import asyncio
import json
import os
from pathlib import Path
from typing import Annotated, Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from .domain import demo_brief, encode_event, extract_json, system_prompt, user_prompt

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / '.env', override=False)
app = FastAPI(title="DevBrief API", version="0.1.0")
TextItem = Annotated[str, Field(max_length=2000)]


class BriefInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    template: Literal["incident", "requirement", "meeting"]
    source: str = Field(min_length=10, max_length=12000)
    environment: str = Field(default="", max_length=500)

    @field_validator("source")
    @classmethod
    def require_content(cls, value: str) -> str:
        if len(value.strip()) < 10:
            raise ValueError("请至少输入10个有效字符")
        return value.strip()


class Brief(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(max_length=4000)
    facts: list[TextItem] = Field(max_length=40)
    missing: list[TextItem] = Field(max_length=40)
    actions: list[TextItem] = Field(max_length=40)
    acceptance: list[TextItem] = Field(max_length=40)

    @field_validator("title")
    @classmethod
    def require_title(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("title must contain text")
        return value.strip()


@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    if request.url.path == '/api/briefs/stream':
        size = 0
        chunks = []
        async for chunk in request.stream():
            size += len(chunk)
            if size > 100000:
                return JSONResponse({"detail": "输入内容过大"}, status_code=413)
            chunks.append(chunk)
        request._body = b''.join(chunks)
    return await call_next(request)


@app.get("/api/health")
async def health():
    mode = os.getenv("DEVBRIEF_MODE", "live")
    return {"ok": True, "mode": mode, "configured": mode == "mock" or bool(os.getenv("LLM_API_KEY"))}


@app.post("/api/briefs/stream", response_model=None)
async def stream_brief(payload: BriefInput, request: Request):
    mode = os.getenv("DEVBRIEF_MODE", "live")
    api_key = os.getenv("LLM_API_KEY", "")
    if mode not in ("live", "mock"):
        return JSONResponse({"detail": "DEVBRIEF_MODE配置无效"}, status_code=503)
    if mode == "live" and not api_key:
        return JSONResponse({"detail": "请在服务端配置LLM_API_KEY"}, status_code=503)

    async def events():
        try:
            if mode == "mock":
                yield encode_event({"type": "status", "message": "正在运行服务端规则演示（未调用模型）…"})
                await asyncio.sleep(0.25)
                if await request.is_disconnected():
                    return
                result = Brief.model_validate(demo_brief(payload.source, payload.environment, payload.template))
                yield encode_event({"type": "result", "brief": result.model_dump(), "mode": "mock"})
                return
            yield encode_event({"type": "status", "message": "正在连接模型服务…"})
            base_url = os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1").rstrip('/')
            body = {
                "model": os.getenv("LLM_MODEL", "deepseek-chat"),
                "messages": [
                    {"role": "system", "content": system_prompt(payload.template)},
                    {"role": "user", "content": user_prompt(payload.source, payload.environment)},
                ],
                "stream": True,
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
                "max_tokens": 4096,
            }
            content = ''
            finished = False
            timeout = httpx.Timeout(connect=15, read=60, write=15, pool=15)
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream(
                    "POST", base_url + "/chat/completions", json=body,
                    headers={"Authorization": "Bearer " + api_key, "Accept": "text/event-stream"},
                ) as response:
                    if response.status_code != 200:
                        message = "模型服务限流，请稍后重试。" if response.status_code == 429 else "模型服务请求失败，请检查服务端模型配置。"
                        yield encode_event({"type": "error", "message": message})
                        return
                    async for line in response.aiter_lines():
                        if await request.is_disconnected():
                            return
                        if not line.startswith('data:'):
                            continue
                        data = line[5:].strip()
                        if data == '[DONE]':
                            finished = True
                            break
                        if not data:
                            continue
                        parsed = json.loads(data)
                        if parsed.get('error'):
                            raise ValueError('provider error')
                        choices = parsed.get('choices') or []
                        if not choices:
                            continue
                        choice = choices[0]
                        if choice.get('finish_reason') == 'length':
                            raise ValueError('truncated completion')
                        if choice.get('finish_reason') == 'stop':
                            finished = True
                        delta = (choice.get('delta') or {}).get('content') or ''
                        if not isinstance(delta, str):
                            raise ValueError('invalid provider delta')
                        if delta:
                            content += delta
                            if len(content) > 100000:
                                raise ValueError('completion too large')
                            yield encode_event({"type": "delta", "content": delta})
            if not finished:
                raise ValueError('incomplete completion')
            yield encode_event({"type": "status", "message": "正在检查工单结构…"})
            result = Brief.model_validate(extract_json(content))
            yield encode_event({"type": "result", "brief": result.model_dump(), "mode": "live"})
        except asyncio.CancelledError:
            raise
        except httpx.TimeoutException:
            yield encode_event({"type": "error", "message": "模型服务响应超时，请稍后重试。"})
        except (json.JSONDecodeError, ValidationError, ValueError, TypeError, KeyError):
            yield encode_event({"type": "error", "message": "模型未返回完整、有效的工单，请重试或更换模型。"})
        except httpx.HTTPError:
            yield encode_event({"type": "error", "message": "无法连接模型服务，请检查网络和服务端地址。"})

    return StreamingResponse(events(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache", "X-Accel-Buffering": "no",
    })


frontend = ROOT / ('dist' if (ROOT / 'dist').is_dir() else 'preview')
if frontend.is_dir():
    app.mount('/', StaticFiles(directory=frontend, html=True), name='frontend')
