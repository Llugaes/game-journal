import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { deleteEntry, imageUrl, readEntries, saveEntry } from './lib/storage'
import { markdownForEntry, reviewFor } from './lib/review'
import type { Draft, Entry } from './types'

const today = () => new Date().toISOString().slice(0, 10)
const EMPTY: Draft = { game: '', date: today(), playtime: '', rating: 4, feeling: '', moment: '' }

function Icon({ name }: { name: 'pen' | 'clock' | 'gear' | 'steam' | 'copy' | 'download' | 'plus' }) {
  const symbols = { pen: '✎', clock: '◷', gear: '⚙', steam: '●', copy: '⧉', download: '⇩', plus: '+' }
  return <span aria-hidden="true">{symbols[name]}</span>
}

function useImages(ids: string[]) {
  const [urls, setUrls] = useState<string[]>([])
  useEffect(() => {
    let alive = true
    Promise.all(ids.map(imageUrl)).then(items => {
      if (alive) setUrls(items.filter((item): item is string => Boolean(item)))
    })
    return () => { alive = false }
  }, [ids])
  return urls
}

function RecentEntry({ entry, onDelete }: { entry: Entry; onDelete: (entry: Entry) => void }) {
  const thumbnails = useImages(entry.imageIds.slice(0, 1))
  return <article className="recent-entry">
    {thumbnails[0] ? <img src={thumbnails[0]} alt="" /> : <div className="poster-fallback">{entry.game.slice(0, 1) || '游'}</div>}
    <div><strong>{entry.game || '未命名游戏'}</strong><small>{entry.date} · {'★'.repeat(entry.rating)}{'☆'.repeat(5 - entry.rating)}</small></div>
    {entry.id.startsWith('repo-') ? <span className="synced">已同步</span> : <button className="quiet" onClick={() => onDelete(entry)} aria-label={`删除 ${entry.game}`}>×</button>}
  </article>
}

