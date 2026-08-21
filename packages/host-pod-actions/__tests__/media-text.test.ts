import { describe, expect, it } from 'vitest';

import {
  hasImageLine,
  hasMediaLine,
  mediaTextToInput,
  mediaToText,
  splitMediaLines,
} from '../src/media-text';

const IMG = 'https://cdn.duncit.com/pod/cover.jpg';
const VID = 'https://cdn.duncit.com/pod/clip.mp4';

describe('splitMediaLines', () => {
  it('trims each line and drops the blanks a textarea leaves behind', () => {
    expect(splitMediaLines(`  ${IMG}  \n\n   \n${VID}\n`)).toEqual([IMG, VID]);
  });

  it('reads an empty field as no lines', () => {
    expect(splitMediaLines('')).toEqual([]);
    expect(splitMediaLines('   \n  \n')).toEqual([]);
  });
});

describe('hasMediaLine', () => {
  it('is true for any line at all, image or video', () => {
    expect(hasMediaLine(IMG)).toBe(true);
    expect(hasMediaLine(VID)).toBe(true);
  });

  it('is false for an empty field', () => {
    expect(hasMediaLine('  \n ')).toBe(false);
  });
});

describe('hasImageLine', () => {
  it('needs at least one image — a pod cover cannot be a video', () => {
    expect(hasImageLine(IMG)).toBe(true);
    expect(hasImageLine(`${VID}\n${IMG}`)).toBe(true);
  });

  it('is false when every line is a video', () => {
    expect(hasImageLine(`${VID}\nhttps://cdn.duncit.com/a.MOV\nhttps://cdn.duncit.com/b.webm`)).toBe(false);
  });

  it('is false for an empty field', () => {
    expect(hasImageLine('')).toBe(false);
  });

  it('recognises the video extensions case-insensitively', () => {
    expect(hasImageLine('https://cdn.duncit.com/a.MP4')).toBe(false);
  });

  it('treats a URL whose extension is only in the middle as an image', () => {
    expect(hasImageLine('https://cdn.duncit.com/a.mp4/thumb')).toBe(true);
  });
});

describe('mediaTextToInput', () => {
  it('tags each line with the type the server expects', () => {
    expect(mediaTextToInput(`${IMG}\n${VID}`)).toEqual([
      { url: IMG, type: 'IMAGE' },
      { url: VID, type: 'VIDEO' },
    ]);
  });

  it('sends nothing for an empty field', () => {
    expect(mediaTextToInput('  ')).toEqual([]);
  });
});

describe('mediaToText', () => {
  it('joins the stored media back into the field value', () => {
    expect(mediaToText([{ url: IMG, type: 'IMAGE' }, { url: VID, type: 'VIDEO' }])).toBe(`${IMG}\n${VID}`);
  });

  it('reads a pod with no media as an empty field', () => {
    expect(mediaToText(null)).toBe('');
    expect(mediaToText(undefined)).toBe('');
    expect(mediaToText([])).toBe('');
  });

  it('round-trips through mediaTextToInput unchanged', () => {
    const text = `${IMG}\n${VID}`;

    expect(mediaToText(mediaTextToInput(text))).toBe(text);
  });
});
