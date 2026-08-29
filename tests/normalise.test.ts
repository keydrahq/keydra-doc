import { describe, expect, it } from 'vitest';
import { fold, tokenise } from '../renderer/src/search/normalise.ts';

describe('search folding', () => {
  it('makes the Turkish dotted and dotless i the same term', () => {
    // The reason this function exists: a reader typing without Turkish keys must reach
    // the page, and a reader typing with them must reach the same one.
    expect(fold('yapılandırma')).toBe(fold('yapilandirma'));
    expect(fold('YAPILANDIRMA')).toBe(fold('yapılandırma'));
    expect(fold('İzleme')).toBe(fold('izleme'));
  });

  it('does not make an English word unreachable', () => {
    // A Turkish-locale lowercase turns "IP" into "ıp", which then matches nothing.
    expect(fold('IP')).toBe(fold('ip'));
    expect(fold('API')).toBe(fold('api'));
  });

  it('folds the other Turkish letters symmetrically', () => {
    expect(fold('güvenlik')).toBe(fold('guvenlik'));
    expect(fold('şifreleme')).toBe(fold('sifreleme'));
    expect(fold('bağlantı')).toBe(fold('baglanti'));
    expect(fold('çalıştırma')).toBe(fold('calistirma'));
    expect(fold('öznitelik')).toBe(fold('oznitelik'));
  });

  it('treats a decomposed and a precomposed character as one', () => {
    expect(fold('ü')).toBe(fold('ü'));
  });

  it('keeps distinct words distinct', () => {
    expect(fold('yedek')).not.toBe(fold('yetki'));
  });
});

describe('tokenising', () => {
  it('keeps a configuration property whole and also splits it', () => {
    const tokens = tokenise('Set keydra.store.url to point at it');
    expect(tokens).toContain('keydra.store.url');
    expect(tokens).toContain('keydra');
    expect(tokens).toContain('store');
  });

  it('keeps a permission whole and also splits it', () => {
    const tokens = tokenise('requires connection:view');
    expect(tokens).toContain('connection:view');
    expect(tokens).toContain('connection');
  });

  it('drops punctuation and single characters', () => {
    expect(tokenise('a, b — the end')).toEqual(['the', 'end']);
  });

  it('keeps Turkish characters intact for display terms', () => {
    expect(tokenise('bağlantı profili')).toEqual(['bağlantı', 'profili']);
  });
});
