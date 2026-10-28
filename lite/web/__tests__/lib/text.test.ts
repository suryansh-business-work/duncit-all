import { describe, expect, it } from 'vitest';
import { initialsOf, paragraphs, splitOptions } from '../../lib/text';

describe('paragraphs', () => {
  it('splits on blank lines, even ones holding spaces, and trims each block', () => {
    expect(paragraphs('  First line\nstill first  \n\nSecond\n   \n\n  Third ')).toEqual(['First line\nstill first', 'Second', 'Third']);
  });

  it('gives nothing for blank text', () => {
    expect(paragraphs('')).toEqual([]);
    expect(paragraphs('\n\n   \n')).toEqual([]);
  });
});

describe('initialsOf', () => {
  it('takes the first letter of the first two words, upper-cased', () => {
    expect(initialsOf('asha rao')).toBe('AR');
    expect(initialsOf('Asha Devi Rao')).toBe('AD');
  });

  it('copes with one word, extra spaces and a blank name', () => {
    expect(initialsOf('Asha')).toBe('A');
    expect(initialsOf('  asha   rao  ')).toBe('AR');
    expect(initialsOf('')).toBe('');
  });
});

describe('splitOptions', () => {
  it('reads one option per line or per comma, trimmed, dropping blanks', () => {
    expect(splitOptions('Veg\nNon-veg, Vegan ,\n\n,Jain')).toEqual(['Veg', 'Non-veg', 'Vegan', 'Jain']);
  });

  it('gives an empty list for an empty box', () => {
    expect(splitOptions('  \n , ')).toEqual([]);
  });
});
