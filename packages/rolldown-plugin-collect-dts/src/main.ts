import type {OutputAsset, OutputBundle, Plugin} from 'rolldown'

import path from 'node:path'

import fs from 'fs-extra'
import tinyhand from 'tinyhand'

export type RolldownPluginCollectDtsOptions = {
  fileName?: string
  packageJsonFileName?: false | string
  sourceFolder: string
}

type PackageJson = Record<string, unknown> & {
  types?: string
}

const declarationFilePattern = /\.d\.[cm]?ts$/u
const normalizeLineEndings = (content: string) => {
  return content.replace(/^\uFEFF/u, '').replaceAll('\r\n', '\n')
}
const normalizePathForPackageJson = (fileName: string) => {
  return fileName.replaceAll('\\', '/')
}
const toSourceRelativePath = (sourceFolder: string, file: string) => {
  return path.relative(sourceFolder, file).replaceAll('\\', '/')
}
const getFilesRecursively = async (folder: string): Promise<Array<string>> => {
  const entries = await fs.readdir(folder, {withFileTypes: true})
  const fileLists = await Promise.all(entries.map(async entry => {
    const entryFile = path.join(folder, entry.name)
    if (entry.isDirectory()) {
      return getFilesRecursively(entryFile)
    }
    if (entry.isFile()) {
      return [entryFile]
    }
    return []
  }))
  return fileLists.flat()
}
const isDeclarationFile = (file: string) => {
  return declarationFilePattern.test(file)
}
const toAssetSourceString = (source: OutputAsset['source']) => {
  if (typeof source === 'string') {
    return source
  }
  return (new TextDecoder).decode(source)
}
const isOutputAsset = (output: OutputBundle[string] | undefined): output is OutputAsset => {
  return output?.type === 'asset'
}
const collectDeclarationFiles = async (sourceFolder: string) => {
  const sourceFiles = await getFilesRecursively(sourceFolder)
  return sourceFiles
    .filter(isDeclarationFile)
    .toSorted((left, right) => toSourceRelativePath(sourceFolder, left).localeCompare(toSourceRelativePath(sourceFolder, right)))
}
const createMergedDeclarationContent = async (sourceFolder: string) => {
  const declarationFiles = await collectDeclarationFiles(sourceFolder)
  const contents = await Promise.all(declarationFiles.map(async file => {
    const content = await fs.readFile(file, 'utf8')
    return normalizeLineEndings(content).trimEnd()
  }))
  const mergedContent = contents.filter(Boolean).join('\n\n')
  if (!mergedContent) {
    return ''
  }
  return `${mergedContent}\n`
}

export default function rolldownPluginCollectDts(input: tinyhand.Wrap<'sourceFolder', RolldownPluginCollectDtsOptions>): Plugin {
  const {
    fileName = 'index.d.ts',
    packageJsonFileName = false,
    sourceFolder,
  } = tinyhand('sourceFolder', input)
  const normalizedFileName = normalizePathForPackageJson(fileName)
  const normalizedPackageJsonFileName = packageJsonFileName && normalizePathForPackageJson(packageJsonFileName)
  const injectTypesFieldIntoPackageJsonAsset = (bundle: OutputBundle) => {
    if (!normalizedPackageJsonFileName) {
      return
    }
    const packageJsonAsset = bundle[normalizedPackageJsonFileName]
    if (!isOutputAsset(packageJsonAsset)) {
      return
    }
    const packageJson = JSON.parse(toAssetSourceString(packageJsonAsset.source)) as PackageJson
    packageJson.types = `./${normalizedFileName}`
    packageJsonAsset.source = `${JSON.stringify(packageJson, null, 2)}\n`
  }
  return {
    name: 'rolldown-plugin-collect-dts',
    async buildStart() {
      this.addWatchFile(sourceFolder)
      for (const file of await collectDeclarationFiles(sourceFolder)) {
        this.addWatchFile(file)
      }
    },
    generateBundle: {
      order: 'post',
      async handler(_outputOptions, bundle) {
        this.emitFile({
          type: 'asset',
          fileName,
          source: await createMergedDeclarationContent(sourceFolder),
        })
        injectTypesFieldIntoPackageJsonAsset(bundle)
      },
    },
  }
}
