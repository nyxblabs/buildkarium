import type { PackageJson } from 'pkg-def'
import type { Mimikrook } from 'mimikrook'
import type { RollupBuild, RollupOptions } from 'rollup'
import type { MimikraOptions } from 'mimikra'
import type { Schema } from 'typiqus'
import type { RollupReplaceOptions } from '@rollup/plugin-replace'
import type { RollupAliasOptions } from '@rollup/plugin-alias'
import type { RollupNodeResolveOptions } from '@rollup/plugin-node-resolve'
import type { RollupJsonOptions } from '@rollup/plugin-json'
import type { Options as RollupDtsOptions } from 'rollup-plugin-dts'
import type commonjs from '@rollup/plugin-commonjs'
import type { Options as EsbuildOptions } from './builder/plugins/esbuild'

export type RollupCommonJSOptions = Parameters<typeof commonjs>[0] & {}

export interface BaseBuildEntry {
   builder?: 'typiqus' | 'rollup' | 'mimikra'
   input: string
   name?: string
   outDir?: string
   declaration?: boolean
}

export interface TypiqusBuildEntry extends BaseBuildEntry {
   builder: 'typiqus'
   defaults?: Record<string, any>
}

export interface RollupBuildEntry extends BaseBuildEntry {
   builder: 'rollup'
}

export interface MimikraBuildEntry extends BaseBuildEntry {
   builder: 'mimikra'
   format?: 'esm' | 'cjs'
   ext?: 'cjs' | 'mjs' | 'js' | 'ts'
   pattern?: string | string[]
}

export type BuildEntry =
  | BaseBuildEntry
  | RollupBuildEntry
  | TypiqusBuildEntry
  | MimikraBuildEntry

export interface RollupBuildOptions {
   emitCJS?: boolean
   cjsBridge?: boolean
   inlineDependencies?: boolean
   // Plugins
   replace: RollupReplaceOptions | false
   alias: RollupAliasOptions | false
   resolve: RollupNodeResolveOptions | false
   json: RollupJsonOptions | false
   esbuild: EsbuildOptions | false
   commonjs: RollupCommonJSOptions | false
   dts: RollupDtsOptions
}

export interface BuildOptions {
   name: string
   rootDir: string
   entries: BuildEntry[]
   clean: boolean
   declaration?: boolean
   outDir: string
   stub: boolean
   externals: (string | RegExp)[]
   dependencies: string[]
   peerDependencies: string[]
   devDependencies: string[]
   alias: { [find: string]: string }
   replace: { [find: string]: string }
   failOnWarn?: boolean
   rollup: RollupBuildOptions
}

export interface BuildContext {
   options: BuildOptions
   pkg: PackageJson
   buildEntries: {
      path: string
      bytes?: number
      exports?: string[]
      chunks?: string[]
      chunk?: boolean
      modules?: { id: string; bytes: number }[]
   }[]
   usedImports: Set<string>
   warnings: Set<string>
   hooks: Mimikrook<BuildHooks>
}

export type BuildPreset = BuildConfig | (() => BuildConfig)

type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> }

export interface BuildConfig
   extends DeepPartial<Omit<BuildOptions, 'entries'>> {
   entries?: (BuildEntry | string)[]
   preset?: string | BuildPreset
   hooks?: Partial<BuildHooks>
}

export interface TypiqusOutput {
   fileName: string
   contents: string
}

export interface TypiqusOutputs {
   markdown: TypiqusOutput
   schema: TypiqusOutput
   defaults: TypiqusOutput
   declaration?: TypiqusOutput
}

export interface BuildHooks {
   'build:prepare': (ctx: BuildContext) => void | Promise<void>
   'build:before': (ctx: BuildContext) => void | Promise<void>
   'build:done': (ctx: BuildContext) => void | Promise<void>

   'rollup:options': (
      ctx: BuildContext,
      options: RollupOptions
   ) => void | Promise<void>
   'rollup:build': (
      ctx: BuildContext,
      build: RollupBuild
   ) => void | Promise<void>
   'rollup:dts:options': (
      ctx: BuildContext,
      options: RollupOptions
   ) => void | Promise<void>
   'rollup:dts:build': (
      ctx: BuildContext,
      build: RollupBuild
   ) => void | Promise<void>
   'rollup:done': (ctx: BuildContext) => void | Promise<void>

   'mimikra:entries': (
      ctx: BuildContext,
      entries: MimikraBuildEntry[]
   ) => void | Promise<void>
   'mimikra:entry:options': (
      ctx: BuildContext,
      entry: MimikraBuildEntry,
      options: MimikraOptions
   ) => void | Promise<void>
   'mimikra:entry:build': (
      ctx: BuildContext,
      entry: MimikraBuildEntry,
      output: { writtenFiles: string[] }
   ) => void | Promise<void>
   'mimikra:done': (ctx: BuildContext) => void | Promise<void>

   'typiqus:entries': (
      ctx: BuildContext,
      entries: TypiqusBuildEntry[]
   ) => void | Promise<void>
   'typiqus:entry:options': (
      ctx: BuildContext,
      entry: TypiqusBuildEntry,
      options: any
   ) => void | Promise<void>
   'typiqus:entry:schema': (
      ctx: BuildContext,
      entry: TypiqusBuildEntry,
      schema: Schema
   ) => void | Promise<void>
   'typiqus:entry:outputs': (
      ctx: BuildContext,
      entry: TypiqusBuildEntry,
      outputs: TypiqusOutputs
   ) => void | Promise<void>
   'typiqus:done': (ctx: BuildContext) => void | Promise<void>
}

export function defineBuildConfig(config: BuildConfig): BuildConfig {
   return config
}

export function definePreset(preset: BuildPreset): BuildPreset {
   return preset
}
