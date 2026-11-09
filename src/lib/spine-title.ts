import type { Platform } from './journal'

const localizedVersion = /(?:[\s\-–—]*[（(～]\s*|[\s\-–—]*)(?:(第一章抢先|首章抢先|抢先|公开|网络|免费|序章|战斗|Windows|[αβ])\s*)?(体验版|试玩版|测试版)\s*[）)～]?$/iu
const englishVersion = /[\s\-–—（(]+(demo(?:\s+version)?|playtest|beta)\s*[）)]?$/iu
const platformSuffix = /\s*[（(](?:Nintendo\s+)?(Switch\s*2?|PS[2345]|PS\s*Vita|Steam|PC)\s*(?:版|Edition)?[）)]$/iu

const caseEditions: Readonly<Record<string, { name: string; edition: string }>> = {
  '真・三国无双２ with 猛将传 Remastered': { name: '真・三国无双２', edition: '猛将传重制' },
  '毁灭战士（2016）': { name: '毁灭战士', edition: '2016' },
  '异度神剑：终极版（Switch 2 版）': { name: '异度神剑', edition: '终极版' },
}

export function spineTitleParts(title: string) {
  return title.split(/([:：]|[0-9０-９]+(?:(?:st|nd|rd|th)\b)?)/gi).map((part, index) => {
    if (index % 2 === 0) return { text: part, kind: 'text' as const }
    if (part === ':' || part === '：') return { text: ':', kind: 'colon' as const }
    const text = part.normalize('NFKC')
    return { text, kind: /^\d{3,}$/.test(text) ? 'stacked' as const : 'number' as const }
  }).filter(part => part.text)
}

export function spineTitle(title: string, platform?: Platform): { name: string; version?: string; qualifier?: string; edition?: string } {
  if (Object.hasOwn(caseEditions, title)) return caseEditions[title]
  const unquoted = title.replace(/[《》〈〉]/g, '').trim()
  const platformNote = platformSuffix.exec(unquoted)
  const platformKey = platformNote?.[1].toLowerCase().replace(/\s+/g, '')
  const display = platformNote && (platform === platformKey || (platform === 'vita' && platformKey === 'psvita'))
    ? unquoted.slice(0, platformNote.index).trimEnd()
    : unquoted
  const suffix = localizedVersion.exec(display) ?? englishVersion.exec(display)
  if (!suffix) return { name: display || title }

  const name = display.slice(0, suffix.index).trimEnd()
  if (!name) return { name: display }

  if (!suffix[2]) return { name, version: /^demo/i.test(suffix[1]) ? '体验版' : '测试版' }
  const qualifier = suffix[1] === '第一章抢先' ? '首章抢先' : suffix[1]
  return { name, version: suffix[2], qualifier }
}
