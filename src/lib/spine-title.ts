const localizedVersion = /(?:[\s\-–—]*[（(～]\s*|[\s\-–—]*)(?:(第一章抢先|首章抢先|抢先|公开|网络|免费|序章|战斗|Windows|[αβ])\s*)?(体验版|试玩版|测试版)\s*[）)～]?$/iu
const englishVersion = /[\s\-–—（(]+(demo(?:\s+version)?|playtest|beta)\s*[）)]?$/iu

const caseEditions: Readonly<Record<string, { name: string; edition: string }>> = {
  '真・三国无双２ with 猛将传 Remastered': { name: '真・三国无双２', edition: '猛将传重制' },
  '毁灭战士（2016）': { name: '毁灭战士', edition: '2016' },
  '异度神剑：终极版（Switch 2 版）': { name: '异度神剑', edition: '终极版' },
}

export function spineTitle(title: string): { name: string; version?: string; qualifier?: string; edition?: string } {
  if (Object.hasOwn(caseEditions, title)) return caseEditions[title]
  const suffix = localizedVersion.exec(title) ?? englishVersion.exec(title)
  if (!suffix) return { name: title }

  const name = title.slice(0, suffix.index).trimEnd()
  if (!name) return { name: title }

  if (!suffix[2]) return { name, version: /^demo/i.test(suffix[1]) ? '体验版' : '测试版' }
  const qualifier = suffix[1] === '第一章抢先' ? '首章抢先' : suffix[1]
  return { name, version: suffix[2], qualifier }
}
