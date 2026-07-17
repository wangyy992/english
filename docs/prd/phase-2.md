# Phase 2 — 口說升級:發音評分 + 復述

> 先讀 `docs/prd/README.md`。前置:Phase 1 已驗收。

## 任務 2.1 語音 Provider 介面

- 新建 `src/lib/speech/`:

```ts
interface SpeechProvider {
  id: 'browser' | 'azure';
  available(): Promise<boolean>;
  /** 跟讀評分:參考文本+錄音 → 詞級與音素級分數 */
  assessScripted(referenceText: string, audio: Blob): Promise<PronunciationResult>;
  /** 自由口說:轉寫 + 整體發音/流利度分數 */
  assessUnscripted(audio: Blob): Promise<UnscriptedResult>;
}
```

- `PronunciationResult` 至少含:整體分(0-100)、準確度/流利度/完整度、詞級列表(分數+錯誤類型 省略/插入/誤讀)、音素級明細(Azure 才有,browser 為空)。
- 現有 `speech.ts`(SpeechRecognition + diff)改造為 `BrowserProvider` 免費降級:只出詞級對/錯,無分數,UI 標「基礎模式」。
- 設定頁 Azure 區塊:Region + Key、測試連接、當月用量估算(按呼叫時長本地統計)。

## 任務 2.2 Azure 發音評分接入

- `AzureProvider` 用 `microsoft-cognitiveservices-speech-sdk`(JS SDK,瀏覽器內串流,規避錄音格式轉換)。
- 跟讀用 scripted 模式(帶參考文本,啟用 miscue);單句 ≤ 30 秒。
- 跟讀結果 UI:詞級紅黃綠分檔、點詞展開音素明細 + 該詞 TTS 重放、句子三維分數。
- 無 Key 或呼叫失敗自動降級 BrowserProvider,不報錯不阻斷。

## 任務 2.3 復述練習(Retelling)

- 精聽完成後可選第四步:隱藏文本,60-120 秒錄音,經當前 Provider 轉寫。
- 轉寫 + 原文摘要交 DeepSeek,固定 rubric 輸出 JSON:內容覆蓋度(0-5)、語法問題列表(原句→修正)、用詞升級建議(≤3 條)、一句話總評。
- 發音分(Azure 可用時)與內容分並列展示。

**驗收:**
- [ ] 無 Azure Key:跟讀全流程可用,顯示基礎模式,無報錯
- [ ] 有 Key:故意讀錯一詞,該詞標紅且音素明細合理(人工)
- [ ] Azure 中途斷網:自動降級,不丟錄音流程
- [ ] 復述批改 JSON 合法;同一錄音批改 3 次,覆蓋度分差 ≤ 1
