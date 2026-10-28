import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import MusicNoteOutlinedIcon from '@mui/icons-material/MusicNoteOutlined';
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { categoryIcon } from '../../../pages/discover/categoryIcon';

/** The full MUI set is a lazy chunk; loading it inside jsdom takes a few seconds. */
const SET_LOAD = { timeout: 10_000 };

describe('categoryIcon', () => {
  it.each([
    ['MusicNote', MusicNoteOutlinedIcon],
    ['Code', CodeOutlinedIcon],
    ['Pets', PetsOutlinedIcon],
    // The admin picks the filled name; Lite draws the outlined glyph.
    ['Favorite', FavoriteBorderOutlinedIcon],
  ])('draws the outlined glyph for the icon name %s', (name, icon) => {
    expect(categoryIcon(name).type).toBe(icon);
  });

  it.each([null, undefined, ''])('draws the generic category glyph when no icon is set (%s)', (name) => {
    expect(categoryIcon(name).type).toBe(CategoryOutlinedIcon);
  });

  it.each([
    // Any other icon from the console's picker, outlined where MUI has that form…
    ['SportsTennis', 'SportsTennisOutlinedIcon'],
    // …and exactly as picked when the name already is a variant.
    ['PetsRounded', 'PetsRoundedIcon'],
  ])('draws %s from the full MUI set once it loads', async (name, testId) => {
    render(categoryIcon(name));
    expect(await screen.findByTestId(testId, {}, SET_LOAD)).toBeInTheDocument();
  });

  it.each(['NotAnIcon', 'musicnote'])('keeps the generic glyph for %s, which MUI does not export', async (name) => {
    render(
      <>
        {categoryIcon('SportsTennis')}
        {categoryIcon(name)}
      </>
    );
    // Both wait on the same load; once the real icon is drawn, the set has arrived.
    await screen.findByTestId('SportsTennisOutlinedIcon', {}, SET_LOAD);
    expect(screen.getByTestId('CategoryOutlinedIcon')).toBeInTheDocument();
  });
});
