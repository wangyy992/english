// 三種語言的常用短語(問候/數字/點餐/問路/應急)。與發音欄共用 locale,
// 支持 TTS 朗讀與跟讀評分。speak/roman 均為目標語文本與拼音,zh 為中文。

export interface Phrase {
  /** 目標語言文本(TTS 與跟讀評分用) */
  text: string;
  /** 拼音/羅馬音 */
  roman: string;
  /** 中文 */
  zh: string;
}

export interface PhraseGroup {
  title: string;
  items: Phrase[];
}

export interface PhraseLang {
  id: 'yue' | 'ko' | 'fr';
  locale: string;
  groups: PhraseGroup[];
}

const cantonese: PhraseLang = {
  id: 'yue',
  locale: 'zh-HK',
  groups: [
    {
      title: '問候與禮貌',
      items: [
        { text: '你好', roman: 'nei5 hou2', zh: '你好' },
        { text: '早晨', roman: 'zou2 san4', zh: '早上好' },
        { text: '唔該', roman: 'm4 goi1', zh: '謝謝/勞駕(請求時)' },
        { text: '多謝', roman: 'do1 ze6', zh: '多謝(受禮/致謝)' },
        { text: '對唔住', roman: 'deoi3 m4 zyu6', zh: '對不起' },
        { text: '再見', roman: 'zoi3 gin3', zh: '再見' },
      ],
    },
    {
      title: '數字 1–10',
      items: [
        { text: '一', roman: 'jat1', zh: '1' },
        { text: '二', roman: 'ji6', zh: '2' },
        { text: '三', roman: 'saam1', zh: '3' },
        { text: '四', roman: 'sei3', zh: '4' },
        { text: '五', roman: 'ng5', zh: '5' },
        { text: '六', roman: 'luk6', zh: '6' },
        { text: '七', roman: 'cat1', zh: '7' },
        { text: '八', roman: 'baat3', zh: '8' },
        { text: '九', roman: 'gau2', zh: '9' },
        { text: '十', roman: 'sap6', zh: '10' },
      ],
    },
    {
      title: '點餐與購物',
      items: [
        { text: '幾多錢', roman: 'gei2 do1 cin2', zh: '多少錢' },
        { text: '我要呢個', roman: 'ngo5 jiu3 ni1 go3', zh: '我要這個' },
        { text: '埋單', roman: 'maai4 daan1', zh: '結賬' },
        { text: '好味', roman: 'hou2 mei6', zh: '好吃' },
      ],
    },
    {
      title: '問路與出行',
      items: [
        { text: '洗手間喺邊度', roman: 'sai2 sau2 gaan1 hai2 bin1 dou6', zh: '洗手間在哪' },
        { text: '點去', roman: 'dim2 heoi3', zh: '怎麼去' },
      ],
    },
    {
      title: '應急',
      items: [
        { text: '幫幫手', roman: 'bong1 bong1 sau2', zh: '幫幫忙' },
        { text: '我唔識講廣東話', roman: 'ngo5 m4 sik1 gong2 gwong2 dung1 waa2', zh: '我不會說廣東話' },
        { text: '慢慢講', roman: 'maan6 maan2 gong2', zh: '說慢一點' },
      ],
    },
  ],
};

