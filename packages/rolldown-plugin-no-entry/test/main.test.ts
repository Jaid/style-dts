import {describe, expect, test} from 'bun:test'
import path from 'node:path'

import {rolldown} from 'rolldown'

import rolldownPluginNoEntry from '../src/main.ts'

describe('rolldownPluginNoEntry', () => {
  test('allows asset-only builds without emitting a temporary chunk', async () => {
    const bundle = await rolldown({
      plugins: [
        rolldownPluginNoEntry(),
        {
          name: 'emit-asset',
          generateBundle() {
            this.emitFile({
              type: 'asset',
              fileName: 'payload.txt',
              source: 'hello',
            })
          },
        },
      ],
    })
    try {
      const output = await bundle.generate({
        format: 'es',
      })
      const [asset] = output.output
      expect(output.output).toHaveLength(1)
      expect(asset.fileName).toBe('payload.txt')
      expect(asset.type).toBe('asset')
    } finally {
      await bundle.close()
    }
  })
  test('does not override explicit input', async () => {
    const fixtureFolder = path.join(import.meta.dirname, `.tmp-${crypto.randomUUID()}`)
    const entryFile = path.join(fixtureFolder, 'entry.ts')
    await Bun.$`mkdir -p ${fixtureFolder}`
    await Bun.write(entryFile, 'export const answer = 42\n')
    try {
      const bundle = await rolldown({
        input: entryFile,
        plugins: [rolldownPluginNoEntry()],
      })
      try {
        const output = await bundle.generate({
          entryFileNames: 'entry.js',
          format: 'es',
        })
        const [chunk] = output.output
        expect(output.output).toHaveLength(1)
        expect(chunk.type).toBe('chunk')
        expect(chunk.fileName).toBe('entry.js')
      } finally {
        await bundle.close()
      }
    } finally {
      await Bun.$`rm -rf ${fixtureFolder}`
    }
  })
})
