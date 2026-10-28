import { describe, expect, it, vi } from 'vitest';
import { shortSuffix, slugify, uniqueSlug } from '../../utils/slug';

describe('slugify', () => {
  it('lowercases and joins words with single hyphens', () => {
    expect(slugify('Sunday Jazz @ Bandra!')).toBe('sunday-jazz-bandra');
    expect(slugify('  --Hello,   World--  ')).toBe('hello-world');
  });

  it('strips accents rather than dropping the letters', () => {
    expect(slugify('Café Déjà Vu')).toBe('cafe-deja-vu');
  });

  it('caps the slug at 60 characters', () => {
    expect(slugify('a'.repeat(80))).toBe('a'.repeat(60));
  });

  it('never ends on a hyphen where the cut lands just after one', () => {
    expect(slugify(`${'a'.repeat(59)} bcd`)).toBe('a'.repeat(59));
  });

  it('answers an empty string when nothing usable is left', () => {
    expect(slugify('!!! ###')).toBe('');
  });
});

describe('shortSuffix', () => {
  it('is six hex characters', () => {
    expect(shortSuffix()).toMatch(/^[0-9a-f]{6}$/);
  });
});

describe('uniqueSlug', () => {
  it('uses the plain slug when it is free', async () => {
    const exists = vi.fn(async () => false);
    await expect(uniqueSlug('Garden Party', exists)).resolves.toBe('garden-party');
    expect(exists).toHaveBeenCalledWith('garden-party');
  });

  it('adds a random suffix when the plain slug is taken', async () => {
    const exists = vi.fn(async (slug: string) => slug === 'garden-party');
    await expect(uniqueSlug('Garden Party', exists)).resolves.toMatch(/^garden-party-[0-9a-f]{6}$/);
  });

  it('falls back to the given word when the base has no usable characters', async () => {
    await expect(uniqueSlug('!!!', async () => false, 'event')).resolves.toBe('event');
    await expect(uniqueSlug('!!!', async () => false)).resolves.toBe('item');
  });

  it('ends with a time-based suffix after eight taken attempts', async () => {
    const exists = vi.fn(async () => true);
    await expect(uniqueSlug('Garden Party', exists)).resolves.toMatch(/^garden-party-[0-9a-z]+$/);
    expect(exists).toHaveBeenCalledTimes(9);
  });
});
