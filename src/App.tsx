import { useEffect, useMemo, useState } from 'react'
import { JournalHeader } from './components/JournalHeader'
import { GameDetail } from './components/GameDetail'
import { GameShelf } from './components/GameShelf'
import { reviewsOf } from './lib/journal'
import type { JournalData, JournalGame } from './types'

type View = 'shelf' | 'notes' | 'about' | 'detail'
const EMPTY: JournalData = { games: [] }
const gameFromHash = () => new URLSearchParams(window.location.hash.slice(1)).get('game')

export default function App() {
  const [journal, setJournal] = useState<JournalData>(EMPTY)
  const [view, setView] = useState<View>(gameFromHash() ? 'detail' : 'shelf')
  const [selectedId, setSelectedId] = useState<string | null>(gameFromHash)
  const [category, setCategory] = useState('全部')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}journal-data.json`)
      .then(response => { if (!response.ok) throw new Error('加载失败'); return response.json() })
      .then((payload: JournalData) => { if (!Array.isArray(payload.games)) throw new Error('数据格式错误'); setJournal(payload); setState('ready') })
      .catch(() => setState('error'))
    const onHash = () => {
      const id = gameFromHash()
      setSelectedId(id)
      setView(id ? 'detail' : 'shelf')
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const selected = useMemo(() => journal.games.find(game => game.id === selectedId) ?? null, [journal, selectedId])
  const categories = useMemo(() => ['全部', ...new Set(journal.games.flatMap(game => game.categories))], [journal.games])
  const filtered = useMemo(() => journal.games.filter(game => {
    const text = [game.title, game.originalTitle, game.summary, ...reviewsOf(game).map(r => r.content)].join(' ').normalize('NFKC').replaceAll('亰', '京').toLocaleLowerCase()
    return (category === '全部' || game.categories.includes(category)) && text.includes(query.normalize('NFKC').replaceAll('亰', '京').toLocaleLowerCase().trim()) && (filter !== 'reviews' || reviewsOf(game).length > 0) && (filter !== 'screenshots' || !!game.screenshots?.length)
  }), [category, query, filter, journal.games])
  const changeView = (next: Exclude<View, 'detail'>) => {
    history.replaceState(null, '', window.location.pathname + window.location.search)
    setView(next)
    setSelectedId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const openGame = (game: JournalGame) => {
    window.location.hash = `game=${encodeURIComponent(game.id)}`
    setSelectedId(game.id)
    setView('detail')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const notes = journal.games.flatMap(game => [
    ...game.notes.map(note => ({ game, id: note.id, date: note.date, title: note.title || note.feeling, kind: '随笔' })),
    ...(game.screenshots || []).map(shot => ({ game, id: shot.id, date: shot.date, title: shot.caption || shot.title || '一张游戏截图', kind: '截图' })),
  ]).sort((a, b) => b.date.localeCompare(a.date))

  return <div className="site-shell">
    <JournalHeader view={view} onChange={changeView} />
    <main>
      {state === 'loading' && <p className="load-message" role="status">正在打开游戏架…</p>}
      {state === 'error' && <p className="load-message" role="alert">游戏架暂时加载失败，请刷新页面重试。</p>}
      {state === 'ready' && <>
        {view === 'detail' && selected ? <GameDetail game={selected} onBack={() => changeView('shelf')} /> : null}
        {view === 'detail' && !selected && <p className="load-message">没有找到这款游戏。<button onClick={() => changeView('shelf')}>返回游戏架</button></p>}
        {view === 'shelf' ? <GameShelf games={filtered} categories={categories} activeCategory={category} onCategoryChange={setCategory} onOpen={openGame} query={query} onQueryChange={setQuery} filter={filter} onFilterChange={setFilter} /> : null}
        {view === 'notes' ? <section className="reading-page note-index"><div className="page-intro"><p className="eyeless-label">随笔与截图</p><h1>一些还在生长的感受</h1><p>游玩时留下的画面，和当时写下的话。</p></div><div className="all-notes">{notes.map(note => <button className="note-row" key={`${note.game.id}-${note.id}`} onClick={() => openGame(note.game)}><time>{note.date}</time><div><span>{note.game.title} · {note.kind}</span><strong>{note.title}</strong></div><i>阅读</i></button>)}{notes.length === 0 && <p className="quiet-empty">第一篇公开随笔，会从一次真实的游玩开始。</p>}</div></section> : null}
        {view === 'about' ? <section className="reading-page about-page"><div className="page-intro"><p className="eyeless-label">关于这个地方</p><h1>记录游戏，也记录自己。</h1><p>这是一个由玩家本人慢慢补完的游戏博客。游戏架保存结论，随笔和截图留下过程。</p></div><div className="about-copy"><p>这里收录我在 Steam 发表的评测、截图和自己写下的说明，也会继续添加新的游玩随笔。</p><p>搬来的文字保留原话，每篇评测和每张截图都能回到 Steam 来源。推荐与否沿用当时的结论，没有打过的分数就留空。</p></div></section> : null}
      </>}
    </main>
    <footer><span>游记</span><span>记录我玩过的游戏，也记录我走过的路。</span></footer>
  </div>
}
