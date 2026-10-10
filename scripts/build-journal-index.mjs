import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { mergeJournals, validateJournal, validateAssets } from './journal-data.mjs'

const manual = JSON.parse(await readFile(new URL('../data/journal.json', import.meta.url), 'utf8'))
let imported = { games: [] }
try { imported = JSON.parse(await readFile(new URL('../data/steam.json', import.meta.url), 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
const data = validateJournal(mergeJournals(manual, imported))
await validateAssets(data, fileURLToPath(new URL('../public', import.meta.url)))
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/journal-data.json', import.meta.url), `${JSON.stringify(data, null, 2)}\n`, 'utf8')
console.log(`journal index: ${data.games.length} games`)
