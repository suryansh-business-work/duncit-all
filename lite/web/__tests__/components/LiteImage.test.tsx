import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LITE_FALLBACK_ICONS } from '../../../shared/fallback-icons';
import { LiteImage } from '../../components/LiteImage';

const COVER = 'https://img.example/cover.jpg';

describe('LiteImage', () => {
  it('draws the picture lazily at its intrinsic size, so nothing shifts as it loads', () => {
    render(<LiteImage src={COVER} alt="Garden Party cover" width={640} height={360} testId="cover" />);
    const image = screen.getByRole('img', { name: 'Garden Party cover' });
    expect(image).toHaveAttribute('src', COVER);
    expect(image).toHaveAttribute('width', '640');
    expect(image).toHaveAttribute('height', '360');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    expect(image).toHaveAttribute('data-testid', 'cover');
  });

  it('loads at once when it is above the fold', () => {
    render(<LiteImage src={COVER} alt="Cover" width={10} height={10} eager />);
    expect(screen.getByRole('img', { name: 'Cover' })).toHaveAttribute('loading', 'eager');
  });

  it.each([null, undefined, '', '   '])('stands the bundled placeholder in for a blank address (%s)', (src) => {
    render(<LiteImage src={src} alt="Cover" width={10} height={10} />);
    expect(screen.getByRole('img', { name: 'Cover' })).toHaveAttribute('src', LITE_FALLBACK_ICONS.placeholder);
  });

  it('swaps to the placeholder when the picture fails to load', () => {
    render(<LiteImage src={COVER} alt="Cover" width={10} height={10} />);
    const image = screen.getByRole('img', { name: 'Cover' });
    fireEvent.error(image);
    expect(image).toHaveAttribute('src', LITE_FALLBACK_ICONS.placeholder);
  });

  it('tries a new address again after an earlier one failed', () => {
    const { rerender } = render(<LiteImage src={COVER} alt="Cover" width={10} height={10} />);
    fireEvent.error(screen.getByRole('img', { name: 'Cover' }));
    rerender(<LiteImage src="https://img.example/other.jpg" alt="Cover" width={10} height={10} />);
    expect(screen.getByRole('img', { name: 'Cover' })).toHaveAttribute('src', 'https://img.example/other.jpg');
  });
});
