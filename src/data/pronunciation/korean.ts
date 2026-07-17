import type { PronLang } from './types';

// 諺文(한글):輔音 + 元音拼成音節塊。示範用音節朗讀(單獨字母 TTS 效果差):
// 輔音配 ㅏ(가 나 다…),元音配 ㅇ(아 야 어…)。
export const korean: PronLang = {
  id: 'ko',
  name: '韓語 · 諺文',
  locale: 'ko-KR',
  desc: '韓語用諺文(한글)拼音,不是日語五十音。19 輔音 + 21 元音,拼成音節塊。',
  groups: [
    {
      title: '基本輔音(14)',
      note: '與元音 ㅏ 拼成音節示範。松音在詞中會濁化。',
      items: [
        { symbol: 'ㄱ', roman: 'g/k', example: '가', exampleGloss: 'ga', speak: '가' },
        { symbol: 'ㄴ', roman: 'n', example: '나', exampleGloss: 'na', speak: '나' },
        { symbol: 'ㄷ', roman: 'd/t', example: '다', exampleGloss: 'da', speak: '다' },
        { symbol: 'ㄹ', roman: 'r/l', example: '라', exampleGloss: 'ra', speak: '라' },
        { symbol: 'ㅁ', roman: 'm', example: '마', exampleGloss: 'ma', speak: '마' },
        { symbol: 'ㅂ', roman: 'b/p', example: '바', exampleGloss: 'ba', speak: '바' },
        { symbol: 'ㅅ', roman: 's', example: '사', exampleGloss: 'sa', speak: '사' },
        { symbol: 'ㅇ', roman: '(無聲)/ng', example: '아', exampleGloss: '首位無聲,末位讀 ng', speak: '아' },
        { symbol: 'ㅈ', roman: 'j', example: '자', exampleGloss: 'ja', speak: '자' },
        { symbol: 'ㅊ', roman: 'ch', example: '차', exampleGloss: 'cha(送氣)', speak: '차' },
        { symbol: 'ㅋ', roman: 'k', example: '카', exampleGloss: 'ka(送氣)', speak: '카' },
        { symbol: 'ㅌ', roman: 't', example: '타', exampleGloss: 'ta(送氣)', speak: '타' },
        { symbol: 'ㅍ', roman: 'p', example: '파', exampleGloss: 'pa(送氣)', speak: '파' },
        { symbol: 'ㅎ', roman: 'h', example: '하', exampleGloss: 'ha', speak: '하' },
      ],
    },
    {
      title: '雙輔音 · 緊音(5)',
      note: '緊喉發音,比松音更緊更硬。',
      items: [
        { symbol: 'ㄲ', roman: 'kk', example: '까', exampleGloss: 'kka', speak: '까' },
        { symbol: 'ㄸ', roman: 'tt', example: '따', exampleGloss: 'tta', speak: '따' },
        { symbol: 'ㅃ', roman: 'pp', example: '빠', exampleGloss: 'ppa', speak: '빠' },
        { symbol: 'ㅆ', roman: 'ss', example: '싸', exampleGloss: 'ssa', speak: '싸' },
        { symbol: 'ㅉ', roman: 'jj', example: '짜', exampleGloss: 'jja', speak: '짜' },
      ],
    },
    {
      title: '基本元音(10)',
      note: '與無聲輔音 ㅇ 拼成音節示範。',
      items: [
        { symbol: 'ㅏ', roman: 'a', example: '아', exampleGloss: 'a', speak: '아' },
        { symbol: 'ㅑ', roman: 'ya', example: '야', exampleGloss: 'ya', speak: '야' },
        { symbol: 'ㅓ', roman: 'eo', example: '어', exampleGloss: 'eo(嘴不圓的 o)', speak: '어' },
        { symbol: 'ㅕ', roman: 'yeo', example: '여', exampleGloss: 'yeo', speak: '여' },
        { symbol: 'ㅗ', roman: 'o', example: '오', exampleGloss: 'o', speak: '오' },
        { symbol: 'ㅛ', roman: 'yo', example: '요', exampleGloss: 'yo', speak: '요' },
        { symbol: 'ㅜ', roman: 'u', example: '우', exampleGloss: 'u', speak: '우' },
        { symbol: 'ㅠ', roman: 'yu', example: '유', exampleGloss: 'yu', speak: '유' },
        { symbol: 'ㅡ', roman: 'eu', example: '으', exampleGloss: 'eu(扁唇)', speak: '으' },
        { symbol: 'ㅣ', roman: 'i', example: '이', exampleGloss: 'i', speak: '이' },
      ],
    },
    {
      title: '複合元音(11)',
      note: '雙元音與帶 w 介音的元音。',
      items: [
        { symbol: 'ㅐ', roman: 'ae', example: '애', exampleGloss: 'ae', speak: '애' },
        { symbol: 'ㅒ', roman: 'yae', example: '얘', exampleGloss: 'yae', speak: '얘' },
        { symbol: 'ㅔ', roman: 'e', example: '에', exampleGloss: 'e', speak: '에' },
        { symbol: 'ㅖ', roman: 'ye', example: '예', exampleGloss: 'ye', speak: '예' },
        { symbol: 'ㅘ', roman: 'wa', example: '와', exampleGloss: 'wa', speak: '와' },
        { symbol: 'ㅙ', roman: 'wae', example: '왜', exampleGloss: 'wae', speak: '왜' },
        { symbol: 'ㅚ', roman: 'oe', example: '외', exampleGloss: 'oe(近 we)', speak: '외' },
        { symbol: 'ㅝ', roman: 'wo', example: '워', exampleGloss: 'wo', speak: '워' },
        { symbol: 'ㅞ', roman: 'we', example: '웨', exampleGloss: 'we', speak: '웨' },
        { symbol: 'ㅟ', roman: 'wi', example: '위', exampleGloss: 'wi', speak: '위' },
        { symbol: 'ㅢ', roman: 'ui', example: '의', exampleGloss: 'ui', speak: '의' },
      ],
    },
  ],
};
