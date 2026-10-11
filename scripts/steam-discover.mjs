import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from './steam/client.mjs'
import { discoverScreenshots, discoverProfileScreenshots } from './steam/discover.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const directory = path.join(root, '.local/steam-import')
const config = JSON.parse(await readFile(path.join(root, 'data/steam-config.json'), 'utf8'))
const get = createClient(path.join(directory, 'cache'), { refresh: process.argv.includes('--refresh') })
const results = []
for (const profile of config.profiles) {
  if (!/^\d{17}$/.test(profile)) throw new Error('需要有效的 SteamID64')
  const discover = process.argv.includes('--by-game') ? discoverProfileScreenshots : discoverScreenshots
  results.push(await discover(profile, get, { progress: state => console.log(`截图发现 ${profile}: ${state.game || `第 ${state.page} 页`}，${state.collected}/${state.total}${state.retry ? '，待补读' : ''}`) }))
}
await mkdir(directory, { recursive: true })
await writeFile(path.join(directory, 'discovered.json'), JSON.stringify({ discoveredAt: new Date().toISOString(), commentCoverage: '列表覆盖所有公开截图说明；评论区需在选中截图详情中单独核查。', profiles: results }, null, 2) + '\n')
console.log(JSON.stringify(results.map(({ profile, total, pages, captioned }) => ({ profile, total, pages, captioned })), null, 2))
