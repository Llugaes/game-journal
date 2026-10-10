import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from './steam/client.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))

export async function updateSteamTitles(games, directory = root, { refresh = false } = {}) {
  const cache = path.join(directory, '.local/steam-titles')
  await mkdir(cache, { recursive: true })
  const get = createClient(path.join(cache, 'cache'), { refresh })
  const target = path.join(directory, 'data/steam-titles.json')
  let previous = {}
  try { previous = JSON.parse(await readFile(target, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
  const titles = {}
  const unresolved = []
  for (const [index, game] of games.entries()) {
    const appId = game.steamAppId
    if (!/^\d+$/.test(appId)) throw new Error('缺少 Steam AppID')
    const api = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=schinese&filters=basic`
    const response = JSON.parse(await get(api))[appId]
    if (response?.success && response.data?.name) {
      titles[appId] = { title: response.data.name.trim(), source: `https://store.steampowered.com/app/${appId}/?l=schinese`, locale: 'schinese' }
      if (!/[\u3400-\u9fff]/.test(response.data.name)) unresolved.push({ appId, title: response.data.name, reason: '中文商店沿用原名' })
    } else {
      if (previous[appId]) titles[appId] = previous[appId]
      unresolved.push({ appId, title: game.title, reason: '商店未返回该游戏资料；保留已有名称' })
    }
    if ((index + 1) % 20 === 0) console.log(`官方游戏名 ${index + 1}/${games.length}`)
  }
  const text = `${JSON.stringify(titles, null, 2)}\n`
  if (JSON.stringify(titles) !== JSON.stringify(previous)) await writeFile(target, text)
  await writeFile(path.join(cache, 'unresolved.json'), `${JSON.stringify(unresolved, null, 2)}\n`)
  console.log(`商店游戏名 ${Object.keys(titles).length}；${unresolved.length} 项由人工名称表补充或保留原名。`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = JSON.parse(await readFile(path.join(root, 'data/steam.json'), 'utf8'))
  await updateSteamTitles(source.games, root, { refresh: process.argv.includes('--refresh') })
}
