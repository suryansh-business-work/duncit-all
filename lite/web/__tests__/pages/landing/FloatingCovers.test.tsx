import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { buildLiteTheme } from '../../../../shared/theme';
import { FloatingCovers } from '../../../pages/landing/FloatingCovers';

const renderCovers = (covers: readonly string[]) =>
  render(
    <ThemeProvider theme={buildLiteTheme()}>
      <FloatingCovers covers={covers} />
    </ThemeProvider>,
  );

describe('FloatingCovers', () => {
  it('is decoration only: hidden from assistive technology', () => {
    const { container } = renderCovers(['https://img.example/a.jpg']);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('cycles the real covers through all twelve slots, each as a decorative picture', () => {
    const { container } = renderCovers(['https://img.example/a.jpg', 'https://img.example/b.jpg']);
    const images = [...container.querySelectorAll('img')];
    expect(images).toHaveLength(12);
    expect(images.map((image) => image.getAttribute('src'))).toEqual(
      Array.from({ length: 12 }, (_, index) => (index % 2 === 0 ? 'https://img.example/a.jpg' : 'https://img.example/b.jpg')),
    );
    for (const image of images) {
      expect(image).toHaveAttribute('alt', '');
      expect(image).toHaveAttribute('loading', 'lazy');
    }
  });

  it('falls back to tinted tiles (no pictures) while there are no covers yet', () => {
    const { container } = renderCovers([]);
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(container.querySelectorAll('[data-lite-animate]')).toHaveLength(12);
  });
});
