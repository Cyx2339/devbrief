# GitHub 仓库信息与首次上传

## 可直接使用的仓库信息

仓库名称：`devbrief`

About / Description：

> 基于 Vue 3 与 FastAPI 的轻量 AI 技术工单助手，将客户反馈、需求讨论和会议记录整理为可编辑草稿，支持本地历史与 Markdown 导出。

英文简介：

> A lightweight Vue 3 + FastAPI workbench that turns scattered feedback and discussions into editable technical briefs, with local history and Markdown export.

建议 Topics：

```text
vue3 typescript fastapi ai llm sse developer-tools markdown
```

Website：有真实可访问的部署地址后再填写。当前未提供线上演示地址。

## 从 ZIP 首次上传

解压源码包后，进入包含 `package.json` 与 `README.md` 的 `devbrief` 目录。上传这个目录中的文件，不要再套一层目录作为仓库根目录。

首次上传的新仓库中，README 会自动显示为首页。保留 LICENSE、NOTICE 和 docs/upstream-README.md。

若采用终端上传，先在 GitHub 创建空仓库，将以下命令中的 `YOUR_REPOSITORY_URL` 换成 GitHub 提供的实际地址：

```bash
git init -b main
git add .
git status --short
git commit -m "feat: add DevBrief workbench"
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

上述命令用于从解压目录创建自己的仓库，不是向上游提交 PR。上传前可通过 `git status --short` 核对暂存内容；`.gitignore` 已排除 `.env`、`node_modules` 和 `.venv` 等本地文件。

## 仓库链接

`package.json` 暂不填写尚未存在的个人仓库地址。创建自己的仓库后，再按实际地址补充 `repository`、`homepage` 和 `bugs`，避免将 DevBrief 的问题反馈错误指向上游。

## 截图

当前文档未附产品截图。实际运行后可补充两张真实截图：空工作台、已生成并可编辑的草稿。截图中使用示例数据，不使用客户记录或密钥。不要用示意图片代替真实运行截图。

## 当前验证状态

18项测试已通过，完整Vite构建、真实浏览器视觉验证和真实模型联调尚待完成。README和验证记录均保留了这些状态，上传仓库不等于完成上线验收。
