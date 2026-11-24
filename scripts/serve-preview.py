"""Serve the built workbench in demo mode, with Python's standard library."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import webbrowser

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=2048)
parser.add_argument('--open', action='store_true')
args = parser.parse_args()
directory = Path(__file__).resolve().parents[1] / 'preview'
if not (directory / 'index.html').is_file():
    raise SystemExit('预览尚未构建，请先运行 pnpm build:preview')
url = f'http://127.0.0.1:{args.port}'
try:
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(SimpleHTTPRequestHandler, directory=str(directory)))
except OSError as exc:
    raise SystemExit(f'无法启动本地预览：{exc}。也可以直接打开 DevBrief-preview.html。') from exc
print(f'DevBrief 规则演示：{url}\n按 Ctrl+C 停止。', flush=True)
if args.open:
    webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    print('\n已停止。')
