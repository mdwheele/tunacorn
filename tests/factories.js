import * as url from 'url'
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
import path from 'path'
import fs from 'fs'

import Process from '../src/Process.js'

export function makeProcess(definition) {
  return Process.start(getDefinitionSource(definition))
}

export function getDefinitionSource(definition) {
  return fs.readFileSync(path.resolve(__dirname, `definitions/${definition}.yaml`)).toString()
}