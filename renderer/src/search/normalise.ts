/**
 * Fold a term the same way on both sides of a search.
 *
 * <p>Turkish is the reason this is not `toLowerCase()`. The dotted and dotless i are
 * different letters — `I` lowercases to `ı` and `İ` to `i` — so a naive English fold turns
 * "yapIlandIrma" into something that never matches "yapılandırma", and a Turkish-locale
 * fold turns an English "IP" into "ıp". Both directions are wrong, and the fix is not to
 * pick a locale: it is to remove the distinction from the index and from the query alike,
 * so "yapilandirma" and "yapılandırma" reach the same term.
 *
 * <p>Only the index terms are folded. Nothing displayed to a reader passes through here —
 * a title, an excerpt and a heading keep every mark they were written with.
 */
const TURKISH: Record<string, string> = {
  ı: 'i',
  İ: 'i',
  I: 'i',
  ş: 's',
  Ş: 's',
  ğ: 'g',
  Ğ: 'g',
  ç: 'c',
  Ç: 'c',
  ö: 'o',
  Ö: 'o',
  ü: 'u',
  Ü: 'u',
};

export const fold = (term: string): string =>
  term
    // Compose first, so a decomposed "ü" and a precomposed one are the same string
    // before anything else looks at them.
    .normalize('NFC')
    .replace(/[ıİIşŞğĞçÇöÖüÜ]/g, (character) => TURKISH[character] ?? character)
    // Everything left that carries a mark — accented Latin from an English page quoting a
    // name — folds to its base letter.
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Split text into index terms. Digits and dots survive, because `keydra.store.url` is a term. */
export const tokenise = (text: string): string[] =>
  text
    .split(/[^\p{L}\p{N}._:/-]+/u)
    .flatMap((token) => (token.includes('.') || token.includes(':') ? [token, ...token.split(/[.:]/)] : [token]))
    .map((token) => token.replace(/^[._:/-]+|[._:/-]+$/g, ''))
    .filter((token) => token.length > 1);
