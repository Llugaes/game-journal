const number = String.raw`(?:100|[1-9]?\d)(?:\.\d+)?`
const value = String.raw`${number}(?:\s*[-–~～]\s*${number}|\s*[（(]\s*${number}\s*[）)])?`
const labels = '原版|极版|[一二三四五六七八九十0-9]+代|游戏体验|白金体验|游戏本体素质|游戏本身|冷饭价值|个人总分|个人评分|总分|评分|剧情|画面|配乐|体量|战斗|游戏演出表现|战斗系统'
const fraction = new RegExp(`^(?:(${labels})[：:\\s]*)?(${value})\\s*[/／]\\s*(10|100|5)(?!\\d)`)
const add = (scores, score) => {
  const values = score.value.match(/\d+(?:\.\d+)?/g).map(Number)
  if (values.some(n => n < 0 || n > (score.scale || 10))) return
  if (!scores.some(s => s.label === score.label && s.value === score.value && s.scale === score.scale)) scores.push(score)
}

// 识别明确的评分行和维度标签；不扫描正文任意位置的数字。
export function extractScores(content) {
  const scores = []
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  for (const line of lines) {
    let rest = line
    let first = true
    while (rest) {
      const match = rest.match(fraction)
      if (!match || (!first && !match[1])) break
      add(scores, { label: match[1] || '总评', value: match[2].replace(/\s/g, ''), scale: Number(match[3]), evidence: line })
      rest = rest.slice(match[0].length).trim()
      first = false
    }
    const plot = line.match(new RegExp(`^(剧情|画面|配乐|战斗)总的来说\\s*(${value})\\s*[/／]\\s*(10|100|5)(?!\\d)`))
    if (plot) add(scores, { label: plot[1], value: plot[2], scale: Number(plot[3]), evidence: line })
    const game = line.match(new RegExp(`^(${number})\\s*分给游戏(?:[，,。]|$)`))
    if (game) add(scores, { label: '总评', value: game[1], evidence: line })
    const lowerBound = line.match(new RegExp(`^游戏本身\\s*(${number})\\s*分(以上)?$`))
    if (lowerBound) add(scores, { label: '总评', value: lowerBound[1], qualifier: lowerBound[2], evidence: line })
    const dimensions = new RegExp(`(?:^|[，,])(?:但)?((?:画面|配乐|剧情|体量|战斗)(?:、(?:画面|配乐|剧情|体量|战斗))*)我(?:可以|只能)?给\\s*(${value})\\s*分`, 'g')
    for (const match of line.matchAll(dimensions)) add(scores, { label: match[1], value: match[2], evidence: line })
  }
  // 独立的维度标题如“剧情 9”，只有同文明确采用十分制时才继承分母。
  if (scores.some(s => s.scale === 10)) {
    for (const line of lines) {
      const match = line.match(new RegExp(`^(剧情|画面|配乐|战斗|游戏演出表现|战斗系统)\\s+(${number})$`))
      if (match) add(scores, { label: match[1], value: match[2], scale: 10, evidence: line })
    }
  }
  return scores
}

export function enrichJournal(journal, titles = {}, overrides = {}) {
  return { games: journal.games.map(game => {
    const official = titles[game.steamAppId]
    return {
      ...game,
      ...(official ? { title: official.title, originalTitle: game.title, titleSource: official.source } : {}),
      review: game.review ? enrichReview(game.review, overrides) : undefined,
      reviews: (game.reviews || []).map(review => enrichReview(review, overrides)),
    }
  }) }
}

function enrichReview(review, overrides) {
  const scores = overrides[review.id] || extractScores(review.content)
  for (const score of scores) {
    if (!score.evidence || !review.content.includes(score.evidence)) throw new Error(`评分证据已变化: ${review.id}`)
    if (!new RegExp(`^${value}$`).test(score.value) || (score.scale && ![5, 10, 100].includes(score.scale))) throw new Error(`评分格式错误: ${review.id}`)
  }
  return { ...review, scores }
}