const korean: PhraseLang = {
  id: 'ko',
  locale: 'ko-KR',
  groups: [
    {
      title: '問候與禮貌',
      items: [
        { text: '안녕하세요', roman: 'annyeonghaseyo', zh: '你好' },
        { text: '감사합니다', roman: 'gamsahamnida', zh: '謝謝' },
        { text: '죄송합니다', roman: 'joesonghamnida', zh: '對不起' },
        { text: '안녕히 가세요', roman: 'annyeonghi gaseyo', zh: '再見(對離開者)' },
        { text: '네 / 아니요', roman: 'ne / aniyo', zh: '是/不是' },
      ],
    },
    {
      title: '數字 1–10(漢字詞)',
      items: [
        { text: '일', roman: 'il', zh: '1' },
        { text: '이', roman: 'i', zh: '2' },
        { text: '삼', roman: 'sam', zh: '3' },
        { text: '사', roman: 'sa', zh: '4' },
        { text: '오', roman: 'o', zh: '5' },
        { text: '육', roman: 'yuk', zh: '6' },
        { text: '칠', roman: 'chil', zh: '7' },
        { text: '팔', roman: 'pal', zh: '8' },
        { text: '구', roman: 'gu', zh: '9' },
        { text: '십', roman: 'sip', zh: '10' },
      ],
    },
    {
      title: '點餐與購物',
      items: [
        { text: '얼마예요?', roman: 'eolmayeyo', zh: '多少錢' },
        { text: '이거 주세요', roman: 'igeo juseyo', zh: '給我這個' },
        { text: '계산해 주세요', roman: 'gyesanhae juseyo', zh: '結賬' },
        { text: '맛있어요', roman: 'masisseoyo', zh: '好吃' },
      ],
    },
    {
      title: '問路與出行',
      items: [
        { text: '화장실 어디예요?', roman: 'hwajangsil eodiyeyo', zh: '洗手間在哪' },
        { text: '여기가 어디예요?', roman: 'yeogiga eodiyeyo', zh: '這是哪裡' },
      ],
    },
    {
      title: '應急',
      items: [
        { text: '도와주세요', roman: 'dowajuseyo', zh: '請幫我' },
        { text: '한국어 잘 못해요', roman: 'hangugeo jal motaeyo', zh: '我韓語不好' },
        { text: '천천히 말해 주세요', roman: 'cheoncheonhi malhae juseyo', zh: '請說慢一點' },
      ],
    },
  ],
};

const french: PhraseLang = {
  id: 'fr',
  locale: 'fr-FR',
  groups: [
    {
      title: '問候與禮貌',
      items: [
        { text: 'Bonjour', roman: 'bɔ̃ʒuʁ', zh: '你好(白天)' },
        { text: 'Merci', roman: 'mɛʁsi', zh: '謝謝' },
        { text: 'Excusez-moi', roman: 'ɛkskyze mwa', zh: '對不起/勞駕' },
        { text: 'Au revoir', roman: 'o ʁəvwaʁ', zh: '再見' },
        { text: "S'il vous plaît", roman: 'sil vu plɛ', zh: '請' },
        { text: 'Oui / Non', roman: 'wi / nɔ̃', zh: '是/否' },
      ],
    },
    {
      title: '數字 1–10',
      items: [
        { text: 'un', roman: 'œ̃', zh: '1' },
        { text: 'deux', roman: 'dø', zh: '2' },
        { text: 'trois', roman: 'tʁwa', zh: '3' },
        { text: 'quatre', roman: 'katʁ', zh: '4' },
        { text: 'cinq', roman: 'sɛ̃k', zh: '5' },
        { text: 'six', roman: 'sis', zh: '6' },
        { text: 'sept', roman: 'sɛt', zh: '7' },
        { text: 'huit', roman: 'ɥit', zh: '8' },
        { text: 'neuf', roman: 'nœf', zh: '9' },
        { text: 'dix', roman: 'dis', zh: '10' },
      ],
    },
    {
      title: '點餐與購物',
      items: [
        { text: 'C\'est combien ?', roman: 'sɛ kɔ̃bjɛ̃', zh: '多少錢' },
        { text: 'Je voudrais ça', roman: 'ʒə vudʁɛ sa', zh: '我要這個' },
        { text: "L'addition, s'il vous plaît", roman: 'ladisjɔ̃ sil vu plɛ', zh: '結賬' },
        { text: 'C\'est délicieux', roman: 'sɛ delisjø', zh: '很好吃' },
      ],
    },
    {
      title: '問路與出行',
      items: [
        { text: 'Où sont les toilettes ?', roman: 'u sɔ̃ le twalɛt', zh: '洗手間在哪' },
        { text: 'Où est la gare ?', roman: 'u ɛ la gaʁ', zh: '火車站在哪' },
      ],
    },
    {
      title: '應急',
      items: [
        { text: 'Aidez-moi, s\'il vous plaît', roman: 'ɛde mwa sil vu plɛ', zh: '請幫我' },
        { text: 'Je ne parle pas bien français', roman: 'ʒə nə paʁl pa bjɛ̃ fʁɑ̃sɛ', zh: '我法語不好' },
        { text: 'Parlez lentement, s\'il vous plaît', roman: 'paʁle lɑ̃tmɑ̃ sil vu plɛ', zh: '請說慢點' },
      ],
    },
  ],
};

export const PHRASE_LANGS: PhraseLang[] = [cantonese, korean, french];

export function getPhraseLang(id: string): PhraseLang | undefined {
  return PHRASE_LANGS.find((l) => l.id === id);
}
