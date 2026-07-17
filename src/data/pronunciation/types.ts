// 發音學習欄目的音位數據結構。每種語言一組聲音表,按組分類。
// speak = TTS 朗讀用的文本(通常是示範詞,讓語音引擎發真實音);
// 跟讀評分也用它作 referenceText,按語言 locale 送 Azure。

export interface PronItem {
  /** 主符號:粵拼 / 諺文字母 / IPA */
  symbol: string;
  /** 羅馬音或輔助讀法(諺文的羅馬化、IPA 的近似音等) */
  roman?: string;
  /** 示範詞(漢字 / 諺文音節 / 法語單詞) */
  example: string;
  /** 示範詞含義 */
  exampleGloss: string;
  /** TTS 與跟讀評分用的文本 */
  speak: string;
}

export interface PronGroup {
  title: string;
  note?: string;
  items: PronItem[];
}

export interface PronLang {
  id: 'yue' | 'ko' | 'fr';
  name: string;
  /** BCP-47:TTS 與 Azure 發音評分 locale */
  locale: string;
  desc: string;
  /** 跟讀評分用的參考文本語言是否被 Azure 支持(三語均支持,保留擴展位) */
  groups: PronGroup[];
}
