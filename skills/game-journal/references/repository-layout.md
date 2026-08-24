# Repository layout

```text
data/journal.json                    Static-page data source; validated before build.
public/journal-data.json             Generated public copy; do not edit manually.
journal/<game-slug>/fragments/*.md   Append-only raw conversational fragments.
journal/<game-slug>/review.md        Polished, revisable review draft.
```

`data/journal.json` entry schema:

```json
{
  "id": "uuid-or-stable-slug",
  "game": "游戏显示名",
  "date": "2026-08-24",
  "playtime": "可选，例如 3.5 小时",
  "rating": 4,
  "feeling": "基于原始碎片的简短整理",
  "moment": "可选，最难忘的一刻",
  "createdAt": "2026-08-24T12:00:00.000Z"
}
```

Use the user's own date for the fragment. Keep per-game fragments chronological. If the player moves from uncertain to firm opinion, retain both notes and let the later review explain the change.
