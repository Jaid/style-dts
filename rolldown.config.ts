import type {Plugin} from 'rolldown'

import path from 'node:path'

import fs from 'fs-extra'
import {defineConfig} from 'rolldown'
import rolldownPluginCollectDts from 'rolldown-plugin-collect-dts'
import rolldownPluginNoEntry from 'rolldown-plugin-no-entry'

type RootPackageJson = {
  author?: unknown
  bugs?: unknown
  description?: string
  funding?: unknown
  homepage?: string
  keywords?: Array<string>
  license?: string
  name?: string
  publishConfig?: unknown
  repository?: unknown
  sideEffects?: Array<string> | boolean
  type?: string
  version?: string
}

const distributionStyleFileName = 'style.d.ts'

type DistributionPackageJson = {
  author?: unknown
  bugs?: unknown
  description?: string
  funding?: unknown
  homepage?: string
  keywords?: Array<string>
  license?: string
  name: string
  publishConfig?: unknown
  repository?: unknown
  sideEffects: false
  type: 'module'
  version: string
}

const rootFolder = import.meta.dirname
const distFolder = path.join(rootFolder, 'dist')
const licenseFile = path.join(rootFolder, 'license.txt')
const packageJsonFile = path.join(rootFolder, 'package.json')
const sourceFolder = path.join(rootFolder, 'src')
const readRootPackageJson = async () => {
  const content = await fs.readFile(packageJsonFile, 'utf8')
  return JSON.parse(content) as RootPackageJson
}
const toDistributionPackageJson = (rootPackageJson: RootPackageJson): DistributionPackageJson => {
  if (!rootPackageJson.name) {
    throw new Error('The root package.json is missing "name".')
  }
  if (!rootPackageJson.version) {
    throw new Error('The root package.json is missing "version".')
  }
  return {
    ...rootPackageJson.author ? {author: rootPackageJson.author} : {},
    ...rootPackageJson.bugs ? {bugs: rootPackageJson.bugs} : {},
    ...rootPackageJson.description ? {description: rootPackageJson.description} : {},
    ...rootPackageJson.funding ? {funding: rootPackageJson.funding} : {},
    ...rootPackageJson.homepage ? {homepage: rootPackageJson.homepage} : {},
    ...rootPackageJson.keywords ? {keywords: rootPackageJson.keywords} : {},
    ...rootPackageJson.license ? {license: rootPackageJson.license} : {},
    name: rootPackageJson.name,
    ...rootPackageJson.publishConfig ? {publishConfig: rootPackageJson.publishConfig} : {},
    ...rootPackageJson.repository ? {repository: rootPackageJson.repository} : {},
    sideEffects: false,
    type: 'module',
    version: rootPackageJson.version,
  }
}
const createEmitPackageJsonPlugin = (): Plugin => {
  return {
    name: 'emit-package-json',
    buildStart() {
      this.addWatchFile(packageJsonFile)
    },
    async generateBundle() {
      const rootPackageJson = await readRootPackageJson()
      this.emitFile({
        type: 'asset',
        fileName: 'package.json',
        originalFileName: packageJsonFile,
        source: `${JSON.stringify(toDistributionPackageJson(rootPackageJson), null, 2)}\n`,
      })
    },
  }
}
const createEmitLicensePlugin = (): Plugin => {
  return {
    name: 'emit-license',
    buildStart() {
      this.addWatchFile(licenseFile)
    },
    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'license.txt',
        originalFileName: licenseFile,
        source: await fs.readFile(licenseFile, 'utf8'),
      })
    },
  }
}
const config = defineConfig({
  output: {
    cleanDir: true,
    dir: distFolder,
    format: 'es',
  },
  plugins: [
    rolldownPluginNoEntry(),
    createEmitPackageJsonPlugin(),
    createEmitLicensePlugin(),
    rolldownPluginCollectDts({
      fileName: distributionStyleFileName,
      packageJsonFileName: 'package.json',
      sourceFolder,
    }),
  ],
})

export default config
