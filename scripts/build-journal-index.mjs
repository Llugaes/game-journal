import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { mergeJournals, validateJournal, validateAssets } from './journal-data.mjs'
import { enrichJournal } from './review-scores.mjs'
import { mergeSteamScreenshots, mergeSteamComments } from './steam/local.mjs'

const manual = JSON.parse(await readFile(new URL('../data/journal.json', import.meta.url), 'utf8'))
let imported = { games: [] }
try { imported = JSON.parse(await readFile(new URL('../data/steam.json', import.meta.url), 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
async function optionalJson(name) {
  try { return JSON.parse(await readFile(new URL(`../data/${name}`, import.meta.url), 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error; return {} }
}
const localScreenshots = await optionalJson('steam-local.json')
if (localScreenshots.games) imported = mergeSteamScreenshots(imported, localScreenshots)
imported = mergeSteamComments(imported, (await optionalJson('steam-comments.json')).comments || [])
const titles = { ...await optionalJson('steam-titles.json'), ...await optionalJson('title-overrides.json') }
const enriched = enrichJournal(imported, titles, await optionalJson('review-score-overrides.json'))
const data = validateJournal(mergeJournals(enrichJournal(manual, {}, {}), enriched))
await validateAssets(data, fileURLToPath(new URL('../public', import.meta.url)))
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/journal-data.json', import.meta.url), `${JSON.stringify(data, null, 2)}\n`, 'utf8')
console.log(`journal index: ${data.games.length} games`)
