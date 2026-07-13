# 四技 — 英语听说读写学习工具

单人使用的英语学习 PWA:听力精听 + 跟读、划词阅读、AI 翻译/写作批改、带 SRS 的全局生词本。

## 本地开发

```bash
npm install
npm run dev
```

## 技术栈

- React 18 + TypeScript + Vite,纯前端,无后端
- react-router(`createHashRouter`,兼容 GitHub Pages 与未来 Capacitor 打包)
- Tailwind CSS,移动端优先
- 持久化统一经由 `src/lib/storage.ts`(localStorage,预留迁移钩子)
- AI 调用统一经由 `src/lib/deepseek.ts`(直连 DeepSeek API)

## 填入 DeepSeek API Key

打开应用 → 设置页 → 粘贴 Key → 「测试连接」。不填 Key 时,听力、阅读与生词本功能完全可用;写作模块与中文释义会提示引导文案。

更多文档(如何添加听力材料、部署说明)将随开发进度补充。
