import type { Draft, Entry, Review } from '../types'

const stars = (rating: number) => `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`

export function reviewFor(draft: Draft): Review {
  const verdict = draft.rating >= 4 ? '推荐' : draft.rating <= 2 ? '不推荐' : '暂不推荐'
  const memorable = draft.moment.trim() ? `\n\n最难忘的一刻：${draft.moment.trim()}` : ''
  const body = `${draft.feeling.trim() || '这次游玩的感受还没写完。'}${memorable}`
  const title = `${draft.game.trim() || '未命名游戏'} · ${draft.rating}/5`
  const markdown = [
    `# ${draft.game.trim() || '未命名游戏'}`,
    '',
    `- 日期：${draft.date}`,
    `- 游玩时长：${draft.playtime || '未记录'}`,
    `- 评分：${stars(draft.rating)} (${draft.rating}/5)`,
    '',
    '## 此刻的感受',
    '',
    draft.feeling.trim() || '这次游玩的感受还没写完。',
    ...(draft.moment.trim() ? ['', '## 难忘的瞬间', '', draft.moment.trim()] : []),
    '',
    '## Steam 评测草稿',
    '',
    `**${verdict}**`,
    '',
    body,
    '',
  ].join('\n')
  return { verdict, title, body, markdown }
}

export function markdownForEntry(entry: Entry) {
  return reviewFor(entry).markdown
}
