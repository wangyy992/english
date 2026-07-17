import type { PronLang } from './types';

// 粵拼(Jyutping):19 聲母 + 核心韻母 + 6 聲調。聲調是粵語難點,單列一組。
export const cantonese: PronLang = {
  id: 'yue',
  name: '粵語 · 粵拼',
  locale: 'zh-HK',
  desc: '香港粵語,採用粵拼(Jyutping)。先認聲母韻母,再攻六個聲調。',
  groups: [
    {
      title: '聲母(19)',
      note: '音節開頭的輔音。gw/kw 是圓唇音,ng 是鼻音聲母。',
      items: [
        { symbol: 'b', example: '巴', exampleGloss: 'baa1', speak: '巴' },
        { symbol: 'p', example: '怕', exampleGloss: 'paa3', speak: '怕' },
        { symbol: 'm', example: '媽', exampleGloss: 'maa1', speak: '媽' },
        { symbol: 'f', example: '花', exampleGloss: 'faa1', speak: '花' },
        { symbol: 'd', example: '打', exampleGloss: 'daa2', speak: '打' },
        { symbol: 't', example: '他', exampleGloss: 'taa1', speak: '他' },
        { symbol: 'n', example: '拿', exampleGloss: 'naa4', speak: '拿' },
        { symbol: 'l', example: '啦', exampleGloss: 'laa1', speak: '啦' },
        { symbol: 'g', example: '家', exampleGloss: 'gaa1', speak: '家' },
        { symbol: 'k', example: '卡', exampleGloss: 'kaa1', speak: '卡' },
        { symbol: 'ng', example: '牙', exampleGloss: 'ngaa4', speak: '牙' },
        { symbol: 'h', example: '蝦', exampleGloss: 'haa1', speak: '蝦' },
        { symbol: 'gw', example: '瓜', exampleGloss: 'gwaa1', speak: '瓜' },
        { symbol: 'kw', example: '誇', exampleGloss: 'kwaa1', speak: '誇' },
        { symbol: 'w', example: '蛙', exampleGloss: 'waa1', speak: '蛙' },
        { symbol: 'z', example: '渣', exampleGloss: 'zaa1', speak: '渣' },
        { symbol: 'c', example: '叉', exampleGloss: 'caa1', speak: '叉' },
        { symbol: 's', example: '沙', exampleGloss: 'saa1', speak: '沙' },
        { symbol: 'j', example: '也', exampleGloss: 'jaa5', speak: '也' },
      ],
    },
    {
      title: '韻母 · 元音',
      note: '音節的核心元音。aa 長、a 短,oe/eo/yu 是粵語特有的圓唇音。',
      items: [
        { symbol: 'aa', example: '沙', exampleGloss: 'saa1(長 a)', speak: '沙' },
        { symbol: 'e', example: '些', exampleGloss: 'se1', speak: '些' },
        { symbol: 'i', example: '詩', exampleGloss: 'si1', speak: '詩' },
        { symbol: 'o', example: '歌', exampleGloss: 'go1', speak: '歌' },
        { symbol: 'u', example: '夫', exampleGloss: 'fu1', speak: '夫' },
        { symbol: 'oe', example: '靴', exampleGloss: 'hoe1', speak: '靴' },
        { symbol: 'eo', example: '詢', exampleGloss: 'seon1', speak: '詢' },
        { symbol: 'yu', example: '書', exampleGloss: 'syu1', speak: '書' },
      ],
    },
    {
      title: '韻母 · 帶尾韻',
      note: '粵語有 -m/-n/-ng 鼻音尾與 -p/-t/-k 塞音尾(入聲)。',
      items: [
        { symbol: 'am', example: '心', exampleGloss: 'sam1', speak: '心' },
        { symbol: 'an', example: '新', exampleGloss: 'san1', speak: '新' },
        { symbol: 'ang', example: '生', exampleGloss: 'sang1', speak: '生' },
        { symbol: 'ap', example: '濕', exampleGloss: 'sap1(入聲)', speak: '濕' },
        { symbol: 'at', example: '失', exampleGloss: 'sat1(入聲)', speak: '失' },
        { symbol: 'ak', example: '塞', exampleGloss: 'sak1(入聲)', speak: '塞' },
      ],
    },
    {
      title: '六個聲調',
      note: '同一個音 si,六個聲調六個意思。這是粵語發音的核心難點,反覆跟讀對比。',
      items: [
        { symbol: '1 高平', roman: 'si1', example: '詩', exampleGloss: '詩歌', speak: '詩' },
        { symbol: '2 中升', roman: 'si2', example: '史', exampleGloss: '歷史', speak: '史' },
        { symbol: '3 中平', roman: 'si3', example: '試', exampleGloss: '嘗試', speak: '試' },
        { symbol: '4 低降', roman: 'si4', example: '時', exampleGloss: '時間', speak: '時' },
        { symbol: '5 低升', roman: 'si5', example: '市', exampleGloss: '市場', speak: '市' },
        { symbol: '6 低平', roman: 'si6', example: '事', exampleGloss: '事情', speak: '事' },
      ],
    },
  ],
};
