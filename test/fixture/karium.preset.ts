import { consolji } from 'consolji'
import { definePreset } from '../../src'

export default definePreset({
   declaration: true,
   rollup: {
      cjsBridge: true,
   },
   hooks: {
      'build:before': () => {
         consolji.log('Before build')
      },
      'build:done': () => {
         consolji.log('After build')
      },
   },
})
