// 粵語聽力素材:自編短對話/短文,經 TTS(zh-HK)朗讀,逐句帶粵拼與中文。
// 採用「音頻不落庫」策略,發音由瀏覽器/Azure TTS 即時合成,無外部音頻授權問題。
// 真實粵語素材源(RTHK Naked Cantonese、CantoTalk 等)記於 docs,留待日後真音頻管線。

export interface CantoSentence {
  text: string; // 漢字(粵語書面)
  jyut?: string; // 粵拼(自編課程有)
  zh?: string; // 普通話中文(自編課程有)
  start?: number; // 真音頻課程:句子起始秒
  end?: number; // 真音頻課程:句子結束秒
}

// dialogue/broadcast:自編 + TTS;live:抓取的真實電台音頻 + whisper 轉寫
export type CantoLessonType = 'dialogue' | 'broadcast' | 'live';

export interface CantoLesson {
  id: string;
  type: CantoLessonType;
  title: string;
  desc: string;
  sentences: CantoSentence[];
  /** 真音頻課程:發布方 CDN 音頻 URL(音頻不落庫) */
  audioUrl?: string;
  source?: string;
  sourceUrl?: string;
}

export const CANTO_LESSONS: CantoLesson[] = [
  {
    id: 'greetings',
    type: 'dialogue',
    title: '打招呼',
    desc: '日常見面寒暄',
    sentences: [
      { text: '早晨!你好嗎?', jyut: 'zou2 san4! nei5 hou2 maa3?', zh: '早上好!你好嗎?' },
      { text: '幾好,你呢?', jyut: 'gei2 hou2, nei5 ne1?', zh: '挺好,你呢?' },
      { text: '我都幾好,多謝。', jyut: 'ngo5 dou1 gei2 hou2, do1 ze6.', zh: '我也挺好,謝謝。' },
      { text: '好耐冇見喇!', jyut: 'hou2 noi6 mou5 gin3 laa3!', zh: '好久不見!' },
      { text: '係啊,最近忙唔忙?', jyut: 'hai6 aa3, zeoi3 gan6 mong4 m4 mong4?', zh: '是啊,最近忙不忙?' },
      { text: '幾忙,不過都OK。', jyut: 'gei2 mong4, bat1 gwo3 dou1 OK.', zh: '挺忙,不過還好。' },
    ],
  },
  {
    id: 'chachaanteng',
    type: 'dialogue',
    title: '茶餐廳點餐',
    desc: '喺茶餐廳嗌嘢食',
    sentences: [
      { text: '伙記,唔該。', jyut: 'fo2 gei3, m4 goi1.', zh: '服務員,勞駕。' },
      { text: '想要杯凍檸茶。', jyut: 'soeng2 jiu3 bui1 dung3 ning4 caa4.', zh: '想要一杯凍檸檬茶。' },
      { text: '仲要一個菠蘿包。', jyut: 'zung6 jiu3 jat1 go3 bo1 lo4 baau1.', zh: '還要一個菠蘿包。' },
      { text: '唔該埋單。', jyut: 'm4 goi1 maai4 daan1.', zh: '麻煩結賬。' },
      { text: '幾多錢啊?', jyut: 'gei2 do1 cin2 aa3?', zh: '多少錢?' },
      { text: '三十二蚊。', jyut: 'saam1 sap6 ji6 man1.', zh: '三十二塊。' },
    ],
  },
  {
    id: 'directions',
    type: 'dialogue',
    title: '問路',
    desc: '喺街搵路',
    sentences: [
      { text: '唔該,請問洗手間喺邊度?', jyut: 'm4 goi1, cing2 man6 sai2 sau2 gaan1 hai2 bin1 dou6?', zh: '勞駕,請問洗手間在哪?' },
      { text: '喺嗰邊,直行就到。', jyut: 'hai2 go2 bin1, zik6 haang4 zau6 dou3.', zh: '在那邊,直走就到。' },
      { text: '地鐵站點去啊?', jyut: 'dei6 tit3 zaam6 dim2 heoi3 aa3?', zh: '地鐵站怎麼去?' },
      { text: '過馬路,轉左就係。', jyut: 'gwo3 maa5 lou6, zyun3 zo2 zau6 hai6.', zh: '過馬路,左轉就是。' },
      { text: '唔該晒!', jyut: 'm4 goi1 saai3!', zh: '太謝謝了!' },
    ],
  },
  {
    id: 'weather',
    type: 'broadcast',
    title: '天氣報告',
    desc: '電台天氣廣播',
    sentences: [
      { text: '各位聽眾,依家報告天氣。', jyut: 'gok3 wai2 ting1 zung3, ji4 gaa1 bou3 gou3 tin1 hei3.', zh: '各位聽眾,現在報告天氣。' },
      { text: '今日多雲,有幾陣驟雨。', jyut: 'gam1 jat6 do1 wan4, jau5 gei2 zan6 zaau6 jyu5.', zh: '今天多雲,有幾陣驟雨。' },
      { text: '氣溫二十六至三十度。', jyut: 'hei3 wan1 ji6 sap6 luk6 zi3 saam1 sap6 dou6.', zh: '氣溫二十六到三十度。' },
      { text: '濕度百分之八十。', jyut: 'sap1 dou6 baak3 fan6 zi1 baat3 sap6.', zh: '濕度百分之八十。' },
      { text: '出門記得帶遮。', jyut: 'ceot1 mun4 gei3 dak1 daai3 ze1.', zh: '出門記得帶傘。' },
    ],
  },
  {
    id: 'news',
    type: 'broadcast',
    title: '新聞快訊',
    desc: '簡短新聞播報',
    sentences: [
      { text: '以下係新聞重點。', jyut: 'ji5 haa6 hai6 san1 man4 zung6 dim2.', zh: '以下是新聞重點。' },
      { text: '政府今日公布咗新措施。', jyut: 'zing3 fu2 gam1 jat6 gung1 bou3 zo2 san1 cou3 si1.', zh: '政府今天公布了新措施。' },
      { text: '大部分市民反應正面。', jyut: 'daai6 bou6 fan6 si5 man4 faan2 jing3 zing3 min6.', zh: '大部分市民反應正面。' },
      { text: '詳情請留意稍後嘅報道。', jyut: 'coeng4 cing4 cing2 lau4 ji3 saau2 hau6 ge3 bou3 dou6.', zh: '詳情請留意稍後的報道。' },
    ],
  },
  {
    id: 'mtr',
    type: 'broadcast',
    title: '港鐵廣播',
    desc: '車廂到站廣播',
    sentences: [
      { text: '列車即將到站,請小心月台空隙。', jyut: 'lit6 ce1 zik1 zoeng1 dou3 zaam6, cing2 siu2 sam1 jyut6 toi4 hung1 kwik1.', zh: '列車即將到站,請小心月台空隙。' },
      { text: '落車嘅乘客,唔該借借。', jyut: 'lok6 ce1 ge3 sing4 haak3, m4 goi1 ze3 ze3.', zh: '下車的乘客,勞駕讓一讓。' },
      { text: '下一站,中環。', jyut: 'haa6 jat1 zaam6, zung1 waan4.', zh: '下一站,中環。' },
      { text: '請企穩,扶好扶手。', jyut: 'cing2 kei5 wan2, fu4 hou2 fu4 sau2.', zh: '請站穩,扶好扶手。' },
    ],
  },
  {
    id: 'radio',
    type: 'broadcast',
    title: '電台早晨節目',
    desc: '清談節目開場',
    sentences: [
      { text: '早晨,各位聽眾!', jyut: 'zou2 san4, gok3 wai2 ting1 zung3!', zh: '早上好,各位聽眾!' },
      { text: '歡迎收聽今朝嘅節目。', jyut: 'fun1 jing4 sau1 ting1 gam1 ziu1 ge3 zit3 muk6.', zh: '歡迎收聽今早的節目。' },
      { text: '今日我哋會傾下香港美食。', jyut: 'gam1 jat6 ngo5 dei6 wui5 king1 haa5 hoeng1 gong2 mei5 sik6.', zh: '今天我們會聊聊香港美食。' },
      { text: '各位可以打電話入嚟分享。', jyut: 'gok3 wai2 ho2 ji5 daa2 din6 waa2 jap6 lei4 fan1 hoeng2.', zh: '各位可以打電話進來分享。' },
    ],
  },
];

let fetchedCache: CantoLesson[] | null = null;

// 抓取的真實電台課程(由 scripts/fetch_canto.py 在 CI 生成);文件可能不存在。
async function loadFetched(): Promise<CantoLesson[]> {
  if (fetchedCache) return fetchedCache;
  try {
    const res = await fetch('./data/canto-lessons.json');
    if (!res.ok) throw new Error('no canto-lessons');
    const data = (await res.json()) as CantoLesson[];
    fetchedCache = Array.isArray(data) ? data : [];
  } catch {
    fetchedCache = [];
  }
  return fetchedCache;
}

/** 自編課程 + 抓取的真實課程,合併(自編在前)。 */
export async function loadCantoLessons(): Promise<CantoLesson[]> {
  const fetched = await loadFetched();
  return [...CANTO_LESSONS, ...fetched];
}

export function getCantoLesson(id: string): CantoLesson | undefined {
  return CANTO_LESSONS.find((l) => l.id === id) ?? fetchedCache?.find((l) => l.id === id);
}
