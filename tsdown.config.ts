/**
 * Standalone tsdown config for dsh-skills-mcp-cli-manager.
 *
 * The repository only ships src/ + the built lib/, so this reconstructs the
 * two-half build the bundle needs: the Host node half (lib/index.js) and the
 * browser client half (lib/client.js) wrapped for the dsh client module loader
 * (__ModuleLoader__.load) with CSS Modules inlined at `[hash]_[local]`.
 *
 * Externalized (never bundled):
 *  - Host: node builtins + @deepseek-ai/dsh-settings, schemastery,
 *          @deepseek-ai/dsh-mcp-client (the real value imports the node half
 *          resolves from a real install).
 *  - Client: react, react-dom (module-table rows; everything else inlines).
 *
 * Type-only @deepseek-ai/* imports are erased by the compiler and never reach
 * the bundle. The CSS plugin mirrors the dsh client preset (lightningcss,
 * `[hash]_[local]` class map export, data-plugin-css style injection) so the
 * emitted card styles match the convention the web shell loads.
 */
import { readFile } from 'node:fs/promises'
import { isBuiltin } from 'node:module'
import { basename, dirname, resolve } from 'node:path'
import type { UserConfig } from 'tsdown'
import { transform } from 'lightningcss'

const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'
const NODE_EXTERNALS = [
  '@deepseek-ai/dsh-settings',
  '@deepseek-ai/dsh-mcp-client',
  'schemastery',
]
const CLIENT_EXTERNALS = ['react', 'react-dom']

/** External when it is a node builtin or a named value dependency. */
function isHostExternal(specifier: string): boolean {
  if (isBuiltin(specifier)) return true
  return NODE_EXTERNALS.some((name) => specifier === name || specifier.startsWith(name + '/'))
}

function isClientExternal(specifier: string): boolean {
  return CLIENT_EXTERNALS.some((name) => specifier === name || specifier.startsWith(name + '/'))
}

/** Emit a style injector module (guarded insert) plus an optional CSS Modules map. */
function styleInjectionModule(
  id: string,
  fileId: string,
  css: string,
  classMap?: Readonly<Record<string, string>>,
): string {
  const source = [
    `const css = ${JSON.stringify(css)};`,
    `const tagId = ${JSON.stringify(`${id}/${basename(fileId)}`)};`,
    'if (typeof document !== \'undefined\' && document.querySelector(\'style[data-plugin-css=\' + JSON.stringify(tagId) + \']\') === null) {',
    '  const tag = document.createElement(\'style\');',
    `  tag.dataset.plugin = ${JSON.stringify(id)};`,
    '  tag.dataset.pluginCss = tagId;',
    '  tag.textContent = css;',
    '  document.head.appendChild(tag);',
    '}',
  ]
  source.push(classMap === undefined ? 'export {};' : `export default ${JSON.stringify(classMap)};`)
  return source.join('\n')
}

/** Resolve a stylesheet import against the importing module's source dir. */
function stylesheetSourcePath(source: string, importer: string): string {
  return resolve(dirname(importer), source)
}

/** CSS Modules + plain css handling for the client half (mirrors the dsh preset). */
function cssInlinePlugin(id: string): UserConfig['plugins'] {
  return [{
    name: 'dsh-css-modules-inline',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith('.module.css')) return null
      const abs = importer !== undefined ? stylesheetSourcePath(source, importer) : source
      return CSS_VIRTUAL_PREFIX + abs + CSS_VIRTUAL_SUFFIX
    },
    async load(virtualId: string) {
      if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
      const fileId = virtualId.slice(CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length)
      this.addWatchFile(fileId)
      const source = await readFile(fileId)
      const { code, exports: cssExports } = transform({
        filename: fileId,
        code: source,
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classMap: Record<string, string> = {}
      const entries = Object.entries(cssExports ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      for (const [local, exp] of entries) classMap[local] = exp.name
      return styleInjectionModule(id, fileId, code.toString(), classMap)
    },
  }]
}

/** Host node half: bundle src/index.ts → lib/index.js (ESM). */
function hostConfig(id: string): UserConfig {
  return {
    name: id,
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    deps: {
      neverBundle: isHostExternal,
      alwaysBundle: (specifier: string) => !isHostExternal(specifier),
    },
  }
}

/** Browser client half: bundle src/client/index.ts → lib/client.js (CJS + loader wrap). */
function clientConfig(id: string): UserConfig {
  return {
    name: `${id}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    sourcemap: true,
    deps: {
      neverBundle: isClientExternal,
      alwaysBundle: (specifier: string) => !isClientExternal(specifier),
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    },
    plugins: cssInlinePlugin(id),
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  }
}

const ID = 'dsh-skills-mcp-cli-manager'

/** tsdown entry: build both halves in one run (single default face). */
export default (_inlineConfig: Pick<UserConfig, 'env'>): UserConfig[] => {
  return [hostConfig(ID), clientConfig(ID)]
}
