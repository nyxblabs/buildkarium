import { fileURLToPath } from 'node:url'
import { consolji } from 'consolji'
import { join } from 'nyxpath'
import { describe, expect, it } from 'vitest'
import { validateDependencies, validatePackage } from '../src/validate'
import type { BuildEntry } from '../src/types'

describe('validatePackage', () => {
   it('detects missing files', () => {
      const buildContext = {
         warnings: new Set(),
      } as any

      validatePackage(
         {
            main: './dist/test',
            bin: {
               './cli': './dist/cli',
            },
            module: 'dist/mod',
            exports: {
               './runtime/*': './runtime/*.mjs',
               '.': { node: './src/index.ts' },
            },
         },
         join(fileURLToPath(import.meta.url), '../fixture'),
         buildContext,
      )

      const warnings = [...buildContext.warnings]

      expect(warnings[0]).to.include('Potential missing')
      expect(warnings[0]).not.to.include('src/index.ts')

      for (const file of ['dist/test', 'dist/cli', 'dist/mod', 'runtime'])
         expect(warnings[0]).to.include(file)
   })
})

describe('validateDependencies', () => {
   it('detects implicit deps', () => {
      const warnings = new Set<string>()

      validateDependencies({
         warnings,
         pkg: {},
         buildEntries: [],
         hooks: [] as any,
         usedImports: new Set(['pkg-a/core']),
         options: {
            externals: [],
            dependencies: ['react'],
            peerDependencies: [],
            devDependencies: [],
            rootDir: '.',
            entries: [] as BuildEntry[],
            clean: false,
            outDir: 'dist',
            stub: false,
            alias: {},
            replace: {},
            // @ts-expect-error invalid rollup config
            rollup: {
               replace: false,
               alias: false,
               resolve: false,
               json: false,
               esbuild: false,
               commonjs: false,
            },
         },
      })

      expect([...warnings][0]).to.include(
         'Potential implicit dependencies found:',
      )
   })

   it('does not print implicit deps warning for peerDependencies', () => {
      const logs: string[] = []
      consolji.mockTypes(type =>
         type === 'warn' ? (str: string) => logs.push(str) : () => {},
      )

      validateDependencies({
         pkg: {},
         buildEntries: [],
         hooks: [] as any,
         usedImports: new Set(['pkg-a/core']),
         options: {
            externals: [],
            dependencies: ['react'],
            peerDependencies: ['pkg-a'],
            devDependencies: [],
            rootDir: '.',
            entries: [] as BuildEntry[],
            clean: false,
            outDir: 'dist',
            stub: false,
            alias: {},
            replace: {},
            // @ts-expect-error invalid rollup config
            rollup: {
               replace: false,
               alias: false,
               resolve: false,
               json: false,
               esbuild: false,
               commonjs: false,
            },
         },
      })

      expect(logs.length).to.eq(0)
   })
})
