export type JournalNote = {
  id: string
  date: string
  createdAt: string
  title?: string
  feeling: string
  moment?: string
}

export type JournalReview = {
  title?: string
  verdict?: '推荐' | '暂不推荐' | '不推荐'
  content: string
  updatedAt?: string
}

export type JournalGame = {
  id: string
  title: string
  categories: string[]
  rating: number
  summary?: string
  status?: string
  playtime?: string
  lastPlayedAt?: string
  cover?: string
  review?: JournalReview
  notes: JournalNote[]
}

export type JournalData = { games: JournalGame[] }
