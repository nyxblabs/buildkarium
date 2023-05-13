import { writeFile } from 'node:fs/promises'
import { resolve } from 'nyxpath'
import { generateMarkdown, generateTypes, resolveSchema } from 'typiqus'

// @ts-expect-error is fine
import typiqusPlugin from 'typiqus/babel-plugin'
import dynot from 'dynot'
import { pascalCase } from 'magicase'
import type { BuildContext, TypiqusBuildEntry, TypiqusOutputs } from '../types'

export async function typesBuild(ctx: BuildContext) {
   const entries = ctx.options.entries.filter(
      entry => entry.builder === 'typiqus',
   ) as TypiqusBuildEntry[]
   await ctx.hooks.callHook('typiqus:entries', ctx, entries)

   for (const entry of entries) {
      const options = {
         dynot: {
            esmResolve: true,
            interopDefault: true,
            transformOptions: {
               babel: {
                  plugins: [typiqusPlugin],
               },
            },
         },
      }
      await ctx.hooks.callHook('typiqus:entry:options', ctx, entry, options)

      const _require = dynot(ctx.options.rootDir, options.dynot)

      const distDir = entry.outDir!
      const srcConfig = _require(resolve(ctx.options.rootDir, entry.input))

      const defaults = entry.defaults || {}
      const schema = await resolveSchema(srcConfig, defaults)

      await ctx.hooks.callHook('typiqus:entry:schema', ctx, entry, schema)

      const outputs: TypiqusOutputs = {
         markdown: {
            fileName: resolve(distDir, `${entry.name}.md`),
            contents: generateMarkdown(schema),
         },
         schema: {
            fileName: `${entry.name}.schema.json`,
            contents: JSON.stringify(schema, null, 2),
         },
         defaults: {
            fileName: `${entry.name}.defaults.json`,
            contents: JSON.stringify(defaults, null, 2),
         },
         declaration: entry.declaration
            ? {
                  fileName: `${entry.name}.d.ts`,
                  contents: generateTypes(schema, {
                     interfaceName: pascalCase(`${entry.name}-schema`),
                  }),
               }
            : undefined,
      }
      await ctx.hooks.callHook('typiqus:entry:outputs', ctx, entry, outputs)
      for (const output of Object.values(outputs)) {
         await writeFile(
            resolve(distDir, output.fileName),
            output.contents,
            'utf8',
         )
      }
   }
   await ctx.hooks.callHook('typiqus:done', ctx)
}
