export interface DiffToken {
  text: string;
  matched: boolean;
}

function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9']/g, '');
}

// Word-level LCS diff between the original sentence and a recognized
// transcript. Returns the original sentence's tokens tagged with whether
// each one was found (matched, in order) in the recognized speech.
export function diffAgainstOriginal(original: string, recognized: string): DiffToken[] {
  const origTokens = original.split(/\s+/).filter(Boolean);
  const origNorm = origTokens.map(normalizeWord);
  const recNorm = recognized.split(/\s+/).map(normalizeWord).filter(Boolean);

  const n = origNorm.length;
  const m = recNorm.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] =
        origNorm[i - 1] === recNorm[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const matched = new Set<number>();
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (origNorm[i - 1] === recNorm[j - 1]) {
      matched.add(i - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return origTokens.map((text, idx) => ({ text, matched: matched.has(idx) }));
}
