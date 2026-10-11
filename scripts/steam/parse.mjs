import { load } from 'cheerio'

export const profileUrl = id => `https://steamcommunity.com/profiles/${id}`
export const fileUrl = id => `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`
export const clean = text => String(text ?? '').replace(/\s+/g, ' ').trim()

// 只提取正文；不执行网页脚本，也不把网页 HTML 带到站点中。
export function plainText(element) {
  const copy = element.clone()
  copy.find('script, style').remove()
  copy.find('br').replaceWith('\n')
  copy.find('img').each((_, node) => { copy.find(node).replaceWith(node.attribs.alt || '') })
  copy.find('a').each((_, node) => {
    const a = copy.find(node)
    const href = a.attr('href')
    if (href?.startsWith('https://') && clean(a.text()) !== href) a.append(` (${href})`)
  })
  copy.find('div, p, li, blockquote, h1, h2, h3').prepend('\n').append('\n')
  return copy.text().replace(/\r/g, '').split('\n').map(line => line.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// Steam 英文公开页面省略当年的年份；保留原始日期文字供核查。
export function steamDate(text, now = new Date()) {
  const match = text.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:,?\s+(\d{4}))?/i)
  if (!match) throw new Error(`无法识别 Steam 日期: ${text}`)
  const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(match[2].slice(0, 3).toLowerCase())
  let year = Number(match[3] || now.getUTCFullYear())
  if (!match[3] && Date.UTC(year, month, Number(match[1])) > now.getTime() + 86400000) year--
  return `${year}-${String(month + 1).padStart(2, '0')}-${match[1].padStart(2, '0')}`
}

export function parseReviewList(html, profile) {
  const $ = load(html)
  const countText = clean($('.workshopBrowsePagingInfo').first().text())
  const count = countText.match(/of\s+([\d,]+)\s+entries/)
  const totalText = count?.[1] ?? clean($('.review_stat .giantNumber').first().text())
  // 私密页面、登录页、错误页不能被当成空列表，否则会清空已有内容。
  if (!/^[\d,]+$/.test(totalText)) throw new Error(`评测列表不完整或不可公开访问: ${profile}`)
  const items = $('.review_box').map((_, node) => {
    const box = $(node)
    const url = box.find('.title a').attr('href')
    const appId = url?.match(/\/recommended\/(\d+)\//)?.[1]
    if (!appId || !url.startsWith(`${profileUrl(profile)}/recommended/`)) throw new Error('评测归属或 AppID 异常')
    return { appId, url, capsule: box.find('.game_capsule').attr('src') }
  }).get()
  const total = Number(totalText.replaceAll(',', ''))
  return { total, pages: Math.ceil(total / 10), items }
}

export function parseReview(html, profile, appId, now) {
  const $ = load(html)
  const title = $('meta[property="og:title"]').attr('content')?.split(' :: Review for ').at(1)
  const content = plainText($('#ReviewText'))
  const dates = plainText($('.recommendation_date'))
  const posted = dates.match(/Posted:\s*([^\n]+)/)?.[1]
  const updated = dates.match(/Updated:\s*([^\n]+)/)?.[1] || posted
  const verdictText = clean($('.ratingSummary').text())
  if (!title || !content || !posted || !['Recommended', 'Not Recommended'].includes(verdictText)) throw new Error(`评测正文解析失败: ${appId}`)
  const authorName = $('meta[property="og:title"]').attr('content').split(' :: ')[1]
  const hours = clean($('.playTime').text())
  return {
    appId, gameTitle: title,
    review: {
      id: `steam-review-${profile}-${appId}`,
      title: clean($('#ReviewText .bb_h1').first().text()) || 'Steam 评测',
      verdict: verdictText === 'Recommended' ? '推荐' : '不推荐',
      content, rawText: $('#ReviewEditTextArea').text() || undefined,
      postedAt: steamDate(posted, now), updatedAt: steamDate(updated, now),
      originalDateText: dates,
      playtimeAtReview: hours.match(/([\d.,]+) hrs at review time/)?.[1],
      source: { platform: 'steam', url: `${profileUrl(profile)}/recommended/${appId}/`, profileId: profile, authorName },
    },
  }
}

export function parseScreenshotList(html) {
  const $ = load(html)
  if (!$('#image_wall').length) throw new Error('截图列表不可访问或结构已改变')
  return $('a[data-publishedfileid]').map((_, node) => ({
    id: $(node).attr('data-publishedfileid'), appId: $(node).attr('data-appid'),
    hint: clean($(node).find('.imgWallHover').text()),
  })).get()
}

export function parseScreenshot(html, candidate, profile, now) {
  const $ = load(html)
  const creator = $('.creatorsBlock [data-miniprofile]').first().attr('data-miniprofile')
  const expected = (BigInt(profile) - 76561197960265728n).toString()
  if (creator !== expected) throw new Error(`截图 ${candidate.id} 作者不匹配`)
  const imageUrl = $('#ActualMedia').parent('a').attr('href') || $('#ActualMedia').attr('src')
  if (!imageUrl) throw new Error(`截图 ${candidate.id} 图片不可访问`)
  const appId = $('.screenshotAppName a').attr('href')?.match(/\/app\/(\d+)/)?.[1] || candidate.appId
  if (!appId || (candidate.appId && candidate.appId !== appId)) throw new Error(`截图 ${candidate.id} 游戏不匹配`)
  const title = plainText($('.workshopItemTitle'))
  const caption = $('#description').text().trim() || plainText($('.workshopItemDescription, .screenshotDescription').first())
  const labels = $('.detailsStatLeft').map((_, n) => clean($(n).text())).get()
  const values = $('.detailsStatRight').map((_, n) => clean($(n).text())).get()
  const dateText = values[labels.findIndex(label => label === 'Posted')]
  if (!dateText) throw new Error(`截图 ${candidate.id} 缺少时间`)
  const authorName = clean($('.friendBlockContent').first().clone().children().remove().end().text())
  const commentEntries = $('.commentthread_comment').map((_, node) => {
    const item = $(node)
    const author = item.find('.commentthread_comment_author[data-miniprofile], .commentthread_comment_author [data-miniprofile]').first().attr('data-miniprofile')
      || item.find('[data-miniprofile]').first().attr('data-miniprofile')
    const timestamp = item.find('[data-timestamp]').first().attr('data-timestamp')
    const hidden = item.find('.needs_content_check').length > 0
    return { id: item.attr('id'), own: author === expected, hidden, content: hidden ? '' : plainText(item.find('.commentthread_comment_text')), createdAt: timestamp ? new Date(Number(timestamp) * 1000).toISOString() : undefined }
  }).get()
  const comments = commentEntries.filter(comment => !comment.hidden && comment.content).map(({ hidden, ...comment }) => comment)
  const hiddenComments = commentEntries.filter(c => c.hidden).length
  const hiddenOwnComments = commentEntries.filter(c => c.hidden && c.own).map(({ id }) => id)
  const totalComments = Number(clean($('[id$="_totalcount"]').first().text()).replaceAll(',', '')) || commentEntries.length
  return {
    id: candidate.id, appId, gameTitle: clean($('.apphub_AppName').text()) || clean($('.screenshotAppName a').text()),
    imageUrl, title, caption, date: steamDate(dateText, now), originalDateText: dateText,
    comments, totalComments, hiddenComments, hiddenOwnComments,
    source: { platform: 'steam', url: fileUrl(candidate.id), profileId: profile, authorName },
  }
}
