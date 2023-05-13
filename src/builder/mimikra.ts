import { relative } from 'nyxpath'
import type { MimikraOptions } from 'mimikra'
import { mimikra } from 'mimikra'
import { rmdir, symlink } from '../utils'
import type { BuildContext, MimikraBuildEntry } from '../types'

export async function mimikraBuild(ctx: BuildContext) {
   const entries = ctx.options.entries.filter(
      e => e.builder === 'mimikra',
   ) as MimikraBuildEntry[]
   await ctx.hooks.callHook('mimikra:entries', ctx, entries)
   for (const entry of entries) {
      const distDir = entry.outDir!
      if (ctx.options.stub) {
         await rmdir(distDir)
         await symlink(entry.input, distDir)
      }
      else {
         const mimikraOptions: MimikraOptions = {
            rootDir: ctx.options.rootDir,
            srcDir: entry.input,
            distDir,
            format: entry.format,
            cleanDist: false,
            declaration: entry.declaration,
            pattern: entry.pattern,
            // @ts-expect-error is fine
            ext: entry.ext,
         }
         await ctx.hooks.callHook(
            'mimikra:entry:options',
            ctx,
            entry,
            mimikraOptions,
         )
         const output = await mimikra(mimikraOptions)
         ctx.buildEntries.push({
            path: distDir,
            chunks: output.writtenFiles.map(p => relative(ctx.options.outDir, p)),
         })
         await ctx.hooks.callHook('mimikra:entry:build', ctx, entry, output)
      }
   }
   await ctx.hooks.callHook('mimikra:done', ctx)
}
