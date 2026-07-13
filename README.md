# 四技 — 英语听说读写学习工具

单人使用的英语学习 PWA:听力精听 + 跟读、划词阅读、AI 翻译/写作批改、带 SRS 的全局生词本。核心设计原则:把每次学习的启动摩擦降到最低——打开即今日任务,一切默认预选,零确认弹窗。

## 功能一览

- **今日**:打开 App 的第一屏是任务卡列表(听 / 读 / 译 / 复习),每项一键直达,顶部显示连续打卡天数。
- **听力**:精听页三段式流程——盲听(隐藏文本)→ 精听(逐句 A-B 循环 + 划词查词)→ 跟读(语音识别对比原句,词级红绿标注)。
- **阅读**:预置文章库 + 粘贴任意英文即读,正文自动高亮已收录的生词。
- **写作**:5 句中译英逐句批改,或 AI 生成主题的自由写作,批改结果含错误定位、地道表达、结构建议。
- **生词本**:打开即进入今日到期复习卡片流(SRS 间隔重复),支持左右滑动作答;复习完毕才显示完整词库(可搜索、可按来源筛选)。
- **划词查词**:在听力/阅读/写作任意位置选中文字,秒出音标 + 英英释义,可选加载中文释义,一键加入生词本,零确认弹窗。
- **PWA**:可添加到手机主屏幕,静态资源离线可用。

## 本地开发

```bash
npm install
npm run dev
```

```bash
npm run build    # 类型检查 + 生产构建,产物在 dist/
npm run preview  # 本地预览构建产物
npm run lint      # oxlint
```

## 技术栈与架构约束

- React 18 + TypeScript + Vite,纯前端,不依赖任何后端 / serverless 函数(为未来 Capacitor 打包 iOS App 预留)
- react-router(`createHashRouter`),兼容 GitHub Pages 静态托管与 Capacitor 打包
- Tailwind CSS,移动端优先,桌面浏览器同样可用
- 状态管理:React Context + hooks,不引入重型状态库
- 两个统一封装层,组件层禁止绕过:
  - `src/lib/storage.ts` —— 所有持久化的唯一入口(当前基于 localStorage,带 schema 版本号和迁移钩子,未来切换 Capacitor Preferences / SQLite 只需改这一个文件)
  - `src/lib/deepseek.ts` —— 所有 AI 调用的唯一入口(直连 DeepSeek `chat/completions`,统一处理 JSON 解析、失败重试、无 Key 时的降级)

## 填入 DeepSeek API Key

打开应用 → 右上角 ⚙️ 进入设置页 → 粘贴 Key → 「测试连接」确认可用。

**不填 Key 时**,听力、阅读、生词本(含划词查词的英英释义部分)完全可用;写作模块和划词卡片的「中文释义」会显示引导文案「去设置页填入 DeepSeek API Key」,不会报错或崩溃。

## 添加你自己的学习材料

- **听力材料**:参见 [`docs/adding-lessons.md`](docs/adding-lessons.md)。仓库自带的 3 集示例音频是占位测试音轨,句子文本和时间轴已标注 `TODO`,用于验证「材料列表 → 精听三段式」链路可以完整跑通,替换成真实材料前请先阅读该文档。
- **阅读文章**:两种方式——① 在「读」页顶部粘贴任意英文,立即进入阅读页,自动存入「我的文章」;② 直接往 `src/data/articles/` 加一个 `.ts` 文件(参考已有文件的结构),再到 `src/data/articles/index.ts` 里注册。

## 部署到 GitHub Pages

仓库已内置 `.github/workflows/deploy.yml`:push 到 `main` 分支会自动执行类型检查、构建,并发布到 GitHub Pages。

**首次启用需要手动做一次仓库设置**(仅一次):打开 GitHub 仓库 → Settings → Pages → **Build and deployment → Source** 选择 **GitHub Actions**。设置完成后,后续每次 push 到 `main` 都会自动重新部署,无需手动操作。

由于本项目使用 hash 路由(`createHashRouter`)且 Vite `base` 配置为相对路径(`./`),部署到 GitHub Pages 的子路径(如 `https://<user>.github.io/<repo>/`)后,直接访问任意页面(包括刷新)都不会 404。

## 目录结构

```
src/
  lib/            storage.ts / deepseek.ts 等统一封装层,以及各模块的数据/业务逻辑
  context/        全局 Context(设置、划词查词弹窗)
  components/     可复用 UI 组件,按模块分子目录(vocab/listen/write/today)
  pages/          路由页面,按模块分子目录(listen/read/write/vocab)
  data/           预置数据(听力材料、文章)
  types/          共享 TypeScript 类型
public/           静态资源(favicon、PWA manifest、service worker、图标)
docs/             补充文档
```

## 验收清单

- [x] 无 DeepSeek key 时:听/读/生词本全流程可用,AI 功能显示引导而非报错
- [x] 划词 → 入生词本 → 次日出现在复习队列,全程零确认弹窗
- [x] 精听页键盘快捷键可用;单句 A-B 循环准确
- [x] 跟读 diff 在 Chrome 正常;不支持的浏览器优雅降级
- [x] 翻译题 5 句缓存,刷新页面不丢
- [x] 手机竖屏体验流畅,tab 栏不遮挡内容
- [x] GitHub Pages 部署后所有路由直接访问不 404(hash 路由)
- [x] 组件层无直接 localStorage / fetch 调用(全部经过 storage.ts / deepseek.ts)
