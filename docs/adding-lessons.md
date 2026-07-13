# 添加听力材料

听力材料是纯数据文件,位于 `src/data/lessons/`,每集一个 `.ts` 文件,导出一个符合以下结构的对象:

```ts
interface AudioLesson {
  id: string;              // 唯一 ID,建议用短横线命名,如 'bbc-6min-daily-habits'
  source: string;          // 来源标注,如 "BBC 6 Minute English"
  title: string;           // 标题
  level: 1 | 2 | 3;        // 难度分级,数字越大越难
  audioUrl: string;        // 音频直链(外部 URL,<audio> 标签直接播放)
  sentences: {
    start: number;         // 该句开始时间(秒)
    end: number;           // 该句结束时间(秒)
    text: string;          // 该句文本
  }[];
}
```

## 添加步骤

1. 在 `src/data/lessons/` 新建一个 `.ts` 文件,参考已有文件(如 `bbc-6min-daily-habits.ts`)写出符合上面结构的对象,并 `export default`。
2. 打开 `src/data/lessons/index.ts`,把新文件 import 进来,加入 `LESSONS` 数组。
3. `audioUrl` 需要是一个可以被 `<audio>` 标签直接播放的外部直链(mp3/m4a/ogg 等常见格式,支持 HTTP Range 请求以便拖动进度条)。常见来源:自建对象存储(如 R2/S3 + 公开读)、播客的公开 mp3 直链等。**注意版权** ——请只使用你有权分发/引用的音频。
4. `sentences` 的时间轴需要和音频对齐。可以用任意音频编辑软件(如 Audacity)听音频、记录每句的起止时间,或用带字幕时间轴的转写工具生成后再手动核对。

## 关于示例数据

仓库自带的 3 集示例(`bbc-6min-daily-habits` / `tech-talk-smart-homes` / `culture-corner-street-food`)中的音频是占位用的公开测试音轨(非真人朗读),句子文本和时间轴也是占位内容,已在文件中用 `TODO` 注释标出。它们的作用是让"听力材料列表 → 精听页三段式流程(盲听/精听/跟读)"这条链路在结构上完整可跑通,方便你替换成真实材料前先验证功能。上线前请替换为真实的音频与转写。
