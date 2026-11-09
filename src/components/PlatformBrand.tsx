import { assetUrl, platforms, type Platform } from '../lib/journal'

const marks: Partial<Record<Platform, string>> = {
  steam: 'steam.svg',
  ps2: 'playstation-classic.webp',
  ps4: 'playstation.svg',
  ps5: 'playstation.svg',
  switch: 'switch.webp',
  switch2: 'switch2.webp',
}

const wordmarks: Partial<Record<Platform, string>> = {
  ps2: 'ps2-word.webp', ps3: 'ps3-word.webp', ps4: 'ps4-word.webp',
  ps5: 'ps5-word.webp', vita: 'vita-word.webp',
}

export function PlatformBrand({ platform, className, spine = false }: { platform: Platform; className: string; spine?: boolean }) {
  const nintendo = platform === 'switch' || platform === 'switch2'
  const mark = nintendo && spine ? 'switch-icon.webp' : marks[platform]
  const wordmark = wordmarks[platform]
  const markStyle = nintendo ? (spine ? 'switch' : 'lockup') : platform === 'ps2' ? 'classic' : 'mono'
  return <span className={className} aria-hidden="true">
    {mark && <img className={`platform-mark platform-mark--${markStyle}`} src={assetUrl(`media/marks/${mark}`)} alt="" />}
    {wordmark && <img className="platform-wordmark platform-mark--mono" src={assetUrl(`media/marks/${wordmark}`)} alt="" />}
    {spine && platform === 'switch2' && <span className="platform-switch-number">2</span>}
    {platform === 'pc' && <svg className="platform-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="12" rx="2" /><path d="M12 16v4m-5 0h10" />
    </svg>}
    {!nintendo && !wordmark && <span>{platform === 'unknown' ? '游记' : platforms[platform]}</span>}
  </span>
}