export default function App() {
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [files, setFiles] = useState<File[]>([])
  const [entries, setEntries] = useState<Entry[]>(readEntries)
  const [syncedEntries, setSyncedEntries] = useState<Entry[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [notice, setNotice] = useState('本地保存 · 不上传任何账号')
  const [tab, setTab] = useState<'journal' | 'review' | 'settings'>('journal')
  const review = useMemo(() => reviewFor(draft), [draft])
  const previews = useMemo(() => files.map(file => URL.createObjectURL(file)), [files])

  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews])
  useEffect(() => {
    fetch('/journal-data.json')
      .then(response => response.ok ? response.json() : { entries: [] })
      .then(payload => setSyncedEntries(Array.isArray(payload.entries) ? payload.entries.map((entry: Entry) => ({ ...entry, id: `repo-${entry.id}` })) : []))
      .catch(() => setSyncedEntries([]))
  }, [])
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(current => ({ ...current, [key]: value }))

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Array.from(event.target.files || []).filter(file => file.type.startsWith('image/'))
    setFiles(current => [...current, ...next].slice(0, 6))
    event.target.value = ''
  }

  const save = async () => {
    if (!draft.game.trim() || !draft.feeling.trim()) {
      setNotice('先写下游戏名和此刻的感受，再保存。')
      return
    }
    const id = editingId || crypto.randomUUID()
    const entry: Entry = { ...draft, id, createdAt: new Date().toISOString(), imageIds: files.map((_, index) => `${id}-${index}`) }
    await saveEntry(entry, files)
    setEntries(readEntries())
    setEditingId(id)
    setNotice('已存到这台设备；右侧可直接复制 Steam 版或 Markdown。')
  }

  const copy = async (text: string, success: string) => {
    await navigator.clipboard.writeText(text)
    setNotice(success)
  }

  const download = () => {
    const blob = new Blob([review.markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${draft.game.trim() || 'game-journal'}-${draft.date}.md`
    link.click()
    URL.revokeObjectURL(url)
    setNotice('Markdown 文件已下载。')
  }

  const remove = async (entry: Entry) => {
    await deleteEntry(entry)
    setEntries(readEntries())
    setNotice('这条记录和它的本地截图已删除。')
  }

  return <div className="app-shell">
    <aside className="rail">
      <a className="brand" href="#top"><b>游记</b><span>Game Journal</span></a>
      <nav aria-label="主导航">
        <button className={tab === 'journal' ? 'nav-active' : ''} onClick={() => setTab('journal')}><Icon name="pen" />日记</button>
        <button className={tab === 'review' ? 'nav-active' : ''} onClick={() => setTab('review')}><Icon name="clock" />回顾</button>
        <button className={tab === 'settings' ? 'nav-active' : ''} onClick={() => setTab('settings')}><Icon name="gear" />设置</button>
      </nav>
      <p className="rail-note">记录游戏，<br />也记录自己。</p>
    </aside>

    <main id="top" className="workspace">
      <section className="notebook" aria-label="今日游戏随笔">
        <header className="notebook-header"><h1>今日 · {draft.date}</h1><button onClick={save}>存为草稿</button></header>
        <label>游戏标题<input value={draft.game} onChange={event => update('game', event.target.value)} placeholder="今天玩了什么？" /></label>
        <div className="row-fields"><label>游玩日期<input type="date" value={draft.date} onChange={event => update('date', event.target.value)} /></label><label>游玩时长（本次）<input value={draft.playtime} onChange={event => update('playtime', event.target.value)} placeholder="如 3.5 小时" /></label></div>
        <fieldset><legend>评分</legend><div className="rating">{[1, 2, 3, 4, 5].map(value => <button key={value} aria-label={`${value} 星`} className={value <= draft.rating ? 'rated' : ''} onClick={() => update('rating', value)}>★</button>)}<span>{draft.rating} / 5</span></div></fieldset>
        <label>此刻的感受<textarea value={draft.feeling} onChange={event => update('feeling', event.target.value)} placeholder="随便写写：哪一段爽到了、卡在哪里、有没有想起别的游戏……" /></label>
        <label>难忘的瞬间<textarea className="moment" value={draft.moment} onChange={event => update('moment', event.target.value)} placeholder="一个画面、一场战斗或一句台词（可选）" /></label>
        <div className="screenshots"><span>截图（最多 6 张）</span><div className="thumbs">{previews.map((url, index) => <button className="thumb" key={url} onClick={() => setFiles(current => current.filter((_, itemIndex) => itemIndex !== index))}><img src={url} alt={`待保存截图 ${index + 1}`} /><i>×</i></button>)}{files.length < 6 && <label className="add-shot"><Icon name="plus" /><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addFiles} /></label>}</div></div>
        <p className="privacy">截图与日记只保存在当前浏览器；导出时由你决定要发到哪里。</p>
      </section>

      <aside className="review-pane">
        <section className="review-card"><header><h2>Steam 评测预览</h2><Icon name="steam" /></header><div className={`verdict ${review.verdict === '推荐' ? 'positive' : review.verdict === '不推荐' ? 'negative' : ''}`}>{review.verdict}</div><h3>{review.title}</h3><small>发布于 · {draft.date}{draft.playtime ? ` · 总时数 ${draft.playtime}` : ''}</small><p>{review.body}</p><p className="score">评分：<b>{'★'.repeat(draft.rating)}{'☆'.repeat(5 - draft.rating)}</b> ({draft.rating}/5)</p></section>
        <section className="markdown-card"><header><h2>Markdown 导出预览</h2><button className="icon-button" onClick={() => copy(review.markdown, 'Markdown 已复制到剪贴板。')} aria-label="复制 Markdown"><Icon name="copy" /></button></header><pre>{review.markdown}</pre></section>
        <section className="export-card"><h2>导出</h2><div><button onClick={download}><Icon name="download" />导出 Markdown<small>.md 文件</small></button><button onClick={() => copy(review.markdown, 'Markdown 已复制到剪贴板。')}><Icon name="copy" />复制到剪贴板<small>GitHub-ready 格式</small></button></div><p>Steam 版可复制粘贴；最终发布仍由你在 Steam 内确认。</p></section>
      </aside>

      <section className="recent"><header><h2>{tab === 'review' ? '所有记录' : '最近记录'}</h2><span>{notice}</span></header><p className="sync-note">与 Agent 对话后写入仓库的随笔，会在下次静态页构建后同步到这里。</p><div className="recent-list">{[...entries, ...syncedEntries].length ? [...entries, ...syncedEntries].slice(0, tab === 'review' ? undefined : 4).map(entry => <RecentEntry key={entry.id} entry={entry} onDelete={remove} />) : <p className="empty">第一条随笔会在这里留下来。</p>}</div></section>
    </main>
  </div>
}
