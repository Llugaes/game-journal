# 游记 Game Journal

一个独立、纯静态的个人游戏博客。它公开展示游戏架、公开随笔与评测；日常碎碎念由配套的 `game-journal` Skill 在对话中整理后写入仓库。

## 功能

- 按游戏分类浏览游戏架
- 点进游戏，查看该游戏的公开随笔与评测
- 蓝色点赞表示推荐，红色倒赞表示不推荐；同时保留文字结论
- 个人评分用红→橙→翠绿的圆环显示，截图画廊适配桌面双列和手机单列
- 公开页没有浏览器编辑器；私密原始片段与发布决定留在 Agent 工作流中
- 不需要服务端、数据库或账号

## 私人编辑工作台

配套编辑器源代码位于私有仓库 `Llugaes/game-journal-studio`；公开网站只承担阅读展示。工作台保存后通过 GitHub App 提交内容并触发本仓库 Pages 发布。

`data/editorial.json` 按稳定游戏/评测/截图/留言 ID 保存人工修改、排序及移除记录，优先于 Steam 导入。原始导入继续保留，后续新增图片和留言也能合入。`personalScores` 为本人单独填写的评分；省略时使用评测自动识别，空数组表示不展示评分。

构建同时生成未经编辑层覆盖的 `public/journal-base.json` 与最终展示数据 `public/journal-data.json`。两者都只包含已纳入公开站点的内容。编辑后台、登录凭据、未发布的上传和失败输入不在这个公开仓库中。

## 开发

```bash
npm install
npm run dev
```

## 发布

```bash
npm run build
```

将 `dist/` 部署到任意静态托管即可。

推送到 `master` 会触发 GitHub Pages 工作流；工作流在 GitHub 上执行 `npm ci` 与 `npm run build`，再发布 `dist/`。项目页会自动使用仓库路径作为资源前缀，不需要在代码中写死仓库名。

> Steam 不提供公开的“代用户发布评测”接口；本应用只生成并复制草稿，发布由用户在 Steam 内确认。

## Steam 内容搬运

当前配置为 Llugaes：111 篇公开评测、45 张截图，覆盖 23 款游戏，其中 27 张带原始说明，另有 1 条本人评论；东京幻都 4 张。仅保留本人文字。包含 39 张网页采集图和 6 张本机 Steam 公开上传记录补图。

匿名公开图库显示 2,572 张，已登录客户端公开筛选显示 2,573 张（总库含非公开内容为 5,769 张）。Steam 的异常空页和 HTTP 429 尚未解决，登录客户端的部分游戏筛选也返回空页，未完成全库发现，不能宣称所有带文字截图都已收齐。当前保留固定选图，`discoverCaptions` 暂为 `false`。东京幻都的一条本人留言已从登录客户端核实原文并补入，未导入匿名页面的审核提示。

读取已选账号的评测、截图及本人文字，不需要 Steam 密码、Cookie 或 API key。网页采集限公开内容；本机补录支持下述非公开本人文字规则。首次使用先创建 `data/steam-config.json`：

```json
{
  "profiles": ["你的 SteamID64"],
  "comments": "own",
  "screenshotLimit": 100,
  "screenshotPages": 100,
  "discoverCaptions": true,
  "screenshotIds": []
}
```

- `profiles` 可填多个本人账号；同一游戏的评测按作者分别保留。
- `comments: own` 只保留截图作者本人评论；`none` 只搬截图说明。
- `nonPublicScreenshots: "own-text"` 允许本机补录有本人说明或已核实本人留言的好友可见、私密、非公开上传图；没有本人文字的非公开图不会成为普通补图。省略或设为 `"exclude"` 时不纳入。本仓库当前按选定范围使用 `"own-text"`，不更改 Steam 上的可见性。
- `npm run steam:discover` 检查完整公开图库，核对分页、总数和重复 ID；必要时 `-- --by-game` 按页面列出的游戏分组核对。结果在 `.local/steam-import/discovered.json`，任何缺页都不会当作全量成功。
- `discoverCaptions: true` 会在每次采集时完整发现：保留已发布及固定 ID，收齐所有带说明的图片，没有选图的游戏补一张。超过 `screenshotLimit` 时中止，绝不为了上限丢掉带说明的图。设为 `false` 或省略时沿用固定 ID / 最近 `screenshotPages` 页模式。
- 列表能覆盖截图说明；评论区需单独读取选中截图详情，只保留本人评论，不把其他人的留言搬过去。未逐张读取的评论区不能声称全部核实。
- 确认首批后把报告里的 `selectedScreenshotIds` 填入 `screenshotIds`，后续直接刷新这些图片。关闭全量发现时，新图需明确添加 ID；开启时自动添加有说明的图片，同时保留已发布选图。

按顺序运行：

```bash
npm ci
npm run steam:collect -- --refresh
npm run steam:plan
# 查看 .local/steam-import/report.json、plan.json、draft.json 和 assets/
npm run steam:apply
npm test
npm run build -- --base /game-journal/
```

重复同步可用 `npm run steam:sync -- --apply`，它会重新抓取、生成差异、校验并应用。省略 `--apply` 只生成草稿。`--config path` 可使用其他配置文件。缓存和草稿在 `.local/`，不会进入 Git 或公开站点。

正式数据放在 `data/steam.json`，包含原始 BBCode（来源提供时）、正文、作者、来源链接、原始日期文字。构建时只输出阅读页面需要的字段。图片压缩为 WebP，截图最大边 1600px，保留 Steam 原图链接。评测保留原话、段落、推荐结论和可得的评测时长，不补写分数或游玩状态。

