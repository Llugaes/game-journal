---
name: game-journal
description: Capture a user's scattered, conversational game impressions into the companion game-journal repository, then produce evidence-grounded review drafts and rebuild the static journal index. Use when the user asks to save, organize, revisit, or turn their game thoughts into a review; do not use for generic game chat that they did not ask to retain.
---

# Game Journal

The conversation is the primary capture surface. The static page is a readable and manually editable companion, not the source of truth for agent-captured thoughts.

## Capture

- Only write when the user explicitly asks to remember, record, organize, or summarize their game thoughts. If that intent is unclear, keep discussing normally and ask once before retaining it.
- Preserve each new thought as a dated, short raw fragment in `journal/<game-slug>/fragments/<YYYY-MM-DD>.md`. Keep the user's wording and uncertainty; do not silently turn a hypothesis, joke, or momentary frustration into a fact.
- Update or create the matching entry in `data/journal.json`. `feeling` is a concise factual synthesis of the saved fragments; `moment` is optional. Do not invent a rating, playtime, platform, plot point, or recommendation.
- Run `npm run journal:build` after a data update. This validates the committed data and regenerates `public/journal-data.json`, which the static page reads on its next build.

## Review drafting

- Draft only when the user asks for a recap, review, Steam copy, or repository-ready article.
- Read all fragments for that game first. Separate witnessed experience from inference; omit unsupported claims.
- Write the polished result to `journal/<game-slug>/review.md`, keeping the original fragments untouched. A review can be revised as more thoughts arrive.
- Steam copy must remain a draft for the user to publish. Do not claim to post it to Steam.

## Repository safety

- Use repository-local files only. Do not store Steam credentials, GitHub tokens, or copied chat content outside the selected game journal.
- The static page cannot commit to GitHub by itself. Its manual entries are browser-local and exportable; agent-captured entries are committed only when the user has authorized the repository write/push in the current task.
- Read `references/repository-layout.md` before changing schemas or adding a new game folder.
