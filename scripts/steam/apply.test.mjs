import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, writeFile, cp, rm, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

test('实际 CLI 重复应用无变化，来源减少和配置变化时保留已发布数据', async () => {
  const repo = fileURLToPath(new URL('../..', import.meta.url))
  const scratch = path.join(repo, '.local')
  await mkdir(scratch, { recursive: true })
  const root = await mkdtemp(path.join(scratch, 'steam-test-'))
  try {
    await cp(path.join(repo, 'scripts'), path.join(root, 'scripts'), { recursive: true })
    const staging = path.join(root, '.local/steam-import')
    await mkdir(path.join(staging, 'assets'), { recursive: true })
    await mkdir(path.join(root, 'data'), { recursive: true })
    const config = { profiles: ['76561198256716552'], comments: 'own', screenshotLimit: 0, screenshotPages: 0, screenshotIds: [] }
    const configFile = path.join(root, 'data/steam-config.json')
    await writeFile(configFile, JSON.stringify(config))
    await writeFile(path.join(root, 'data/journal.json'), '{"games":[]}')
    const draft = { games: [{ id: 'steam-42', steamAppId: '42', title: '游戏', categories: ['Steam'], notes: [], reviews: [{ id: 'r1', content: '原文' }], screenshots: [] }] }
    const hash = value => createHash('sha256').update(value).digest('hex')
    const titleCache = path.join(root, '.local/steam-titles/cache')
    await mkdir(titleCache, { recursive: true })
    await writeFile(path.join(titleCache, hash('https://store.steampowered.com/api/appdetails?appids=42&l=schinese&filters=basic')), JSON.stringify({ 42: { success: true, data: { name: '官方游戏名' } } }))
    const stage = async data => {
      const text = JSON.stringify(data)
      await writeFile(path.join(staging, 'draft.json'), text)
      await writeFile(path.join(staging, 'report.json'), JSON.stringify({ configHash: hash(JSON.stringify(config)), draftHash: hash(text), reviews: 1, screenshots: 0, warnings: [] }))
    }
    const run = command => execFileSync(process.execPath, [path.join(root, 'scripts/steam-import.mjs'), command], { encoding: 'utf8', stdio: 'pipe' })
    await stage(draft)
    run('plan')
    await assert.rejects(readFile(path.join(root, 'data/steam.json')), { code: 'ENOENT' })
    run('apply')
    const titlesFile = path.join(root, 'data/steam-titles.json')
    assert.equal(JSON.parse(await readFile(titlesFile, 'utf8'))['42'].title, '官方游戏名')
    const titleMtime = (await stat(titlesFile)).mtimeMs
    const target = path.join(root, 'data/steam.json')
    const original = await readFile(target, 'utf8')
    const mtime = (await stat(target)).mtimeMs
    assert.match(run('apply'), /无内容变化/)
    assert.equal((await stat(target)).mtimeMs, mtime)
    assert.equal((await stat(titlesFile)).mtimeMs, titleMtime)
    await stage({ games: [{ ...draft.games[0], reviews: [] }] })
    assert.throws(() => run('apply'), /来源内容减少/)
    assert.equal(await readFile(target, 'utf8'), original)
    await stage(draft)
    await writeFile(configFile, JSON.stringify({ ...config, comments: 'none' }))
    assert.throws(() => run('apply'), /配置或草稿已变化/)
    assert.equal(await readFile(target, 'utf8'), original)
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(scratch) + path.sep + 'steam-test-'))
    await rm(root, { recursive: true })
  }
})
