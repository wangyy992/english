// Free dictionary lookups for the word-selection popover (§7). Works with no
// DeepSeek key configured — this is the "instant layer" of the lookup card.

export interface DictionaryLookup {
  word: string;
  phonetic?: string;
  meanings: { partOfSpeech: string; definition: string }[];
}

interface RawEntry {
  phonetic?: string;
  phonetics?: { text?: string }[];
  meanings?: { partOfSpeech: string; definitions?: { definition: string }[] }[];
}

export async function lookupWord(word: string): Promise<DictionaryLookup | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim().toLowerCase())}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as RawEntry[];
    const entry = Array.isArray(data) ? data[0] : null;
    if (!entry) return null;
    const phonetic = entry.phonetic || entry.phonetics?.find((p) => p.text)?.text;
    const meanings = (entry.meanings ?? []).slice(0, 3).map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definition: m.definitions?.[0]?.definition ?? '',
    }));
    return { word, phonetic, meanings };
  } catch {
    return null;
  }
}
