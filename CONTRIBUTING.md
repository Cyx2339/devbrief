# 参与改进

欢迎提交可复现的问题和范围明确的改进。较大的功能或架构调整，建议先通过 Issue 说明使用场景与拟议方案。

## 本地开发

前端与后端的安装、启动方式见 [README](README.md)。工单模块在 `src/features/devbrief/`，页面位于 `src/views/devbrief.vue`，模型网关位于 `backend/`。

修改时保持输入、通信、解析、编辑和保存的职责分开。规则演示与真实模型结果应继续明确区分。

## 验证

```bash
pnpm test
pnpm typecheck:brief
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

修改界面时检查桌面和窄屏布局；修改通信时覆盖错误、中断和停止场景。若改变生成预览涉及的源码，运行 `pnpm build:preview` 更新随包预览。提交说明应列出实际执行的检查和未验证部分。

## 提交改进

- 一个变更解决一个清楚的问题，说明之前与之后的行为。
- 新增行为、配置或接口变动时同步更新文档。
- 保留上游和第三方来源说明。
- 不提交模型密钥、真实客户记录、依赖目录或虚拟环境。

项目的当前验证范围见 [验证记录](docs/VALIDATION.md)。
