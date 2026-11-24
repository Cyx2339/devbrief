// Build just the new workbench with Vue's official SFC compiler. This preview
// deliberately does not claim to verify the upstream chat's third-party stack.
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const compiler = process.env.DEVBRIEF_COMPILER_PATH
  ? await import(pathToFileURL(process.env.DEVBRIEF_COMPILER_PATH))
  : await import('@vue/compiler-sfc')
const ts = process.env.DEVBRIEF_TYPESCRIPT_PATH
  ? require(process.env.DEVBRIEF_TYPESCRIPT_PATH)
  : require('typescript')
const vuePath = process.env.DEVBRIEF_VUE_PATH || require.resolve('vue/dist/vue.runtime.esm-browser.prod.js')
const target = path.join(root, 'preview')
await fs.mkdir(path.join(target, 'assets/features'), { recursive: true })

const source = await fs.readFile(path.join(root, 'src/views/devbrief.vue'), 'utf8')
const { descriptor, errors } = compiler.parse(source)
if (errors.length) throw new Error(errors.join('\n'))
const compiled = compiler.compileScript(descriptor, {
  id: 'devbrief-workbench', inlineTemplate: true,
  templateOptions: { isProd: true }
})
function transpile(text, fileName) {
  const result = ts.transpileModule(text, {
    fileName,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve },
    reportDiagnostics: true
  })
  const errors = (result.diagnostics || []).filter(item => item.category === ts.DiagnosticCategory.Error)
  if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, {
    getCurrentDirectory: () => root, getCanonicalFileName: value => value, getNewLine: () => '\n'
  }))
  return result.outputText
}
const script = transpile(compiled.content, 'devbrief.tsx').replace(/(['"])@\/features\/devbrief\/([^'"]+)\1/g, (_match, quote, name) => `${quote}./features/${name}.js${quote}`)
await fs.writeFile(path.join(target, 'assets/Workbench.js'), script)
for (const file of await fs.readdir(path.join(root, 'src/features/devbrief'))) {
  if (!file.endsWith('.ts')) continue
  const text = await fs.readFile(path.join(root, 'src/features/devbrief', file), 'utf8')
  await fs.writeFile(path.join(target, 'assets/features', file.replace(/\.ts$/, '.js')), transpile(text, file).replace(/(from\s+['"]\.\/[^'"]+)\.ts(['"])/g, '$1.js$2'))
}
// This feature stylesheet uses CSS-native nesting; it needs no Sass runtime.
const css = await fs.readFile(path.join(root, 'src/styles/devbrief.scss'), 'utf8')
await fs.writeFile(path.join(target, 'assets/style.css'), 'body{margin:0}h1,h2,h3,p{margin:0}a{text-decoration:none}\n' + css)
await fs.copyFile(vuePath, path.join(target, 'assets/vue.js'))
await fs.copyFile(path.join(path.dirname(vuePath), '../LICENSE'), path.join(target, 'assets/VUE-LICENSE'))
await fs.writeFile(path.join(target, 'assets/main.js'), `import {createApp,h} from 'vue';
import Workbench from './Workbench.js';
const app=createApp(Workbench);
app.component('RouterLink',{props:['to'],setup(props,{slots}){return()=>h('a',{href:'https://pdsuwwz.github.io/chatgpt-vue3-light-mvp/',target:'_blank',rel:'noopener noreferrer'},slots.default?.())}});
app.mount('#app');\n`)
await fs.writeFile(path.join(target, 'index.html'), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DevBrief · 工单整理工作台</title><link rel="stylesheet" href="assets/style.css"><script type="importmap">{"imports":{"vue":"./assets/vue.js"}}</script></head><body><div id="app"></div><script type="module" src="assets/main.js"></script></body></html>`)

// Single-file demo for environments where a local HTTP listener is unavailable.
// This uses the same compiled component and domain modules as the served preview.
const runtime = await fs.readFile(vuePath, 'utf8')
const exportMatch = runtime.match(/export\s*\{([^}]+)\};?\s*$/)
if (!exportMatch) throw new Error('Vue runtime export format changed')
const exposed = exportMatch[1].split(',').map(item => {
  const [local, publicName] = item.trim().split(/\s+as\s+/)
  return publicName ? `${publicName}:${local}` : local
}).join(',')
const runtimeBody = runtime.slice(0, exportMatch.index)
let bundled = `const Vue=(()=>{${runtimeBody}\nreturn {${exposed}};})();\n`
const stripModule = text => text.replace(/^import\b[\s\S]*?from\s*['"][^'"]+['"];?\s*/gm, '').replace(/^export /gm, '')
for (const file of ['types', 'templates', 'domain', 'stream', 'client', 'history']) {
  bundled += '\n' + stripModule(await fs.readFile(path.join(target, 'assets/features', file + '.js'), 'utf8'))
}
bundled += '\n' + script.replace(/import\s*\{([^}]+)\}\s*from\s*['"]vue['"];?/g, (_match, imports) => 'const {' + imports.replace(/\s+as\s+/g, ':') + '} = Vue;').replace(/^import\b[\s\S]*?from\s*['"][^'"]+['"];?\s*/gm, '').replace('export default', 'const Workbench =')
bundled += `\nconst app=Vue.createApp(Workbench);app.component('RouterLink',{props:['to'],setup(props,{slots}){return()=>Vue.h('a',{href:'https://pdsuwwz.github.io/chatgpt-vue3-light-mvp/',target:'_blank',rel:'noopener noreferrer'},slots.default?.())}});app.mount('#app');`
const resetCSS = 'body{margin:0}h1,h2,h3,p{margin:0}a{text-decoration:none}'
await fs.writeFile(path.join(root, 'DevBrief-preview.html'), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DevBrief · 工单整理工作台</title><style>${resetCSS + css}</style></head><body><div id="app"></div><script>${bundled.replace(/<\/script/gi, '<\\/script')}</script></body></html>`)
console.log('Workbench preview built:', target)
