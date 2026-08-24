import { useEffect, useMemo, useState } from 'react'
import { JournalHeader } from './components/JournalHeader'
import { GameDetail } from './components/GameDetail'
import { GameShelf } from './components/GameShelf'
import type { JournalData, JournalGame } from './types'

type View = 'shelf' | 'notes' | 'about' | 'detail'

const EMPTY: JournalData = { games: [] }

export default function App() {
  const [journal, setJournal] = useState<JournalData>(EMPTY)
  const [view, setView] = useState<View>('shelf')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [category, setCategory] = useState('全部')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}journal-data.json`)
      .then(response => response.ok ? response.json() : EMPTY)
      .then((payload: JournalData) => setJournal(Array.isArray(payload.games) ? payload : EMPTY))
      .catch(() => setJournal(EMPTY))
  }, [])

  const selected = useMemo(() => journal.games.find(game => game.id === selectedId) ?? null, [journal, selectedId])
  const categories = useMemo(() => ['全部', ...new Set(journal.games.flatMap(game => game.categories))], [journal.games])
  const filtered = useMemo(() => category === '全部' ? journal.games : journal.games.filter(game => game.categories.includes(category)), [category, journal.games])
  const changeView = (next: Exclude<View, 'detail'>) => {
    setView(next)
    setSelectedId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const openGame = (game: JournalGame) => {
    setSelectedId(game.id)
    setView('detail')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return <div className="site-shell">
    <JournalHeader view={view} onChange={changeView} />
    <main>
      {view === 'detail' && selected ? <GameDetail game={selected} onBack={() => changeView('shelf')} /> : null}
      {view === 'shelf' ? <GameShelf games={filtered} categories={categories} activeCategory={category} onCategoryChange={setCategory} onOpen={openGame} /> : null}
      {view === 'notes' ? <section className="reading-page note-index"><div className="page-intro"><p className="eyeless-label">所有随笔</p><h1>一些还在生长的感受</h1><p>这里收录每一次游玩后留下的片段。它们不急着变成结论。</p></div><div className="all-notes">{journal.games.flatMap(game => game.notes.map(note => ({ game, note }))).sort((a, b) => b.note.date.localeCompare(a.note.date)).map(({ game, note }) => <button className="note-row" key={note.id} onClick={() => openGame(game)}><time>{note.date}</time><div><span>{game.title}</span><strong>{note.title || note.feeling}</strong></div><i>阅读</i></button>)}{journal.games.length === 0 && <p className="quiet-empty">第一篇公开随笔，会从一次真实的游玩开始。</p>}</div></section> : null}
      {view === 'about' ? <section className="reading-page about-page"><div className="page-intro"><p className="eyeless-label">关于这个地方</p><h1>记录游戏，也记录自己。</h1><p>这是一个由玩家本人慢慢补完的游戏博客。游戏架保存结论，随笔留下过程。</p></div><div className="about-copy"><p>这里没有即时编辑器，也不追求把每一次感受立刻变成完整文章。日常碎碎念先在对话中被保留，经过整理后，再作为公开随笔与评测写回仓库。</p><p>所以，页面展示的是已经愿意分享的部分；原始的、尚未成文的记录仍然留在游记工作流里。</p></div></section> : null}
    </main>
    <footer><span>游记</span><span>记录我玩过的游戏，也记录我走过的路。</span></footer>
  </div>
}
