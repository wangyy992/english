// 粵語聽力素材:自編短對話/短文,經 TTS(zh-HK)朗讀,逐句帶粵拼與中文。
// 採用「音頻不落庫」策略,發音由瀏覽器/Azure TTS 即時合成,無外部音頻授權問題。
// 真實粵語素材源(RTHK Naked Cantonese、CantoTalk 等)記於 docs,留待日後真音頻管線。

export interface CantoSentence {
  text: string; // 漢字(粵語書面)
  jyut: string; // 粵拼
  zh: string; // 普通話中文
}

export interface CantoLesson {
  id: string;
  title: string;
  desc: string;
  sentences: CantoSentence[];
}

export const CANTO_LESSONS: CantoLesson[] = [
  {
    id: 'greetings',
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
];

export function getCantoLesson(id: string): CantoLesson | undefined {
  return CANTO_LESSONS.find((l) => l.id === id);
}
