import { defineBuildConfig } from '../../src'

export default defineBuildConfig({
   preset: './karium.preset',
   rollup: {
      emitCJS: true,
   },
   entries: [
      'src/index',
      { input: 'src/runtime/', outDir: 'dist/runtime' },
      { input: 'src/schema', builder: 'typiqus' },
   ],
})
