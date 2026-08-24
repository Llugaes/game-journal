# 游记 Game Journal

一个独立、纯静态的个人游戏随笔页。所有文字记录保存在浏览器本地；截图保存在同一浏览器的 IndexedDB 中。

## 功能

- 每日记录游戏、日期、游玩时长、评分、感受与难忘瞬间
- 最多添加 6 张本地截图
- 自动整理为 Steam 评测草稿和 GitHub-ready Markdown
- 一键复制 Steam 版、复制 Markdown 或下载 `.md`
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

> Steam 不提供公开的“代用户发布评测”接口；本应用只生成并复制草稿，发布由用户在 Steam 内确认。
