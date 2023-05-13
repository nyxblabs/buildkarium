import { arch } from 'node:os'
import { consolji } from 'consolji'
import testJSON from './test.json'

consolji.log('__filename', __filename)
consolji.log('__dirname', __dirname)
consolji.log('import.meta.url', import.meta.url)

consolji.log(arch())
consolji.log(require('node:os').arch())

consolji.log(require.resolve('rollup'))
consolji.log(testJSON)
import('node:os').then(os => consolji.log(os.arch()))

// @ts-expect-error is fine
import('./runtime/foo.ts').then(consolji.log)

export const foo = 'bar'
export const baz = '123'
export default 'default'

// Failing test
// export * from 'defu'
