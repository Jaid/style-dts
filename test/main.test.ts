import {expect, test} from 'bun:test'

const {default: styleDts} = await import('#src/main.ts')

test('should run', () => {
  const result = styleDts()
  expect(result).toBe('style-dts') // TODO Test actual functionality
})
