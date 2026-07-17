import type { PronLang } from './types';

// 法語 IPA 音位。重點放在對中文/英語母語者的難點:圓唇前元音、鼻元音、
// 半元音、小舌音 R。示範用法語單詞朗讀。
export const french: PronLang = {
  id: 'fr',
  name: '法語 · 音標',
  locale: 'fr-FR',
  desc: '法語約 36 個音位。難點是鼻元音、圓唇音 [y]/[ø]、聯誦與小舌音 [ʁ]。',
  groups: [
    {
      title: '口元音',
      note: '[y]/[ø]/[œ] 是圓唇前元音,中英文裡沒有,重點練。',
      items: [
        { symbol: '[a]', roman: 'a', example: 'patte', exampleGloss: '爪子', speak: 'patte' },
        { symbol: '[e]', roman: 'é 閉', example: 'été', exampleGloss: '夏天', speak: 'été' },
        { symbol: '[ɛ]', roman: 'è 開', example: 'mère', exampleGloss: '母親', speak: 'mère' },
        { symbol: '[i]', roman: 'i', example: 'lit', exampleGloss: '床', speak: 'lit' },
        { symbol: '[o]', roman: 'o 閉', example: 'mot', exampleGloss: '詞', speak: 'mot' },
        { symbol: '[ɔ]', roman: 'o 開', example: 'porte', exampleGloss: '門', speak: 'porte' },
        { symbol: '[u]', roman: 'ou', example: 'vous', exampleGloss: '您/你們', speak: 'vous' },
        { symbol: '[y]', roman: 'u(圓唇)', example: 'tu', exampleGloss: '你', speak: 'tu' },
        { symbol: '[ø]', roman: 'eu 閉', example: 'peu', exampleGloss: '少', speak: 'peu' },
        { symbol: '[œ]', roman: 'eu 開', example: 'sœur', exampleGloss: '姐妹', speak: 'sœur' },
        { symbol: '[ə]', roman: 'e 弱化', example: 'le', exampleGloss: '(冠詞)', speak: 'le' },
      ],
    },
    {
      title: '鼻元音',
      note: '氣流從鼻腔出,末尾不讀出 n/m。法語標誌性難點。',
      items: [
        { symbol: '[ɑ̃]', roman: 'an/en', example: 'blanc', exampleGloss: '白色', speak: 'blanc' },
        { symbol: '[ɛ̃]', roman: 'in/ain', example: 'vin', exampleGloss: '葡萄酒', speak: 'vin' },
        { symbol: '[ɔ̃]', roman: 'on', example: 'bon', exampleGloss: '好', speak: 'bon' },
        { symbol: '[œ̃]', roman: 'un', example: 'brun', exampleGloss: '棕色(常併入 ɛ̃)', speak: 'brun' },
      ],
    },
    {
      title: '半元音',
      note: '滑音,與後接元音連讀。',
      items: [
        { symbol: '[j]', roman: 'y/i', example: 'hier', exampleGloss: '昨天', speak: 'hier' },
        { symbol: '[w]', roman: 'ou+元音', example: 'oui', exampleGloss: '是', speak: 'oui' },
        { symbol: '[ɥ]', roman: 'u+元音', example: 'huit', exampleGloss: '八', speak: 'huit' },
      ],
    },
    {
      title: '重點輔音',
      note: '[ʁ] 是小舌音,不是英語/中文的 r;其餘為易混輔音。',
      items: [
        { symbol: '[ʁ]', roman: 'r 小舌', example: 'rue', exampleGloss: '街道', speak: 'rue' },
        { symbol: '[ʃ]', roman: 'ch', example: 'chat', exampleGloss: '貓', speak: 'chat' },
        { symbol: '[ʒ]', roman: 'j/ge', example: 'jour', exampleGloss: '白天', speak: 'jour' },
        { symbol: '[ɲ]', roman: 'gn', example: 'montagne', exampleGloss: '山', speak: 'montagne' },
        { symbol: '[ŋ]', roman: 'ng', example: 'parking', exampleGloss: '停車場(外來)', speak: 'parking' },
      ],
    },
  ],
};
