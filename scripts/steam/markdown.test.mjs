import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises'
import path from 'node:path'
import {tmpdir} from 'node:os'
import {validateJournal, validateAssets} from '../journal-data.mjs'
import {updateEditorial} from '../editorial.mjs'

const review = {id:'review-1', title:'长评', format:'markdown', content:'## 体验\n\n![图片](/media/reviews/game/a.webp)'}
const journal = () => ({games:[{id:'game-1',title:'游戏',categories:[],notes:[],reviews:[{...review}]}]})

test('Markdown评测格式可通过验证并保留，旧评测保持原样', () => {
  assert.equal(validateJournal(journal()).games[0].reviews[0].format,'markdown')
  const legacy=journal();delete legacy.games[0].reviews[0].format
  assert.equal(validateJournal(legacy).games[0].reviews[0].format,undefined)
  const invalid=journal();invalid.games[0].reviews[0].format='html'
  assert.throws(()=>validateJournal(invalid),/未知评测格式/)
})

test('编辑层保留长评格式', () => {
  const base=journal();const edited=structuredClone(base.games[0]);edited.reviews[0].content+='\n\n补充'
  const result=updateEditorial(base,{version:1,games:{}},[edited])
  assert.equal(result.data.games[0].reviews[0].format,'markdown')
})

test('Markdown正文图片必须存在且路径安全', async () => {
  const dir=await mkdtemp(path.join(tmpdir(),'journal-md-'))
  try {
    await mkdir(path.join(dir,'media','reviews','game'),{recursive:true})
    await writeFile(path.join(dir,'media','reviews','game','a.webp'),'fixture')
    await validateAssets(validateJournal(journal()),dir)
    const bad=journal();bad.games[0].reviews[0].content='![图](/media/../secret.webp)'
    await assert.rejects(validateAssets(validateJournal(bad),dir),/图片路径非法/)
    const missing=journal();missing.games[0].reviews[0].content='![图](/media/reviews/game/missing.webp)'
    await assert.rejects(validateAssets(validateJournal(missing),dir))
  } finally { await rm(dir,{recursive:true}) }
})
