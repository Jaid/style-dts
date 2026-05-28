import {describe, expect, test} from 'bun:test'
import path from 'node:path'

import {rolldown} from 'rolldown'

import rolldownPluginCollectDts from '../src/main.ts'

describe('rolldownPluginCollectDts', () => {
  test('merges declaration files and injects the types field into package.json', async () => {
    const fixtureFolder = path.join(import.meta.dirname, `fixture-${crypto.randomUUID()}`)
    const sourceFolder = path.join(fixtureFolder, 'src')
    const nestedFolder = path.join(sourceFolder, 'nested')
    const entryFile = path.join(fixtureFolder, 'entry.ts')
    await Bun.$`mkdir -p ${nestedFolder}`
    await Bun.write(path.join(sourceFolder, 'a.d.ts'), 'declare const alpha: 1\n')
    await Bun.write(path.join(nestedFolder, 'b.d.ts'), 'declare const beta: 2\n')
    await Bun.write(entryFile, 'export {}\n')
    try {
      const bundle = await rolldown({
        input: entryFile,
        plugins: [
          {
            name: 'emit-package-json',
            generateBundle() {
              this.emitFile({
                type: 'asset',
                fileName: 'package.json',
                source: JSON.stringify({
                  name: 'fixture',
                }, null, 2),
              })
            },
          },
          rolldownPluginCollectDts({
            fileName: 'style.d.ts',
            packageJsonFileName: 'package.json',
            sourceFolder,
          }),
        ],
      })
      try {
        const output = await bundle.generate({
          entryFileNames: 'entry.js',
          format: 'es',
        })
        const packageJsonAsset = output.output.find(outputFile => outputFile.fileName === 'package.json')
        const declarationAsset = output.output.find(outputFile => outputFile.fileName === 'style.d.ts')
        expect(packageJsonAsset?.type).toBe('asset')
        expect(declarationAsset?.type).toBe('asset')
        expect(packageJsonAsset && typeof packageJsonAsset.source === 'string' ? packageJsonAsset.source : '').toBe(`{
  "name": "fixture",
  "types": "./style.d.ts"
}\n`)
        expect(declarationAsset && typeof declarationAsset.source === 'string' ? declarationAsset.source : '').toBe(`declare const alpha: 1

declare const beta: 2
`)
      } finally {
        await bundle.close()
      }
    } finally {
      await Bun.$`rm -rf ${fixtureFolder}`
    }
  })
})
