import { defineComponent as _defineComponent } from 'vue';
import { createElementVNode as _createElementVNode, createTextVNode as _createTextVNode, withModifiers as _withModifiers, toDisplayString as _toDisplayString, unref as _unref, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, renderList as _renderList, Fragment as _Fragment, normalizeClass as _normalizeClass, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, vModelSelect as _vModelSelect, withDirectives as _withDirectives, vModelText as _vModelText, createStaticVNode as _createStaticVNode } from "vue";
const _hoisted_1 = ["disabled"];
const _hoisted_2 = { class: "db-history-head" };
const _hoisted_3 = {
    class: "db-history",
    "aria-label": "历史记录"
};
const _hoisted_4 = {
    key: 0,
    class: "db-history-empty"
};
const _hoisted_5 = ["disabled", "onClick"];
const _hoisted_6 = { class: "db-history-title" };
const _hoisted_7 = ["aria-label", "disabled", "onClick"];
const _hoisted_8 = { class: "db-main" };
const _hoisted_9 = { class: "db-topbar" };
const _hoisted_10 = ["aria-expanded"];
const _hoisted_11 = { class: "db-workspace" };
const _hoisted_12 = { class: "db-heading" };
const _hoisted_13 = { class: "db-mode" };
const _hoisted_14 = ["disabled"];
const _hoisted_15 = { class: "db-columns" };
const _hoisted_16 = {
    class: "db-source-panel",
    "aria-labelledby": "db-input-heading"
};
const _hoisted_17 = {
    class: "db-template-tabs",
    "aria-label": "整理模板"
};
const _hoisted_18 = ["aria-pressed", "disabled", "onClick"];
const _hoisted_19 = { class: "db-template-description" };
const _hoisted_20 = { class: "db-source-label" };
const _hoisted_21 = ["disabled"];
const _hoisted_22 = ["maxlength", "disabled"];
const _hoisted_23 = { class: "db-input-foot" };
const _hoisted_24 = { class: "db-context" };
const _hoisted_25 = ["disabled"];
const _hoisted_26 = {
    key: 0,
    class: "db-error",
    role: "alert"
};
const _hoisted_27 = { class: "db-generate-row" };
const _hoisted_28 = { class: "db-mode-note" };
const _hoisted_29 = {
    class: "db-result-panel",
    "aria-labelledby": "db-output-heading"
};
const _hoisted_30 = { class: "db-panel-heading" };
const _hoisted_31 = { class: "db-panel-meta" };
const _hoisted_32 = {
    key: 0,
    class: "db-loading-track"
};
const _hoisted_33 = {
    key: 1,
    class: "db-output-tags"
};
const _hoisted_34 = {
    key: 1,
    class: "db-draft"
};
const _hoisted_35 = { class: "db-draft-toolbar" };
const _hoisted_36 = { class: "db-draft-status" };
const _hoisted_37 = { class: "db-draft-editor" };
const _hoisted_38 = ["for"];
const _hoisted_39 = ["id", "value", "rows", "onInput"];
const _hoisted_40 = { class: "db-draft-footer" };
const _hoisted_41 = {
    key: 0,
    class: "db-toast",
    role: "status"
};
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { generateBrief } from './features/client.js';
import { exportName, isBrief, sectionLabels, toMarkdown, validateInput } from './features/domain.js';
import { readHistory, writeHistory } from './features/history.js';
import { templates } from './features/templates.js';
import { HISTORY_LIMIT, SOURCE_LIMIT } from './features/types.js';
export default /*@__PURE__*/ _defineComponent({
    setup(__props) {
        const input = reactive({ template: 'incident', source: '', environment: '' });
        const mode = ref('demo');
        const filePreview = location.protocol === 'file:';
        const state = ref('idle');
        const result = ref(null);
        const history = ref([]);
        const activeId = ref(null);
        const status = ref('');
        const error = ref('');
        const notice = ref('');
        const saved = ref(true);
        const showHistory = ref(false);
        const resultMode = ref('demo');
        let controller = null;
        let saveTimer;
        let noticeTimer;
        const busy = computed(() => state.value === 'generating');
        const currentTemplate = computed(() => templates.find(item => item.id === input.template));
        const sections = Object.entries(sectionLabels);
        try {
            history.value = readHistory();
        }
        catch {
            error.value = '无法读取本地历史。你仍可整理内容，原有数据未被覆盖。';
        }
        // Do not overwrite unreadable data automatically; users may still export the current draft.
        const historyReadable = ref(!error.value);
        function toast(message) {
            notice.value = message;
            clearTimeout(noticeTimer);
            noticeTimer = setTimeout(() => { notice.value = ''; }, 3000);
        }
        function persist() {
            if (!historyReadable.value) {
                saved.value = false;
                return;
            }
            try {
                writeHistory(history.value);
                saved.value = true;
            }
            catch {
                saved.value = false;
                error.value = '浏览器未能保存历史，请及时导出当前草稿。';
            }
        }
        function saveEdits() {
            if (!activeId.value || !result.value)
                return;
            if (!isBrief(result.value)) {
                saved.value = false;
                return;
            }
            const entry = history.value.find(item => item.id === activeId.value);
            if (entry) {
                entry.brief = JSON.parse(JSON.stringify(result.value));
                entry.updatedAt = new Date().toISOString();
                persist();
            }
        }
        watch(result, () => {
            if (!activeId.value || !result.value || busy.value)
                return;
            saved.value = false;
            clearTimeout(saveTimer);
            saveTimer = setTimeout(saveEdits, 350);
        }, { deep: true });
        function reset() {
            if (busy.value)
                return;
            clearTimeout(saveTimer);
            saveEdits();
            activeId.value = null;
            result.value = null;
            input.source = '';
            input.environment = '';
            state.value = 'idle';
            error.value = '';
            status.value = '';
            showHistory.value = false;
        }
        function selectTemplate(id) {
            if (busy.value)
                return;
            input.template = id;
        }
        function useExample() {
            input.source = currentTemplate.value.example;
            error.value = '';
        }
        async function submit() {
            if (busy.value)
                return;
            const invalid = validateInput(input);
            if (invalid) {
                error.value = invalid;
                return;
            }
            clearTimeout(saveTimer);
            saveEdits();
            const requestInput = { ...input };
            const requestMode = mode.value;
            let actualMode = requestMode;
            const runController = new AbortController();
            controller = runController;
            activeId.value = null;
            result.value = null;
            state.value = 'generating';
            status.value = '正在准备整理…';
            error.value = '';
            try {
                const brief = await generateBrief(requestInput, requestMode, runController.signal, (event) => {
                    if (event.type === 'status')
                        status.value = event.message;
                    if (event.type === 'delta')
                        status.value = '正在生成草稿，完成后即可编辑…';
                    if (event.type === 'result' && event.mode === 'mock')
                        actualMode = 'demo';
                });
                if (runController.signal.aborted)
                    throw new DOMException('Aborted', 'AbortError');
                const now = new Date().toISOString();
                const entry = {
                    id: crypto.randomUUID(), createdAt: now, updatedAt: now,
                    mode: actualMode, input: requestInput, brief
                };
                history.value = [entry, ...history.value].slice(0, HISTORY_LIMIT);
                result.value = JSON.parse(JSON.stringify(brief));
                resultMode.value = actualMode;
                activeId.value = entry.id;
                state.value = 'completed';
                status.value = '';
                persist();
            }
            catch (cause) {
                if (runController.signal.aborted) {
                    state.value = 'stopped';
                    status.value = '已停止生成。你可以调整内容后重新整理。';
                }
                else {
                    state.value = 'failed';
                    error.value = cause instanceof Error ? cause.message : '生成失败，请重试。';
                }
            }
            finally {
                if (controller === runController)
                    controller = null;
            }
        }
        function stop() { controller?.abort(); }
        function openEntry(entry) {
            if (busy.value)
                return;
            clearTimeout(saveTimer);
            saveEdits();
            Object.assign(input, entry.input);
            mode.value = entry.mode;
            resultMode.value = entry.mode;
            result.value = JSON.parse(JSON.stringify(entry.brief));
            activeId.value = entry.id;
            state.value = 'completed';
            error.value = '';
            status.value = '';
            saved.value = true;
            showHistory.value = false;
        }
        function deleteEntry(id) {
            if (busy.value)
                return;
            clearTimeout(saveTimer);
            history.value = history.value.filter(entry => entry.id !== id);
            if (activeId.value === id) {
                activeId.value = null;
                result.value = null;
                state.value = 'idle';
            }
            persist();
            toast('已删除这条本地记录');
        }
        function editLines(key, event) {
            if (!result.value)
                return;
            result.value[key] = event.target.value.split('\n');
        }
        async function copy() {
            if (!result.value)
                return;
            try {
                await navigator.clipboard.writeText(toMarkdown(result.value, resultMode.value));
                toast('已复制为 Markdown');
            }
            catch {
                toast('浏览器未允许复制，请使用“导出文件”。');
            }
        }
        function download() {
            if (!result.value)
                return;
            const url = URL.createObjectURL(new Blob([toMarkdown(result.value, resultMode.value)], { type: 'text/markdown;charset=utf-8' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = exportName(result.value.title);
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            toast('已导出当前编辑内容');
        }
        function shortcut(event) {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                void submit();
            }
        }
        const formatTime = (value) => new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        onBeforeUnmount(() => {
            controller?.abort();
            clearTimeout(saveTimer);
            clearTimeout(noticeTimer);
            saveEdits();
        });
        return (_ctx, _cache) => {
            const _component_RouterLink = _resolveComponent("RouterLink");
            return (_openBlock(), _createElementBlock("div", {
                class: "db-app",
                onKeydown: shortcut
            }, [
                _createElementVNode("aside", {
                    class: _normalizeClass(["db-sidebar", { 'is-open': showHistory.value }]),
                    "aria-label": "工作台导航与历史"
                }, [
                    _createElementVNode("a", {
                        class: "db-brand",
                        href: "#",
                        onClick: _withModifiers(reset, ["prevent"])
                    }, [...(_cache[6] || (_cache[6] = [
                            _createElementVNode("span", { class: "db-logomark" }, [
                                _createTextVNode("db"),
                                _createElementVNode("span", null, "↗")
                            ], -1 /* CACHED */),
                            _createElementVNode("span", null, [
                                _createTextVNode("DevBrief"),
                                _createElementVNode("small", null, "从沟通，到行动")
                            ], -1 /* CACHED */)
                        ]))]),
                    _createElementVNode("button", {
                        class: "db-new",
                        type: "button",
                        disabled: busy.value,
                        onClick: reset
                    }, [...(_cache[7] || (_cache[7] = [
                            _createElementVNode("span", null, "＋", -1 /* CACHED */),
                            _createTextVNode(" 新建工单 ", -1 /* CACHED */),
                            _createElementVNode("span", { class: "db-new-arrow" }, "↗", -1 /* CACHED */)
                        ]))], 8 /* PROPS */, _hoisted_1),
                    _createElementVNode("div", _hoisted_2, [
                        _cache[8] || (_cache[8] = _createElementVNode("span", null, "最近整理", -1 /* CACHED */)),
                        _createElementVNode("span", null, _toDisplayString(history.value.length) + " / " + _toDisplayString(_unref(HISTORY_LIMIT)), 1 /* TEXT */)
                    ]),
                    _createElementVNode("nav", _hoisted_3, [
                        (!history.value.length)
                            ? (_openBlock(), _createElementBlock("div", _hoisted_4, [...(_cache[9] || (_cache[9] = [
                                    _createTextVNode("让第一条清晰的工单，", -1 /* CACHED */),
                                    _createElementVNode("br", null, null, -1 /* CACHED */),
                                    _createTextVNode("从这里开始。", -1 /* CACHED */)
                                ]))]))
                            : _createCommentVNode("v-if", true),
                        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(history.value, (entry) => {
                            return (_openBlock(), _createElementBlock("div", {
                                key: entry.id,
                                class: _normalizeClass(["db-history-row", { 'is-active': entry.id === activeId.value }])
                            }, [
                                _createElementVNode("button", {
                                    class: "db-history-item",
                                    type: "button",
                                    disabled: busy.value,
                                    onClick: ($event) => (openEntry(entry))
                                }, [
                                    _cache[10] || (_cache[10] = _createElementVNode("span", { class: "db-history-icon" }, "▤", -1 /* CACHED */)),
                                    _createElementVNode("span", _hoisted_6, [
                                        _createTextVNode(_toDisplayString(entry.brief.title), 1 /* TEXT */),
                                        _createElementVNode("small", null, _toDisplayString(formatTime(entry.createdAt)) + " · " + _toDisplayString(entry.mode === 'demo' ? '规则演示' : 'AI 草稿'), 1 /* TEXT */)
                                    ])
                                ], 8 /* PROPS */, _hoisted_5),
                                _createElementVNode("button", {
                                    class: "db-delete",
                                    type: "button",
                                    "aria-label": `删除记录：${entry.brief.title}`,
                                    disabled: busy.value,
                                    onClick: ($event) => (deleteEntry(entry.id))
                                }, "×", 8 /* PROPS */, _hoisted_7)
                            ], 2 /* CLASS */));
                        }), 128 /* KEYED_FRAGMENT */))
                    ]),
                    _cache[11] || (_cache[11] = _createElementVNode("div", { class: "db-sidebar-bottom" }, [
                        _createElementVNode("p", null, [
                            _createElementVNode("span", { class: "db-local-dot" }),
                            _createTextVNode(" 记录保存在当前浏览器")
                        ]),
                        _createElementVNode("a", {
                            href: "https://github.com/pdsuwwz/chatgpt-vue3-light-mvp",
                            target: "_blank",
                            rel: "noopener noreferrer"
                        }, "基于开源项目构建 ↗"),
                        _createElementVNode("div", { class: "db-profile" }, [
                            _createElementVNode("span", null, "CY"),
                            _createElementVNode("div", null, [
                                _createTextVNode("程宇唏的工作台"),
                                _createElementVNode("small", null, "DevBrief · v0.1")
                            ])
                        ])
                    ], -1 /* CACHED */))
                ], 2 /* CLASS */),
                _createElementVNode("div", _hoisted_8, [
                    _createElementVNode("header", _hoisted_9, [
                        _createElementVNode("div", null, [
                            _createElementVNode("button", {
                                class: "db-mobile-menu",
                                type: "button",
                                "aria-expanded": showHistory.value,
                                onClick: _cache[0] || (_cache[0] = ($event) => (showHistory.value = !showHistory.value))
                            }, "☰ 历史", 8 /* PROPS */, _hoisted_10),
                            _cache[12] || (_cache[12] = _createElementVNode("span", { class: "db-breadcrumb" }, [
                                _createTextVNode("个人工作台 "),
                                _createElementVNode("span", null, "/"),
                                _createTextVNode(" 工单整理")
                            ], -1 /* CACHED */))
                        ]),
                        _createVNode(_component_RouterLink, {
                            to: "/chat",
                            class: "db-text-link"
                        }, {
                            default: _withCtx(() => [...(_cache[13] || (_cache[13] = [
                                    _createTextVNode("原版对话 ↗", -1 /* CACHED */)
                                ]))]),
                            _: 1 /* STABLE */
                        })
                    ]),
                    _createElementVNode("main", _hoisted_11, [
                        _createElementVNode("div", _hoisted_12, [
                            _cache[16] || (_cache[16] = _createElementVNode("div", null, [
                                _createElementVNode("div", { class: "db-eyebrow" }, [
                                    _createElementVNode("span"),
                                    _createTextVNode(" THINK CLEAR. BUILD BETTER.")
                                ]),
                                _createElementVNode("h1", null, [
                                    _createTextVNode("把零散沟通，"),
                                    _createElementVNode("span", null, "整理成行动。")
                                ]),
                                _createElementVNode("p", null, "留住事实，补齐问题，让下一步更清楚。")
                            ], -1 /* CACHED */)),
                            _createElementVNode("div", _hoisted_13, [
                                _cache[15] || (_cache[15] = _createElementVNode("label", { for: "db-mode-select" }, "生成方式", -1 /* CACHED */)),
                                _withDirectives(_createElementVNode("select", {
                                    id: "db-mode-select",
                                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => ((mode).value = $event)),
                                    disabled: busy.value
                                }, [
                                    _cache[14] || (_cache[14] = _createElementVNode("option", { value: "demo" }, "规则演示 · 无需密钥", -1 /* CACHED */)),
                                    _createElementVNode("option", {
                                        value: "service",
                                        disabled: filePreview
                                    }, _toDisplayString(filePreview ? 'AI 服务 · 需启动后端' : 'AI 服务 · 后端调用'), 1 /* TEXT */)
                                ], 8 /* PROPS */, _hoisted_14), [
                                    [_vModelSelect, mode.value]
                                ])
                            ])
                        ]),
                        _createElementVNode("div", _hoisted_15, [
                            _createElementVNode("section", _hoisted_16, [
                                _cache[24] || (_cache[24] = _createElementVNode("div", { class: "db-panel-heading" }, [
                                    _createElementVNode("span", { class: "db-step" }, "01"),
                                    _createElementVNode("h2", { id: "db-input-heading" }, "放入原始内容"),
                                    _createElementVNode("span", { class: "db-panel-meta" }, "INPUT")
                                ], -1 /* CACHED */)),
                                _createElementVNode("div", _hoisted_17, [
                                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_unref(templates), (template, index) => {
                                        return (_openBlock(), _createElementBlock("button", {
                                            key: template.id,
                                            type: "button",
                                            class: _normalizeClass({ 'is-selected': input.template === template.id }),
                                            "aria-pressed": input.template === template.id,
                                            disabled: busy.value,
                                            onClick: ($event) => (selectTemplate(template.id))
                                        }, [
                                            _createElementVNode("small", null, "0" + _toDisplayString(index + 1), 1 /* TEXT */),
                                            _createTextVNode(_toDisplayString(template.name), 1 /* TEXT */)
                                        ], 10 /* CLASS, PROPS */, _hoisted_18));
                                    }), 128 /* KEYED_FRAGMENT */))
                                ]),
                                _createElementVNode("p", _hoisted_19, _toDisplayString(currentTemplate.value.description), 1 /* TEXT */),
                                _createElementVNode("div", _hoisted_20, [
                                    _cache[17] || (_cache[17] = _createElementVNode("label", { for: "db-source" }, "沟通记录 / 问题描述", -1 /* CACHED */)),
                                    _createElementVNode("button", {
                                        type: "button",
                                        disabled: busy.value,
                                        onClick: useExample
                                    }, "试试示例 ↗", 8 /* PROPS */, _hoisted_21)
                                ]),
                                _withDirectives(_createElementVNode("textarea", {
                                    id: "db-source",
                                    "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => ((input.source) = $event)),
                                    maxlength: _unref(SOURCE_LIMIT),
                                    disabled: busy.value,
                                    placeholder: '直接粘贴客户反馈、需求讨论或会议记录。\n\n不必事先整理，保留原始描述即可。',
                                    spellcheck: "false"
                                }, null, 8 /* PROPS */, _hoisted_22), [
                                    [_vModelText, input.source]
                                ]),
                                _createElementVNode("div", _hoisted_23, [
                                    _cache[18] || (_cache[18] = _createElementVNode("span", null, "支持纯文本 · 建议先移除敏感信息", -1 /* CACHED */)),
                                    _createElementVNode("span", null, _toDisplayString(input.source.length.toLocaleString()) + " / " + _toDisplayString(_unref(SOURCE_LIMIT).toLocaleString()), 1 /* TEXT */)
                                ]),
                                _createElementVNode("details", _hoisted_24, [
                                    _cache[19] || (_cache[19] = _createElementVNode("summary", null, [
                                        _createTextVNode("补充背景 "),
                                        _createElementVNode("span", null, "可选"),
                                        _createElementVNode("b", null, "＋")
                                    ], -1 /* CACHED */)),
                                    _cache[20] || (_cache[20] = _createElementVNode("label", { for: "db-environment" }, "系统环境、业务背景或限制条件", -1 /* CACHED */)),
                                    _withDirectives(_createElementVNode("textarea", {
                                        id: "db-environment",
                                        "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => ((input.environment) = $event)),
                                        disabled: busy.value,
                                        maxlength: "500",
                                        rows: "3",
                                        placeholder: "例如：Vue 3 管理后台，Chrome 浏览器，使用本地打印服务。"
                                    }, null, 8 /* PROPS */, _hoisted_25), [
                                        [_vModelText, input.environment]
                                    ])
                                ]),
                                (error.value)
                                    ? (_openBlock(), _createElementBlock("div", _hoisted_26, _toDisplayString(error.value), 1 /* TEXT */))
                                    : _createCommentVNode("v-if", true),
                                _createElementVNode("div", _hoisted_27, [
                                    (busy.value)
                                        ? (_openBlock(), _createElementBlock("button", {
                                            key: 0,
                                            class: "db-primary db-stop",
                                            type: "button",
                                            onClick: stop
                                        }, [...(_cache[21] || (_cache[21] = [
                                                _createElementVNode("span", { class: "db-spinner" }, null, -1 /* CACHED */),
                                                _createTextVNode(" 停止生成 ", -1 /* CACHED */),
                                                _createElementVNode("span", null, "■", -1 /* CACHED */)
                                            ]))]))
                                        : (_openBlock(), _createElementBlock("button", {
                                            key: 1,
                                            class: "db-primary",
                                            type: "button",
                                            onClick: submit
                                        }, [...(_cache[22] || (_cache[22] = [
                                                _createTextVNode("整理成工单 ", -1 /* CACHED */),
                                                _createElementVNode("span", null, "↗", -1 /* CACHED */)
                                            ]))])),
                                    _cache[23] || (_cache[23] = _createElementVNode("span", { class: "db-shortcut" }, "⌘ / Ctrl + Enter", -1 /* CACHED */))
                                ]),
                                _createElementVNode("p", _hoisted_28, _toDisplayString(mode.value === 'demo' ? '当前使用规则演示，事实摘录自输入内容；建议供体验流程。' : '内容将发送至你配置的模型服务，生成结果需要人工核对。'), 1 /* TEXT */)
                            ]),
                            _createElementVNode("section", _hoisted_29, [
                                _createElementVNode("div", _hoisted_30, [
                                    _cache[25] || (_cache[25] = _createElementVNode("span", { class: "db-step" }, "02", -1 /* CACHED */)),
                                    _cache[26] || (_cache[26] = _createElementVNode("h2", { id: "db-output-heading" }, "得到清晰草稿", -1 /* CACHED */)),
                                    _createElementVNode("span", _hoisted_31, _toDisplayString(result.value ? '可直接编辑' : 'OUTPUT'), 1 /* TEXT */)
                                ]),
                                (!result.value)
                                    ? (_openBlock(), _createElementBlock("div", {
                                        key: 0,
                                        class: _normalizeClass(["db-output-empty", { 'is-generating': busy.value }]),
                                        "aria-live": "polite"
                                    }, [
                                        _cache[29] || (_cache[29] = _createStaticVNode("<div class=\"db-paper-art\" aria-hidden=\"true\"><div class=\"db-paper-top\"><span></span> <span></span></div><div class=\"db-paper-line db-paper-line-title\"></div><div class=\"db-paper-line\"></div><div class=\"db-paper-line db-paper-line-short\"></div><div class=\"db-paper-divider\"></div><div class=\"db-paper-check\">✓ <i></i></div><div class=\"db-paper-check\">✓ <i></i></div><div class=\"db-paper-check\">✓ <i></i></div><span class=\"db-paper-stamp\">↗</span></div>", 1)),
                                        _createElementVNode("h3", null, _toDisplayString(busy.value ? '正在让信息变得清晰' : state.value === 'stopped' ? '整理已暂停' : '下一步，从清晰开始'), 1 /* TEXT */),
                                        _createElementVNode("p", null, _toDisplayString(busy.value || state.value === 'stopped' ? status.value : '左侧放入内容，这里将生成可编辑的工单。'), 1 /* TEXT */),
                                        (busy.value)
                                            ? (_openBlock(), _createElementBlock("div", _hoisted_32, [...(_cache[27] || (_cache[27] = [
                                                    _createElementVNode("span", null, null, -1 /* CACHED */)
                                                ]))]))
                                            : (_openBlock(), _createElementBlock("div", _hoisted_33, [...(_cache[28] || (_cache[28] = [
                                                    _createElementVNode("span", null, "事实与建议分开", -1 /* CACHED */),
                                                    _createElementVNode("span", null, "待确认项可追踪", -1 /* CACHED */),
                                                    _createElementVNode("span", null, "Markdown 导出", -1 /* CACHED */)
                                                ]))]))
                                    ], 2 /* CLASS */))
                                    : (_openBlock(), _createElementBlock("div", _hoisted_34, [
                                        _createElementVNode("div", _hoisted_35, [
                                            _createElementVNode("span", _hoisted_36, [
                                                _cache[30] || (_cache[30] = _createElementVNode("span", null, null, -1 /* CACHED */)),
                                                _createTextVNode(" " + _toDisplayString(resultMode.value === 'demo' ? '规则演示草稿' : 'AI 辅助草稿'), 1 /* TEXT */)
                                            ]),
                                            _createElementVNode("div", null, [
                                                _createElementVNode("button", {
                                                    type: "button",
                                                    onClick: copy
                                                }, "复制"),
                                                _createElementVNode("button", {
                                                    type: "button",
                                                    onClick: download
                                                }, "导出文件 ↗")
                                            ])
                                        ]),
                                        _createElementVNode("div", _hoisted_37, [
                                            _cache[31] || (_cache[31] = _createElementVNode("label", {
                                                class: "db-field-caption",
                                                for: "db-title"
                                            }, "工单标题", -1 /* CACHED */)),
                                            _withDirectives(_createElementVNode("input", {
                                                id: "db-title",
                                                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => ((result.value.title) = $event)),
                                                maxlength: "200",
                                                class: "db-draft-title"
                                            }, null, 512 /* NEED_PATCH */), [
                                                [_vModelText, result.value.title]
                                            ]),
                                            _cache[32] || (_cache[32] = _createElementVNode("label", {
                                                class: "db-field-caption",
                                                for: "db-summary"
                                            }, "摘要", -1 /* CACHED */)),
                                            _withDirectives(_createElementVNode("textarea", {
                                                id: "db-summary",
                                                "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => ((result.value.summary) = $event)),
                                                maxlength: "4000",
                                                class: "db-summary",
                                                rows: "4"
                                            }, null, 512 /* NEED_PATCH */), [
                                                [_vModelText, result.value.summary]
                                            ]),
                                            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_unref(sections), ([key, label], index) => {
                                                return (_openBlock(), _createElementBlock("div", {
                                                    key: key,
                                                    class: "db-draft-section"
                                                }, [
                                                    _createElementVNode("label", {
                                                        for: `db-field-${key}`
                                                    }, [
                                                        _createElementVNode("span", null, "0" + _toDisplayString(index + 1), 1 /* TEXT */),
                                                        _createTextVNode(_toDisplayString(label), 1 /* TEXT */)
                                                    ], 8 /* PROPS */, _hoisted_38),
                                                    _createElementVNode("textarea", {
                                                        id: `db-field-${key}`,
                                                        value: result.value[key].join('\n'),
                                                        rows: Math.min(9, Math.max(3, result.value[key].length + 1)),
                                                        maxlength: "20000",
                                                        placeholder: "每行一项，可自由编辑",
                                                        onInput: ($event) => (editLines(key, $event))
                                                    }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_39)
                                                ]));
                                            }), 128 /* KEYED_FRAGMENT */))
                                        ]),
                                        _createElementVNode("div", _hoisted_40, [
                                            _createElementVNode("span", null, _toDisplayString(saved.value ? '✓ 已保存到本地历史' : '本地尚未保存，请及时导出'), 1 /* TEXT */),
                                            _cache[33] || (_cache[33] = _createElementVNode("span", null, "每行一项 · 编辑后自动保存", -1 /* CACHED */))
                                        ])
                                    ]))
                            ])
                        ]),
                        _cache[34] || (_cache[34] = _createElementVNode("footer", { class: "db-page-footer" }, [
                            _createElementVNode("span", null, "DEVBRIEF / MAKE THE NEXT STEP CLEAR."),
                            _createElementVNode("span", null, "保留事实，也保留你的判断。")
                        ], -1 /* CACHED */))
                    ])
                ]),
                (notice.value)
                    ? (_openBlock(), _createElementBlock("div", _hoisted_41, _toDisplayString(notice.value), 1 /* TEXT */))
                    : _createCommentVNode("v-if", true)
            ], 32 /* NEED_HYDRATION */));
        };
    }
});
