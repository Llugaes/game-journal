export type Draft = {
  game: string
  date: string
  playtime: string
  rating: number
  feeling: string
  moment: string
}

export type Entry = Draft & {
  id: string
  createdAt: string
  imageIds: string[]
}

export type Review = {
  verdict: '推荐' | '暂不推荐' | '不推荐'
  title: string
  body: string
  markdown: string
}
