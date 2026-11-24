import json
import os
import unittest
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient
from backend.main import app
from backend.domain import demo_brief

PAYLOAD = {"template": "incident", "source": "打印按钮偶尔没有反应，刷新页面后恢复。", "environment": ""}
AsyncClient = httpx.AsyncClient


def events(response):
    return [json.loads(line[5:].strip()) for line in response.text.splitlines() if line.startswith('data:')]


class BackendTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_mock_returns_valid_result_without_model_key(self):
        with patch.dict(os.environ, {"DEVBRIEF_MODE": "mock", "LLM_API_KEY": ""}):
            response = self.client.post('/api/briefs/stream', json=PAYLOAD)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(events(response)[-1]['type'], 'result')
        self.assertEqual(events(response)[-1]['mode'], 'mock')

    def test_missing_key_fails_without_silent_mock_fallback(self):
        with patch.dict(os.environ, {"DEVBRIEF_MODE": "live", "LLM_API_KEY": ""}):
            response = self.client.post('/api/briefs/stream', json=PAYLOAD)
        self.assertEqual(response.status_code, 503)

    def test_invalid_template_and_whitespace(self):
        for payload in [dict(PAYLOAD, template='other'), dict(PAYLOAD, source=' ' * 20)]:
            self.assertEqual(self.client.post('/api/briefs/stream', json=payload).status_code, 422)

    def test_actual_body_limit(self):
        self.assertEqual(self.client.post('/api/briefs/stream', content=b'x' * 100001).status_code, 413)

    def test_provider_stream_is_validated_before_success(self):
        brief = demo_brief(PAYLOAD['source'], '', 'incident')
        data = json.dumps(brief, ensure_ascii=False)
        wire = ''.join('data: ' + json.dumps({"choices": [{"delta": {"content": chunk}}]}, ensure_ascii=False) + '\n\n' for chunk in [data[:17], data[17:]]) + 'data: [DONE]\n\n'
        transport = httpx.MockTransport(lambda req: httpx.Response(200, text=wire))
        with patch.dict(os.environ, {"DEVBRIEF_MODE": "live", "LLM_API_KEY": "test-only"}), patch('backend.main.httpx.AsyncClient', side_effect=lambda **kw: AsyncClient(transport=transport, **kw)):
            response = self.client.post('/api/briefs/stream', json=PAYLOAD)
        self.assertEqual(events(response)[-1]['brief'], brief)

    def test_incomplete_model_output_never_becomes_result(self):
        for wire in ['data: {"choices":[{"delta":{"content":"{}"}}]}\n\n', 'data: [DONE]\n\n']:
            transport = httpx.MockTransport(lambda req: httpx.Response(200, text=wire))
            with patch.dict(os.environ, {"DEVBRIEF_MODE": "live", "LLM_API_KEY": "test-only"}), patch('backend.main.httpx.AsyncClient', side_effect=lambda **kw: AsyncClient(transport=transport, **kw)):
                response = self.client.post('/api/briefs/stream', json=PAYLOAD)
            self.assertEqual(events(response)[-1]['type'], 'error')
            self.assertFalse(any(event['type'] == 'result' for event in events(response)))

    def test_upstream_limit_does_not_expose_body(self):
        transport = httpx.MockTransport(lambda req: httpx.Response(429, text='internal-secret'))
        with patch.dict(os.environ, {"DEVBRIEF_MODE": "live", "LLM_API_KEY": "test-only"}), patch('backend.main.httpx.AsyncClient', side_effect=lambda **kw: AsyncClient(transport=transport, **kw)):
            response = self.client.post('/api/briefs/stream', json=PAYLOAD)
        self.assertIn('限流', response.text)
        self.assertNotIn('internal-secret', response.text)


if __name__ == '__main__':
    unittest.main()
