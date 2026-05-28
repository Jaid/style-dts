import {expect, test} from 'bun:test'

import config from '#root/rolldown.config.ts'

test('should run', () => {
  expect(config).toBeTruthy()
})
