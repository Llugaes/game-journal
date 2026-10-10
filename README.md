# 游记 Game Journal

一个独立、纯静态的个人游戏博客。它公开展示游戏架、公开随笔与评测；日常碎碎念由配套的 `game-journal` Skill 在对话中整理后写入仓库。

## 功能

- 按游戏分类浏览游戏架
- 点进游戏，查看该游戏的公开随笔与评测
- 公开页没有浏览器编辑器；私密原始片段与发布决定留在 Agent 工作流中
- 不需要服务端、数据库或账号

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

当前配置为 Llugaes：111 篇公开评测、9 张已选截图，其中 7 张带原始说明。截图上限为 12 张，后续同步保持已选 ID；仅保留本人文字。

只读取已选账号的公开评测、公开截图及本人文字，不需要 Steam 密码、Cookie 或 API key。首次使用先创建 `data/steam-config.json`：

```json
{
  "profiles": ["你的 SteamID64"],
  "comments": "own",
  "screenshotLimit": 12,
  "screenshotPages": 40,
  "screenshotIds": []
}
```

- `profiles` 可填多个本人账号；同一游戏的评测按作者分别保留。
- `comments: own` 只保留截图作者本人评论；`none` 只搬截图说明。
- 初次发现仅扫描最近 `screenshotPages` 页，优先有文字说明的截图，最多 `screenshotLimit` 张；不声称覆盖整个截图库。
- 确认首批后把报告里的 `selectedScreenshotIds` 填入 `screenshotIds`，后续直接刷新这些图片。新图需明确添加 ID，避免每次同步更换已有选图。

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

### 中文名称和个人评分

应用导入时会自动补充 Steam 简体中文商店名称，保存在 `data/steam-titles.json`。`npm run steam:titles -- --refresh` 可单独刷新商店资料；构建和 Pages CI 只读已提交的名称表，不依赖 Steam 在线可用性。商店仍使用英文时，在 `data/title-overrides.json` 记录经核实的发行商或官方平台中文名称及来源。繁体转简体、标点整理和保留商品版本后缀会注明；没有核实到官方中文的条目暂留官方原名。原始导入不改写，英文原名仍可搜索。

构建会从评测中的明确评分行提取个人分数，在游戏卡片和详情页单独展示；没有评分时不显示评分区。支持小数、五分/十分/百分制、条件值（如 `6(8)/10`）、版本或体验维度、范围及“以上”。没有明确分母的“8.5分”不补成十分制，不从推荐结论或游玩时长推算评分。详情可展开“评分原话”。

特殊表达可写入 `data/review-score-overrides.json`，按评测 ID 指定 `label`、字符串 `value`、可选 `scale`/`qualifier` 和原文 `evidence`；它替换该篇的自动提取结果。证据不在原文中或数值超出量表时构建失败，防止更新评测后继续发布过期分数。手写 `rating` 继续使用原有五分制。

`data/journal.json` 继续存手写内容。使用 `steam-<AppID>` 可为已导入游戏补充分类、评分、随笔或手写评测；手写字段优先，Steam 评测和截图单独保留，同步不会覆盖手写文件。

导入会核对分页总数、来源作者、稳定 ID、图片和数据格式；私密页面、来源减少、缺失图片、未完整加载的本人评论会中止应用，保留现有内容。网络错误有限重试；退出码非零时不要提交发布。Steam 页面结构变化后先修解析器，不能用空数据继续发布。

应用成功后审阅 `git diff`，提交 `data/` 中变动的数据和名称表、`public/media/steam/` 和生成的 `public/journal-data.json`，推送 `master`，等待现有 GitHub Pages 流水线完成。脚本本身不执行 commit/push；本仓库暂未启用定时同步。
