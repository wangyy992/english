# 添加听力材料

听力材料是纯数据文件,位于 `src/data/lessons/`,每集一个 `.ts` 文件,导出一个符合以下结构的对象:

```ts
interface AudioLesson {
  id: string;              // 唯一 ID,建议用短横线命名,如 'bbc-6min-daily-habits'
  source: string;          // 来源标注,如 "BBC 6 Minute English"
  title: string;           // 标题
  level: 1 | 2 | 3;        // 难度分级,数字越大越难
  audioUrl: string;        // 音频直链(外部 URL 或站内相对路径,<audio> 标签直接播放)
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
3. `audioUrl` 可以是外部直链(mp3/m4a/ogg,需支持 HTTP Range 请求以便拖动进度条),也可以是站内相对路径(把音频文件放进 `public/audio/`,`audioUrl` 写 `./audio/xxx.mp3` 即可,随构建产物一起发布,没有外链失效的风险)。**注意版权**——只使用你有权分发的音频。
4. `sentences` 的时间轴需要和音频精确对齐。

## 关于示例数据

仓库自带的 3 集示例(`bbc-6min-daily-habits` / `tech-talk-smart-homes` / `culture-corner-street-food`)是**原创脚本 + 离线 TTS(SVOX Pico)逐句合成**而成:每句单独合成、量出准确时长后再拼接成完整音频,所以时间轴和文本是精确对齐的,不是占位内容,可以直接用于验证盲听/精听/跟读全流程。它们不是真人朗读、也不是任何真实电台节目,仅作为可运行的默认材料。

## 用同样的方法生成你自己的听力材料(离线 TTS,文本音频保证对齐)

如果你想快速产出更多"文本与音频保证一致"的材料(而不是去找真实录音再手动对时间轴),可以用仓库里的思路自己批量生成:

1. 准备一个 JSON 数组,每项是一句英文文本。
2. 用 `pico2wave`(Debian/Ubuntu: `apt-get install libttspico-utils`)把每句单独合成一个 wav,并用 `ffprobe` 量出每段的准确时长。
3. 用 `ffmpeg` 的 concat 方式把所有句子(中间插入固定时长的静音)拼接成一个 mp3,同时用每段已知时长累加算出每句的精确 `start`/`end`。
4. 把生成的 mp3 放进 `public/audio/`,把算出来的 `sentences` 数组贴进新的 lesson 文件。

这样得到的音频虽然是合成音(不如真人自然),但文本和时间轴保证 100% 对齐,不会出现"听到的内容和文稿对不上"的问题。如果想要更自然的真人朗读效果,替换 `audioUrl` 为你自己获取/录制的真实音频,并手动核对 `sentences` 时间轴即可。
