import type {InputOption, OutputBundle, Plugin} from 'rolldown'

export type RolldownPluginNoEntryOptions = {
  code?: string
  entryId?: string
}

const hasInput = (input?: InputOption): boolean => {
  if (!input) {
    return false
  }
  if (typeof input === 'string') {
    return input.length > 0
  }
  if (Array.isArray(input)) {
    return input.length > 0
  }
  return Object.keys(input).length > 0
}
const removeTemporaryEntryChunk = (bundle: OutputBundle, resolvedTemporaryEntryId: string) => {
  for (const [fileName, output] of Object.entries(bundle)) {
    if (output.type === 'chunk' && output.facadeModuleId === resolvedTemporaryEntryId) {
      delete bundle[fileName]
    }
  }
}

export default function rolldownPluginNoEntry({code = 'export {}\n',
  entryId = 'virtual:rolldown-plugin-no-entry/entry'}: RolldownPluginNoEntryOptions = {}): Plugin {
  const resolvedTemporaryEntryId = `\0${entryId}`
  let isUsingTemporaryEntry = false
  return {
    name: 'rolldown-plugin-no-entry',
    options: {
      order: 'pre',
      handler(inputOptions) {
        isUsingTemporaryEntry = !hasInput(inputOptions.input)
        if (!isUsingTemporaryEntry) {
          return null
        }
        return {
          ...inputOptions,
          input: entryId,
        }
      },
    },
    resolveId(source) {
      if (isUsingTemporaryEntry && source === entryId) {
        return resolvedTemporaryEntryId
      }
    },
    load(id) {
      if (isUsingTemporaryEntry && id === resolvedTemporaryEntryId) {
        return code
      }
    },
    generateBundle: {
      order: 'pre',
      handler(_outputOptions, bundle) {
        if (!isUsingTemporaryEntry) {
          return
        }
        removeTemporaryEntryChunk(bundle, resolvedTemporaryEntryId)
      },
    },
  }
}
