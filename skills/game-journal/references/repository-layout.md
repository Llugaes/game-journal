# Repository layout

```text
data/journal.json                    Public game shelf source; validated before build.
public/journal-data.json             Generated public copy; do not edit manually.
journal/<game-id>/fragments/*.md     Append-only raw conversational fragments.
journal/<game-id>/review.md          Polished, revisable public review draft.
public/covers/<game-id>.*            Optional user-provided or licensed public cover image.
```

`data/journal.json` is organized by game. Its public fields may be deployed to GitHub Pages, so never put private chat context, account data, or uncertain claims in it.

```json
{
  "games": [
    {
      "id": "stable-lowercase-slug",
      "title": "游戏显示名",
      "categories": ["独立", "叙事"],
      "rating": 4,
      "summary": "基于公开随笔的短句摘要",
      "status": "在玩",
      "playtime": "可选，例如 12 小时",
      "lastPlayedAt": "2026-08-24",
      "cover": "/covers/stable-lowercase-slug.jpg",
      "review": {
        "title": "可选的评测标题",
        "verdict": "推荐",
        "content": "只放用户愿意公开的润色后评测正文",
        "updatedAt": "2026-08-24"
      },
      "notes": [
        {
          "id": "stable-note-id",
          "date": "2026-08-24",
          "createdAt": "2026-08-24T12:00:00.000Z",
          "title": "可选的小标题",
          "feeling": "基于原始碎片的公开短随笔",
          "moment": "可选，最难忘的一刻"
        }
      ]
    }
  ]
}
```

Use the user's own date for fragments. Keep notes chronological. Keep raw fragments private-by-default in the repository workflow until the user asks to publish or approves the distilled public note.
