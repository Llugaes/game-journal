import type { JournalGame } from '../types'
import { assetUrl, recordedDate, reviewsOf, scoresOf } from '../lib/journal'
import { ScorePanel } from './ScorePanel'
import { RecommendationBadge } from './RecommendationBadge'

const coverTone = ['cover-moss', 'cover-ink', 'cover-umber', 'cover-blue', 'cover-plum', 'cover-ash']
function Cover({ game, index }: { game: JournalGame; index: number }) {
  return <div aria-hidden="true" className={`game-cover ${coverTone[index % coverTone.length]} ${game.cover ? 'has-cover' : ''}`}>
    {game.cover ? <img src={assetUrl(game.cover)} alt="" loading="lazy" /> : <span>{game.title}</span>}
  </div>
}

export function GameShelf({ games, categories, activeCategory, onCategoryChange, onOpen, query, onQueryChange, filter, onFilterChange }: { games: JournalGame[]; categories: string[]; activeCategory: string; onCategoryChange: (category: string) => void; onOpen: (game: JournalGame) => void; query: string; onQueryChange: (query: string) => void; filter: string; onFilterChange: (filter: string) => void }) {
  const featured = games.find(game => reviewsOf(game).length)
  return <section id="top" className="shelf-page">
    <div className="shelf-heading"><div><h1>我玩过的世界</h1><p>把时间交给故事，把自己留在里面。</p></div><span>{games.length} 个游戏</span></div>
    <div className="shelf-tools"><label>查找游戏<input type="search" value={query} onChange={e => onQueryChange(e.target.value)} placeholder="游戏名或评测里的话" /></label><div className="content-filters" aria-label="内容筛选">{[['all', '全部内容'], ['reviews', '有评测'], ['screenshots', '有截图']].map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => onFilterChange(id)}>{label}</button>)}</div>
      {(query || filter !== 'all' || activeCategory !== '全部') && <button className="reset-filters" onClick={() => { onQueryChange(''); onFilterChange('all'); onCategoryChange('全部') }}>清除筛选 ×</button>}
    </div>
    <div className="shelf-layout">
      <aside className="category-rail" aria-label="游戏分类">{categories.map(category => <button key={category} className={activeCategory === category ? 'active' : ''} onClick={() => onCategoryChange(category)}>{category}</button>)}</aside>
      <div className="game-grid">{games.map((game, index) => <button className="game-card" key={game.id} onClick={() => onOpen(game)}>
        <Cover game={game} index={index} /><span className="game-title">{game.title}</span><small>{game.summary || game.notes.at(-1)?.feeling || game.screenshots?.[0]?.caption || '留下的游戏画面'}</small>
        <ScorePanel scores={scoresOf(game)} compact />
        <span className="card-counts">{[reviewsOf(game).length ? `${reviewsOf(game).length} 篇评测` : '', game.screenshots?.length ? `${game.screenshots.length} 张截图` : ''].filter(Boolean).join(' · ')}</span>
        <footer><time>{recordedDate(game)}</time><RecommendationBadge verdict={reviewsOf(game)[0]?.verdict} compact /></footer>
      </button>)}{games.length === 0 && <div className="shelf-empty"><strong>{query || filter !== 'all' ? '没有找到相关记录' : '游戏架正在整理'}</strong><p>{query || filter !== 'all' ? '换个关键词或内容筛选试试。' : '下一次愿意公开的游玩心得，会从这里长成一张游戏卡。'}</p></div>}</div>
      {featured ? <aside className="featured-review"><p>最近评测</p><Cover game={featured} index={0} /><h2>{featured.title}</h2><ScorePanel scores={scoresOf(featured)} compact /><div className="rating-line"><RecommendationBadge verdict={reviewsOf(featured)[0]?.verdict} compact /></div><blockquote>{reviewsOf(featured)[0]?.content.slice(0, 220)}{(reviewsOf(featured)[0]?.content.length || 0) > 220 ? '…' : ''}</blockquote><button onClick={() => onOpen(featured)}>阅读全文 →</button></aside> : null}
    </div>
  </section>
}
