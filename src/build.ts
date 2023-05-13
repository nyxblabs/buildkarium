import Module from 'node:module'
import { promises as fsp } from 'node:fs'
import { basename, relative, resolve } from 'nyxpath'
import type { PackageJson } from 'pkg-def'
import color from '@nyxb/picocolors'
import { consolji } from 'consolji'
import { nyxdefaults } from 'nyxdefaults'
import { createHooks } from 'mimikrook'
import prettyBytes from 'pretty-bytes'
import { globby } from 'globby'
import { dumpObject, resolvePreset, rmdir, tryRequire } from './utils'
import type { BuildConfig, BuildContext, BuildOptions } from './types'
import { validateDependencies, validatePackage } from './validate'
import { rollupBuild } from './builder/rollup'
import { typesBuild } from './builder/typiqus'
import { mimikraBuild } from './builder/mimikra'

export async function build(
   rootDir: string,
   stub: boolean,
   inputConfig: BuildConfig = {},
) {
   // Determine rootDir
   rootDir = resolve(process.cwd(), rootDir || '.')

   // Read build.config and package.json
   const buildConfig: BuildConfig = tryRequire('./build.config', rootDir) || {}
   const pkg: PackageJson & Record<'buildkarium' | 'build', BuildConfig>
    = tryRequire('./package.json', rootDir)

   // Resolve preset
   const preset = resolvePreset(
      buildConfig.preset
      || pkg.buildkarium?.preset
      || pkg.build?.preset
      || inputConfig.preset
      || 'auto',
      rootDir,
   )

   // Merge options
   const options = nyxdefaults(
      buildConfig,
      pkg.buildkarium || pkg.build,
      inputConfig,
      preset,
    <BuildOptions>{
       name: (pkg?.name || '').split('/').pop() || 'default',
       rootDir,
       entries: [],
       clean: true,
       declaration: false,
       outDir: 'dist',
       stub,
       externals: [
          ...Module.builtinModules,
          ...Module.builtinModules.map(m => `node:${m}`),
       ],
       dependencies: [],
       devDependencies: [],
       peerDependencies: [],
       alias: {},
       replace: {},
       failOnWarn: true,
       rollup: {
          emitCJS: false,
          cjsBridge: false,
          inlineDependencies: false,
          // Plugins
          replace: {
             preventAssignment: true,
          },
          alias: {},
          resolve: {
             preferBuiltins: true,
          },
          json: {
             preferConst: true,
          },
          commonjs: {
             ignoreTryCatch: true,
          },
          esbuild: { target: 'es2020' },
          dts: {
          // https://github.com/Swatinem/rollup-plugin-dts/issues/143
             compilerOptions: { preserveSymlinks: false },
             respectExternal: true,
          },
       },
    },
   ) as BuildOptions

   // Resolve dirs relative to rootDir
   options.outDir = resolve(options.rootDir, options.outDir)

   // Build context
   const ctx: BuildContext = {
      options,
      warnings: new Set(),
      pkg,
      buildEntries: [],
      usedImports: new Set(),
      hooks: createHooks(),
   }

   // Register hooks
   if (preset.hooks)
      ctx.hooks.addHooks(preset.hooks)

   if (inputConfig.hooks)
      ctx.hooks.addHooks(inputConfig.hooks)

   if (buildConfig.hooks)
      ctx.hooks.addHooks(buildConfig.hooks)

   // Allow prepare and extending context
   await ctx.hooks.callHook('build:prepare', ctx)

   // Normalize entries
   options.entries = options.entries.map(entry =>
      typeof entry === 'string' ? { input: entry } : entry,
   )

   for (const entry of options.entries) {
      if (typeof entry.name !== 'string')
         entry.name = basename(entry.input)

      if (!entry.input)
         throw new Error(`Missing entry input: ${dumpObject(entry)}`)

      if (!entry.builder)
         entry.builder = entry.input.endsWith('/') ? 'mimikra' : 'rollup'

      if (options.declaration !== undefined && entry.declaration === undefined)
         entry.declaration = options.declaration

      entry.input = resolve(options.rootDir, entry.input)
      entry.outDir = resolve(options.rootDir, entry.outDir || options.outDir)
   }

   // Infer dependencies from pkg
   options.dependencies = Object.keys(pkg.dependencies || {})
   options.peerDependencies = Object.keys(pkg.peerDependencies || {})
   options.devDependencies = Object.keys(pkg.devDependencies || {})

   // Add all dependencies as externals
   options.externals.push(...options.dependencies, ...options.peerDependencies)

   // Call build:before
   await ctx.hooks.callHook('build:before', ctx)

   // Start info
   consolji.info(
      color.cyan(`${options.stub ? 'Stubbing' : 'Building'} ${pkg.name}`),
   )
   if (process.env.DEBUG) {
      consolji.info(`${color.bold('Root dir:')} ${options.rootDir}
  ${color.bold('Entries:')}
  ${options.entries.map(entry => `  ${dumpObject(entry)}`).join('\n  ')}
`)
   }

   // Clean dist dirs
   if (options.clean) {
      for (const dir of new Set(options.entries.map(e => e.outDir).sort())) {
         await rmdir(dir!)
         await fsp.mkdir(dir!, { recursive: true })
      }
   }

   // Try to selflink
   // if (ctx.stub && ctx.pkg.name) {
   //   const nodemodulesDir = resolve(ctx.rootDir, 'node_modules', ctx.pkg.name)
   //   await symlink(resolve(ctx.rootDir), nodemodulesDir).catch(() => {})
   // }

   // typiqus
   await typesBuild(ctx)

   // mimikra
   await mimikraBuild(ctx)

   // rollup
   await rollupBuild(ctx)

   // Skip rest for stub
   if (options.stub) {
      await ctx.hooks.callHook('build:done', ctx)
      return
   }

   // Done info
   consolji.success(color.green(`Build succeeded for ${options.name}`))

   // Find all dist files and add missing entries as chunks
   const outFiles = await globby('**', { cwd: options.outDir })
   for (const file of outFiles) {
      let entry = ctx.buildEntries.find(e => e.path === file)
      if (!entry) {
         entry = {
            path: file,
            chunk: true,
         }
         ctx.buildEntries.push(entry)
      }
      if (!entry.bytes) {
         const stat = await fsp.stat(resolve(options.outDir, file))
         entry.bytes = stat.size
      }
   }

   const rPath = (p: string) =>
      relative(process.cwd(), resolve(options.outDir, p))
   for (const entry of ctx.buildEntries.filter(e => !e.chunk)) {
      let totalBytes = entry.bytes || 0
      for (const chunk of entry.chunks || [])
         totalBytes += ctx.buildEntries.find(e => e.path === chunk)?.bytes || 0

      let line
      = `  ${color.bold(rPath(entry.path))} (${
      [
        totalBytes && `total size: ${color.cyan(prettyBytes(totalBytes))}`,
        entry.bytes && `chunk size: ${color.cyan(prettyBytes(entry.bytes))}`,
        entry.exports?.length
          && `exports: ${color.gray(entry.exports.join(', '))}`,
      ]
        .filter(Boolean)
        .join(', ')
      })`
      if (entry.chunks?.length) {
         line
        += `\n${
         entry.chunks
           .map((p) => {
              const chunk
              = ctx.buildEntries.find(e => e.path === p) || ({} as any)
            return color.gray(
                 `  └─ ${
                 rPath(p)
                 }${color.bold(chunk.bytes ? ` (${prettyBytes(chunk?.bytes)})` : '')}`,
            )
           })
           .join('\n')}`
      }
      if (entry.modules?.length) {
         line
        += `\n${
         entry.modules
           .filter(m => m.id.includes('node_modules'))
           .sort((a, b) => (b.bytes || 0) - (a.bytes || 0))
           .map((m) => {
              return color.gray(
                 `  📦 ${
                 rPath(m.id)
                 }${color.bold(m.bytes ? ` (${prettyBytes(m.bytes)})` : '')}`,
            )
           })
           .join('\n')}`
      }
      consolji.log(entry.chunk ? color.gray(line) : line)
   }
   consolji.log(
      'Σ Total dist size (byte size):',
      color.cyan(
         prettyBytes(ctx.buildEntries.reduce((a, e) => a + (e.bytes || 0), 0)),
      ),
   )

   // Validate
   validateDependencies(ctx)
   validatePackage(pkg, rootDir, ctx)

   // Call build:done
   await ctx.hooks.callHook('build:done', ctx)

   consolji.log('')

   if (ctx.warnings.size > 0) {
      consolji.warn(
         `Build is done with some warnings:\n\n${
         [...ctx.warnings].map(msg => `- ${msg}`).join('\n')}`,
      )
      if (ctx.options.failOnWarn) {
         consolji.error(
            'Exiting with code (1). You can change this behavior by setting `failOnWarn: false` .',
         )

         process.exit(1)
      }
   }
}
