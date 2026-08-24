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
