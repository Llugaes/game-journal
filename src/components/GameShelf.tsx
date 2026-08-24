import type { JournalGame } from '../types'

const coverTone = ['cover-moss', 'cover-ink', 'cover-umber', 'cover-blue', 'cover-plum', 'cover-ash']
const stars = (rating: number) => `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`

function Cover({ game, index }: { game: JournalGame; index: number }) {
  return <div className={`game-cover ${coverTone[index % coverTone.length]}`} style={game.cover ? { backgroundImage: `url(${game.cover})` } : undefined}><span>{game.cover ? '' : game.title}</span></div>
}

export function GameShelf({ games, categories, activeCategory, onCategoryChange, onOpen }: { games: JournalGame[]; categories: string[]; activeCategory: string; onCategoryChange: (category: string) => void; onOpen: (game: JournalGame) => void }) {
  const featured = games[0]
  return <section id="top" className="shelf-page"><div className="shelf-heading"><div><h1>我玩过的世界</h1><p>把时间交给故事，把自己留在里面。</p></div><span>{games.length ? `${games.length} 个游戏` : '等待第一段旅程'}</span></div><div className="shelf-layout"><aside className="category-rail" aria-label="游戏分类">{categories.map(category => <button key={category} className={activeCategory === category ? 'active' : ''} onClick={() => onCategoryChange(category)}>{category}</button>)}</aside><div className="game-grid">{games.map((game, index) => <button className="game-card" key={game.id} onClick={() => onOpen(game)}><Cover game={game} index={index} /><span className="game-title">{game.title}</span><small>{game.summary || game.notes.at(-1)?.feeling || '还在等待第一条公开随笔。'}</small><footer><time>{game.lastPlayedAt || game.notes.at(-1)?.date || ''}</time><b>{stars(game.rating)}</b></footer></button>)}{games.length === 0 && <div className="shelf-empty"><strong>游戏架正在整理</strong><p>下一次愿意公开的游玩心得，会从这里长成一张游戏卡。</p></div>}</div>{featured ? <aside className="featured-review"><p>本期精选</p><Cover game={featured} index={0} /><h2>{featured.title}</h2><div className="rating-line">{stars(featured.rating)}</div><blockquote>{featured.review?.content || featured.summary || featured.notes.at(-1)?.feeling}</blockquote><button onClick={() => onOpen(featured)}>阅读这款游戏 →</button></aside> : <aside className="featured-review empty-feature"><p>公开评测</p><h2>尚未开始</h2><blockquote>当一款游戏的碎碎念足够多，它会在这里成为一篇完整的评测。</blockquote></aside>}</div></section>
}
