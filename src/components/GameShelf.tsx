import type { MouseEvent } from 'react'
import type { JournalGame } from '../types'
import { assetUrl, gameHref, platformOf, platforms, recordedDate, scoresOf, type Platform } from '../lib/journal'
import { studioOf } from '../lib/box-branding'
import { useCaseArtwork } from '../lib/useCaseArtwork'
import { PlatformBrand } from './PlatformBrand'
import { caseOverallScore, ShelfScore } from './ScorePanel'

type ShelfProps = {
  games: JournalGame[]
  categories: string[]
  activeCategory: string
  onCategoryChange: (category: string) => void
  onOpen: (game: JournalGame) => void
  query: string
  onQueryChange: (query: string) => void
  filter: string
  onFilterChange: (filter: string) => void
  platform: Platform | 'all'
  onPlatformChange: (platform: Platform | 'all') => void
}

function GameSpine({ game, onOpen }: Pick<ShelfProps, 'onOpen'> & { game: JournalGame }) {
  const platform = platformOf(game)
  const date = recordedDate(game)
  const finish = [...game.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5
  const studio = studioOf(game)
  const scores = scoresOf(game)
  const score = caseOverallScore(scores)
  const scoreLabel = score ? `${score.label} ${score.value}${score.scale ? `/${score.scale}` : ' 分'}${score.qualifier || ''}` : scores.length ? '有分项评分' : ''
  const { src: cover, onError } = useCaseArtwork(game)
  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    onOpen(game)
  }
  return <li className="cabinet-slot">
    <a className="game-spine" href={gameHref(game.id)} data-case={platform} data-finish={finish}
      title={[game.title, platforms[platform], studio?.name, date, scoreLabel].filter(Boolean).join(' / ')}
      aria-label={scoreLabel ? `${game.title}，${scoreLabel}` : game.title} onClick={open}>
      <span className="spine-shell">
        <PlatformBrand platform={platform} className="spine-cap" />
        <span className="spine-face">
          {cover && <img key={cover} src={cover} alt="" loading="lazy" decoding="async" onError={onError} />}
          <span className="spine-title">{game.title}</span>
        </span>
        {scores.length > 0 && <ShelfScore score={score} />}
        <span className="spine-studio" aria-hidden="true">{studio && (studio.logo
          ? <img src={assetUrl(`media/marks/${studio.logo}`)} alt="" loading="lazy" />
          : <span>{studio.name}</span>)}</span>
      </span>
    </a>
  </li>
}

export function GameShelf({ games, categories, activeCategory, onCategoryChange, onOpen, query, onQueryChange, filter, onFilterChange, platform, onPlatformChange }: ShelfProps) {
  const years = new Map<string, JournalGame[]>()
  for (const game of games.slice().sort((a, b) => recordedDate(b).localeCompare(recordedDate(a)))) {
    const year = recordedDate(game).slice(0, 4)
    const shelf = years.get(year)
    if (shelf) shelf.push(game)
    else years.set(year, [game])
  }
  const isFiltered = !!query || filter !== 'all' || activeCategory !== '全部' || platform !== 'all'

  return <section id="top" className="shelf-page">
    <header className="shelf-heading">
      <div><h1>我的游戏柜</h1><p>把时间交给故事，把自己留在里面。</p></div>
      <div className="shelf-inventory"><strong>{games.length}</strong><span>个游戏<br />按最近记录排列</span></div>
    </header>
    <div className="shelf-tools">
      <label className="shelf-search">查找游戏
        <span className="search-field"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4 4" /></svg>
          <input type="search" value={query} onChange={e => onQueryChange(e.target.value)} placeholder="游戏名或评测里的话" />
        </span>
      </label>
      <label>平台<select value={platform} onChange={e => onPlatformChange(e.target.value as ShelfProps['platform'])}>
        <option value="all">全部平台</option>{Object.entries(platforms).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
      </select></label>
      <label>分类<select value={activeCategory} onChange={e => onCategoryChange(e.target.value)}>
        {categories.map(category => <option value={category} key={category}>{category}</option>)}
      </select></label>
      <div className="content-filters" role="group" aria-label="内容筛选">{[['all', '全部内容'], ['reviews', '有评测'], ['screenshots', '有截图']].map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => onFilterChange(id)}>{label}</button>)}</div>
    </div>
    <div className="cabinet-guide">
      <span className="guide-pointer">选一盒，打开游玩记录</span>
      {isFiltered && <button className="reset-filters" onClick={() => { onQueryChange(''); onFilterChange('all'); onCategoryChange('全部'); onPlatformChange('all') }}>清除筛选 ×</button>}
    </div>
    <div className="game-cabinet">
      {[...years].map(([year, shelf]) => <section className="cabinet-year" key={year} aria-labelledby={`shelf-year-${year || 'undated'}`}>
        <header className="shelf-plaque"><h2 id={`shelf-year-${year || 'undated'}`}>{year || '未标日期'}</h2><span>{shelf.length} 盒</span></header>
        <ul className="cabinet-row">{shelf.map(game => <GameSpine key={game.id} game={game} onOpen={onOpen} />)}</ul>
      </section>)}
      {!games.length && <div className="shelf-empty" role="status"><strong>{isFiltered ? '没有符合筛选的游戏' : '游戏柜还是空的'}</strong><p>{isFiltered ? '换个关键词或清除筛选试试。' : '有新的游玩记录时，会摆到这里。'}</p></div>}
    </div>
  </section>
}
