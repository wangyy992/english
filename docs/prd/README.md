# PRD 總覽:「知更 / Robin」— AI 英語家教

> 產品名:**知更**(英文 **Robin**),原名「四技」。v1.1 · 2026-07
> 基於現有代碼庫的改造+擴建計劃,非從零規格書。倉庫:`wangyy992/english`(React 18 + TS + Vite,純前端 PWA)

## 文件用法(省 token)

PRD 按 Phase 拆分。執行某個 Phase 時,只需讀:**本文件 + 對應 phase 文件**,不要加載其他 phase。

| 文件 | 內容 |
|---|---|
| `phase-1.md` | 改名 + FSRS + 時長規劃器 |
| `phase-2.md` | 語音 Provider + Azure 發音評分 + 復述 |
| `phase-3.md` | 能力模型 + 動態分配 + 獎懲 + 對話/雅思模擬 |
| `launch-track.md` | 上架前置軌道(獨立,啟動需用戶明確指示) |

## 執行守則(最高優先級)

1. **嚴格按 Phase 順序,一次只做一個 Phase**,Phase 內按任務編號順序。未經用戶確認不得跨 Phase。
2. **不推倒重來**,所有改動在既有結構上進行,禁止重寫已正常工作的模組。
3. **統一封裝層,組件層禁止繞過**:
   - `src/lib/storage.ts`:持久化唯一入口(schema 版本號 + 遷移鉤子)
   - `src/lib/deepseek.ts`:LLM 呼叫唯一入口
   - `src/lib/speech/`(Phase 2 新增):語音 Provider 介面,同規則
4. 每完成一個任務:更新驗收清單,列出需用戶人工驗收的步驟(尤其音頻功能)。
5. 涉及已存數據結構的改動必須寫 storage.ts 遷移鉤子,保證老數據無損升級。
6. 每個 LLM 呼叫:固定 system prompt、批改/評分類 `temperature ≤ 0.3`、結構化 JSON 輸出、解析失敗重試與降級。禁止自由文本裸 prompt。
7. **啟動摩擦最小化**:打開即今日任務、默認預選、零確認彈窗。新功能不得增加進入學習前的步驟數。

## 產品願景

可替代真人家教的英語學習 PWA,單人使用:打開 App → 選今天學多久 → 按弱項分配時間到 聽/說/讀/寫/詞彙 → 逐項完成 → 驗證記錄 → 點評獎懲。素材真實(播客、CC 文章)、反饋專業(音素級發音評分、考試標準批改)、記憶科學(FSRS)。先自用,保留上架可能。介面繁/簡中文,學習內容英文。

## 現狀基線(已完成,保留不動)

- 聽力:精聽三段式(盲聽→逐句 A-B→跟讀 diff);`scripts/fetch_lessons.py` GH Actions 每日拉播客 RSS + faster-whisper 句級時間戳,音頻不落庫
- 閱讀:The Conversation CC BY-ND 管線 + 粘貼即讀,生詞高亮
- 寫作:5 句中譯英逐句批改 + AI 主題自由寫作
- 生詞本:劃詞查詞→入本→SRS 卡片流(現為固定間隔 Leitner)
- 今日:固定任務卡 + streak
- 基建:storage.ts(版本化+導出導入)、deepseek.ts(重試+無 Key 降級)、PWA、GitHub Pages 自動部署

## 非功能需求

- 瀏覽器:只保證 Chrome/Edge 桌面 + Android Chrome;iOS Safari 盡力而為,已知限制寫入 README。
- 成本:設定頁顯示本月 DeepSeek/Azure 估算用量;單次 LLM 輸入 ≤ 4k tokens;Azure 只在跟讀/復述/對話/模擬時呼叫。
- 數據:所有寫操作經 storage.ts;導出一鍵可用;schema 變更 bump 版本並附遷移。
- LLM 穩定性:評分類 prompt 集中於 `src/lib/prompts/`,附 rubric 與 few-shot;輸出 JSON Schema 校驗,失敗重試 2 次後降級「稍後再試」,不展示解析失敗原文。
- 性能:今日頁可交互 < 2 秒(GitHub Pages,4G)。

## 非目標

多語言、多用戶/社交、真人雅思真題分發、iOS 原生推播(PWA 階段)、自研發音評分、重型狀態管理庫。

## 里程碑

```
Phase 1 → 恢復日常使用 → Phase 2 → Phase 3(3.1→3.4)→ [用戶指示後] 上架軌道
```

每 Phase 結束:跑驗收清單 → 用戶人工驗收音頻項 → 部署 GitHub Pages → 用戶確認後進入下一 Phase。
