import type { JournalGame } from '../types'
import { assetUrl, recordedDate, reviewsOf, scoresOf } from '../lib/journal'
import { ScorePanel } from './ScorePanel'
import { RecommendationBadge } from './RecommendationBadge'

export function GameDetail({ game, onBack }: { game: JournalGame; onBack: () => void }) {
  const reviews = reviewsOf(game)
  const screenshots = game.screenshots || []
  return <section className="game-detail">
    <button className="back-link" onClick={onBack}>← 返回游戏架</button>
    <div className="detail-layout"><article>
      <header className="detail-title">
        <h1>{game.title}</h1>
        {game.originalTitle && game.originalTitle !== game.title && <p className="original-title">{game.originalTitle}</p>}
        <p>{game.categories.join(' · ') || '个人游戏记录'}{game.playtime ? ` · ${game.playtime}` : ''}</p>
        <div className="detail-rating"><RecommendationBadge verdict={reviews[0]?.verdict} /></div>
        <ScorePanel scores={scoresOf(game)} />
        {screenshots.length > 0 && <button className="gallery-jump" onClick={() => document.getElementById('screenshots')?.scrollIntoView({ behavior: 'smooth' })}>查看 {screenshots.length} 张截图 ↓</button>}
      </header>
      {reviews.map((review, index) => <section className="review-copy" key={review.id || index}>
        <h2>{review.title || '游戏评测'}</h2>
        <div className="source-meta">
          {review.source && <a href={review.source.url} target="_blank" rel="noreferrer">{review.source.authorName} · Steam 原文 ↗</a>}
          {review.postedAt && <span>发布于 {review.postedAt}</span>}
          {review.updatedAt && review.updatedAt !== review.postedAt && <span>更新于 {review.updatedAt}</span>}
          {review.playtimeAtReview && <span>评测时 {review.playtimeAtReview} 小时</span>}
          {reviews.length > 1 && <RecommendationBadge verdict={review.verdict} compact />}
        </div>
        <p>{review.title && review.content.startsWith(`${review.title}\n`) ? review.content.slice(review.title.length).trimStart() : review.content}</p>
      </section>)}
      {!reviews.length && game.summary && <section className="review-copy"><p>{game.summary}</p></section>}
      {screenshots.length > 0 && <section className="screenshot-gallery" id="screenshots">
        <h2>留下的画面 <span>{screenshots.length}</span></h2>
        <p className="gallery-intro">截图和当时写下的话。点击图片可查看大图。</p>
        <div className="screenshot-grid">{screenshots.map(shot => <figure key={shot.id}>
          <a href={assetUrl(shot.src)} target="_blank" rel="noreferrer" aria-label={`查看 ${game.title} 的截图大图`}>
            <img src={assetUrl(shot.src)} alt={shot.caption || shot.title || `${game.title} 的游戏截图`} width={shot.width} height={shot.height} loading="lazy" />
          </a>
          <figcaption>
            <div className="source-meta"><time>{shot.date}</time>{shot.source && <a href={shot.source.url} target="_blank" rel="noreferrer">{shot.source.authorName} · Steam 原图 ↗</a>}</div>
            {shot.title && <h3>{shot.title}</h3>}
            {shot.caption && shot.caption !== shot.title && <p>{shot.caption}</p>}
            {shot.comments.map(comment => <blockquote key={comment.id}><p>{comment.content}</p>{comment.createdAt && <time>{comment.createdAt.slice(0, 10)}</time>}</blockquote>)}
          </figcaption>
        </figure>)}</div>
      </section>}
      {game.notes.length > 0 && <section className="note-timeline"><h2>游玩随笔 <span>{game.notes.length}</span></h2>
        {game.notes.slice().sort((a, b) => b.date.localeCompare(a.date)).map(note => <article className="timeline-note" key={note.id}><time>{note.date}</time><div><h3>{note.title || '一则游玩记录'}</h3><p>{note.feeling}</p>{note.moment && <blockquote>{note.moment}</blockquote>}</div></article>)}
      </section>}
    </article><aside className="detail-aside">
      <div className={`detail-cover ${game.cover ? 'has-cover' : ''}`} style={game.cover ? { backgroundImage: `url(${assetUrl(game.cover)})` } : undefined}><span>{game.cover ? '' : game.title}</span></div>
      <dl><div><dt>分类</dt><dd>{game.categories.join('、') || '未分类'}</dd></div>
        {game.status && <div><dt>游玩状态</dt><dd>{game.status}</dd></div>}
        {game.playtime && <div><dt>游玩时长</dt><dd>{game.playtime}</dd></div>}
        <div><dt>最近记录</dt><dd>{recordedDate(game) || '—'}</dd></div>
        <div><dt>内容</dt><dd>{reviews.length} 篇评测 · {screenshots.length} 张截图</dd></div>
      </dl>
    </aside></div>
  </section>
}