### 从本机 Steam 补图

```powershell
npm run steam:local
# 核对 .local/steam-local/report.json、draft.json 和 assets/
npm run steam:local -- --apply
npm run build -- --base /game-journal/
```

默认读取 Windows 默认安装目录，也可使用 `--steam-root "D:\Steam"`；多账号配置时指定 `--profile SteamID64`。只读取所选账号的 `userdata/<AccountID>/760/screenshots.vdf` 和 `760/remote/` 原图，不读取账号登录配置、Cookie 或凭据，不修改 Steam 文件。

本机索引只能覆盖这台设备记录过的截图，不等于完整云端图库。本次核对到 199 条上传记录，其中 82 条标为公开（`Permissions=8`），117 条为非公开类别；索引内的 6 条原始说明均已在站点保留，117 条非公开记录中暂未发现额外说明。评论区不在本机索引中，因此这个数量不代表云端没有带本人留言的非公开图。

自动选择所有带说明的公开图，并为尚无截图的游戏补一张公开普通图，保留既有选图。非公开图片仅在 `nonPublicScreenshots: "own-text"` 时按本人文字入选；只有留言、没有说明的图必须先核实本人身份并记录到 `steam-comments.json`。未上传的图片不自动发布，不从画面中的游戏字幕或别人的评论生成“本人说明”。

补图写入 `data/steam-local.json`，与网页导入的 `data/steam.json` 在构建时按稳定 ID 合并，云端已核实的同 ID 内容优先。常规 `steam:apply` 不会清掉本地补图，重复本地导入不新增重复项。日期来自本地拍摄时间，来源链接仍指向上传 ID；索引不包含评论区留言，因此不能用本地导入声称评论区已经收齐。原图缺失、路径跨越或已补图不再符合选定的可见性与本人文字规则时停止应用。

匿名页无法读取、但本人客户端正常显示的评论，可在核对截图 ID、作者 SteamID64、评论 ID、原时间和完整原文后记录到 `data/steam-comments.json`。构建校验账号与截图归属、按评论 ID 去重；评论重新公开后，网页采集结果优先。当前已用客户端实际核实并补入东京幻都的 1 条评论；不读取凭据，也不发布 Steam 的审核占位文案。

### 中文名称和个人评分

应用导入时会自动补充 Steam 简体中文商店名称，保存在 `data/steam-titles.json`。`npm run steam:titles -- --refresh` 可单独刷新商店资料；构建和 Pages CI 只读已提交的名称表，不依赖 Steam 在线可用性。商店仍使用英文时，在 `data/title-overrides.json` 记录经核实的发行商或官方平台中文名称及来源。繁体转简体、标点整理和保留商品版本后缀会注明；没有核实到官方中文的条目暂留官方原名。原始导入不改写，英文原名仍可搜索。

构建会从评测中的明确评分行提取个人分数，在游戏卡片和详情页单独展示；没有评分时不显示评分区。支持小数、五分/十分/百分制、条件值（如 `6(8)/10`）、版本或体验维度、范围及“以上”。没有明确分母的“8.5分”不补成十分制，不从推荐结论或游玩时长推算评分。详情可展开“评分原话”。

圆环从十二点方向顺时针填充：十分制 5 分为绯红色半圆、9 分为翠绿色九成圆、10 分为翠绿色满圆。按评价分档配色：低于 6 分绯红、6 分段橘红、7 分段琥珀、8 分段青绿、9–10 分翠绿。整段弧线保持该档色调，以同色高光、暗部和轻底纹增加质感；未填充部分为灰色。前后台共用 `scripts/score-display.mjs`。其他明确量表按比例显示；仅写“分”的评测按十分制绘制圆环，中央仍保留原话中的数值和限定词。条件值及范围用实色显示较低值、浅色延伸到较高值，不平均成一个新分数。

截图在站内对话框中查看，支持上一张、下一张、方向键、Esc 关闭和打开原图；关闭后焦点回到原截图。游戏架可一键清除关键词、分类和内容筛选。

特殊表达可写入 `data/review-score-overrides.json`，按评测 ID 指定 `label`、字符串 `value`、可选 `scale`/`qualifier` 和原文 `evidence`；它替换该篇的自动提取结果。证据不在原文中或数值超出量表时构建失败，防止更新评测后继续发布过期分数。手写 `rating` 继续使用原有五分制。

`data/journal.json` 继续存手写内容。使用 `steam-<AppID>` 可为已导入游戏补充分类、评分、随笔或手写评测；手写字段优先，Steam 评测和截图单独保留，同步不会覆盖手写文件。

导入会核对分页总数、来源作者、稳定 ID、图片和数据格式；私密页面、来源减少、缺失图片、评论分页未完整加载会中止应用，保留现有内容。网络错误有限重试；退出码非零时不要提交发布。Steam 页面结构变化后先修解析器，不能用空数据继续发布。Steam 暂时隐藏的待审核留言会在报告中注明，绝不把审核提示当成作者文字；需要取得可核实的原文才能补齐。

社区普通页面间隔至少 6 秒，截图详情间隔至少 15 秒，图片 CDN 间隔至少 1.1 秒；限流会退避重试，仍失败则保留缓存退出。补图时先使用缓存完成采集，不要反复清空缓存或刷新已核实的全文。

应用成功后审阅 `git diff`，提交 `data/` 中变动的数据和名称表、`public/media/steam/` 和生成的 `public/journal-data.json`，推送 `master`，等待现有 GitHub Pages 流水线完成。脚本本身不执行 commit/push；本仓库暂未启用定时同步。
