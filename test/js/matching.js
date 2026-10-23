// Keep normalization and suggestion policy independent from game transitions.
export function normalize(value) {
  return String(value).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[’'`]/g, '').replace(/\p{P}/gu, (mark, offset, source) => {
      // Signs, fractions, decimals and percentages must not turn into a
      // different numeric answer when punctuation is normalized.
      if (mark === '%' || (/[-./]/.test(mark) && /^\s*\d/.test(source.slice(offset + 1)))) return mark;
      return ' ';
    }).replace(/\s+/g, ' ').trim();
}

// Damerau-Levenshtein (restricted): a transposition counts as one edit.
export function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) d[i][0] = i;
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

export function matchAnswer(input, prompt) {
  const value = normalize(input);
  if (!value || value.length > 120) return { kind: 'invalid' };
  const candidates = prompt.answers.map(answer => ({ answer,
    names: [answer.canonical, ...answer.aliases].map(normalize) }));
  const exact = candidates.filter(c => c.names.includes(value));
  if (exact.length === 1) return { kind: 'exact', answer: exact[0].answer };
  if (exact.length > 1) return { kind: 'ambiguous' };
  // Short words, symbols and numbers require an exact match. Only a single
  // one-edit candidate is suggested; even a more distant tie is never guessed.
  if (prompt.fuzzy === false || value.length < 4 || !/^[a-z ]+$/.test(value)) return { kind: 'invalid' };
  const close = candidates.filter(c => c.names.some(name =>
    name.length >= 4 && /^[a-z ]+$/.test(name) && Math.abs(name.length - value.length) <= 1 && distance(value, name) === 1));
  if (close.length > 1) return { kind: 'ambiguous' };
  return close.length === 1 ? { kind: 'suggestion', answer: close[0].answer } : { kind: 'invalid' };
}
