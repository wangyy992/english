// 粵語開放詞典:12 萬詞條(常用字 + ≤4 字詞),粵拼數據源自 rime-cantonese
// (CC BY 4.0)。文件較大(gzip ~1MB),故按需 fetch 一次並緩存,只在用戶
// 使用粵語查詞時加載,不進主 bundle。
type YueDict = Record<string, string>;

let dictPromise: Promise<YueDict> | null = null;

function load(): Promise<YueDict> {
  dictPromise ??= fetch('./data/dict/yue.json')
    .then((res) => {
      if (!res.ok) throw new Error('yue dict unavailable');
      return res.json() as Promise<YueDict>;
    })
    .catch((err) => {
      dictPromise = null; // 失敗可重試
      throw err;
    });
  return dictPromise;
}

export interface YueHit {
  w: string;
  jyut: string;
}

/** 精確查一個粵語詞的粵拼。 */
export async function lookupYue(word: string): Promise<string | null> {
  const dict = await load();
  return dict[word.trim()] ?? null;
}

/**
 * 搜索:支持漢字(前綴/包含)與粵拼(包含)。漢字精確與前綴優先,限 20 條。
 */
export async function searchYue(query: string, limit = 20): Promise<YueHit[]> {
  const q = query.trim();
  if (!q) return [];
  const dict = await load();
  const isLatin = /^[a-z0-9\s]+$/i.test(q);

  if (dict[q]) {
    const rest = collect(dict, q, isLatin, limit - 1);
    return [{ w: q, jyut: dict[q] }, ...rest.filter((h) => h.w !== q)].slice(0, limit);
  }
  return collect(dict, q, isLatin, limit);
}

function collect(dict: YueDict, q: string, byJyut: boolean, limit: number): YueHit[] {
  const ql = q.toLowerCase();
  const prefix: YueHit[] = [];
  const contains: YueHit[] = [];
  for (const w in dict) {
    const jyut = dict[w];
    if (byJyut) {
      // 粵拼搜索:匹配讀音(忽略聲調數字更寬鬆)
      const j = jyut.toLowerCase();
      if (j.startsWith(ql)) prefix.push({ w, jyut });
      else if (j.replace(/[0-9\s]/g, '').includes(ql.replace(/[0-9\s]/g, ''))) contains.push({ w, jyut });
    } else {
      if (w.startsWith(q)) prefix.push({ w, jyut });
      else if (w.includes(q)) contains.push({ w, jyut });
    }
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...contains].slice(0, limit);
}
