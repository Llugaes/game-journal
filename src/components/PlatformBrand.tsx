import { assetUrl, platforms, type Platform } from '../lib/journal'

const marks: Partial<Record<Platform, string>> = {
  steam: 'steam.svg',
  ps2: 'playstation.svg',
  ps4: 'playstation.svg',
  ps5: 'playstation.svg',
  vita: 'playstation.svg',
  switch: 'switch.webp',
  switch2: 'switch2.webp',
}

export function PlatformBrand({ platform, className }: { platform: Platform; className: string }) {
  const mark = marks[platform]
  const hasWordmark = platform === 'switch' || platform === 'switch2'
  return <span className={className} aria-hidden="true">
    {mark && <img className={hasWordmark ? 'platform-mark platform-mark--lockup' : 'platform-mark platform-mark--mono'} src={assetUrl(`media/marks/${mark}`)} alt="" />}
    {platform === 'pc' && <svg className="platform-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="12" rx="2" /><path d="M12 16v4m-5 0h10" />
    </svg>}
    {!hasWordmark && <span>{platform === 'unknown' ? '游记' : platforms[platform]}</span>}
  </span>
}
