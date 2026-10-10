export type JournalNote = {
  id: string
  date: string
  createdAt: string
  title?: string
  feeling: string
  moment?: string
}

export type JournalReview = {
  id?: string
  title?: string
  verdict?: '推荐' | '暂不推荐' | '不推荐'
  content: string
  updatedAt?: string
  postedAt?: string
  playtimeAtReview?: string
  source?: SteamSource
}

export type SteamSource = { platform: 'steam'; url: string; profileId: string; authorName: string }
export type JournalScreenshot = {
  id: string
  src: string
  width: number
  height: number
  title?: string
  caption?: string
  date: string
  source?: SteamSource
  comments: { id: string; content: string; createdAt?: string }[]
}

export type JournalGame = {
  id: string
  title: string
  categories: string[]
  rating?: number
  summary?: string
  status?: string
  playtime?: string
  lastPlayedAt?: string
  recordedAt?: string
  steamAppId?: string
  cover?: string
  review?: JournalReview
  reviews?: JournalReview[]
  screenshots?: JournalScreenshot[]
  notes: JournalNote[]
}

export type JournalData = { games: JournalGame[] }
