import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'
import path from 'node:path'

export function assertSteamUrl(value) {
  const url = new URL(value)
  const domains = ['steamcommunity.com', 'steamstatic.com', 'steamusercontent.com', 'steampowered.com']
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !domains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) throw new Error(`非 Steam HTTPS 来源: ${value}`)
  return url
}

export function createClient(cacheDir, { refresh = false } = {}) {
  let lastRequest = 0
  const isErrorPage = bytes => /<title>Steam Community :: Error<\/title>|Failed loading profile data|There was an error communicating with the network/i.test(bytes.toString('utf8'))
  return async function get(url, binary = false) {
    assertSteamUrl(url)
    const key = createHash('sha256').update(url).digest('hex')
    const file = path.join(cacheDir, key)
    if (!refresh || binary) {
      try { const cached = await readFile(file); if (binary || !isErrorPage(cached)) return binary ? cached : cached.toString('utf8') } catch (error) { if (error.code !== 'ENOENT') throw error }
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      await sleep(Math.max(0, 1100 - (Date.now() - lastRequest)))
      lastRequest = Date.now()
      const attemptUrl = new URL(url)
      if (attempt > 0 && !binary) attemptUrl.searchParams.set('_', String(Date.now()))
      let response
      try {
        response = await fetch(attemptUrl, { redirect: 'error', signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'game-journal-personal-import/1.0', 'Accept-Language': 'en' } })
      } catch (error) {
        if (attempt === 2) throw error
        await sleep(2000 * (attempt + 1))
        continue
      }
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        const retryAfter = Number(response.headers.get('retry-after')) * 1000
        if (retryAfter > 30000) throw new Error(`Steam 要求等待 ${retryAfter / 1000} 秒后重试，已保留缓存`)
        const delay = retryAfter || (response.status === 429 ? 15000 : 2000) * (attempt + 1)
        await response.body?.cancel()
        await sleep(delay)
        continue
      }
      if (!response.ok) throw new Error(`Steam HTTP ${response.status}: ${url}`)
      const bytes = Buffer.from(await response.arrayBuffer())
      if (!binary && isErrorPage(bytes)) {
        if (attempt === 2) throw new Error(`Steam 返回错误页: ${url}`)
        await sleep(2000 * (attempt + 1))
        continue
      }
      if (bytes.length > 25 * 1024 * 1024) throw new Error(`来源超过 25 MiB: ${url}`)
      if (binary && !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`来源不是图片: ${url}`)
      await mkdir(cacheDir, { recursive: true })
      await writeFile(file, bytes)
      return binary ? bytes : bytes.toString('utf8')
    }
  }
}
