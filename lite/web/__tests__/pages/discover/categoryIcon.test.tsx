import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import MusicNoteOutlinedIcon from '@mui/icons-material/MusicNoteOutlined';
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined';
import { describe, expect, it } from 'vitest';
import { categoryIcon } from '../../../pages/discover/categoryIcon';

describe('categoryIcon', () => {
  it.each([
    ['MusicNote', MusicNoteOutlinedIcon],
    ['Code', CodeOutlinedIcon],
    ['Pets', PetsOutlinedIcon],
    // The admin types the filled name; Lite draws the outlined glyph.
    ['Favorite', FavoriteBorderOutlinedIcon],
  ])('draws the outlined glyph for the icon name %s', (name, icon) => {
    expect(categoryIcon(name).type).toBe(icon);
  });

  it.each([null, undefined, '', 'NotAnIcon', 'musicnote'])('falls back to the generic category glyph for %s', (name) => {
    expect(categoryIcon(name).type).toBe(CategoryOutlinedIcon);
  });
});
