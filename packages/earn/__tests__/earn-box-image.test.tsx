/**
 * The featured image across the top of an Earn with Duncit card. It is
 * decorative — the title says what the card is — and it must never leave a
 * broken-image box behind: a card whose image fails to load reads as a card
 * with no image at all.
 */
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import EarnBox from '../src/EarnBox';
import { settle, wrap } from './test-utils';

const base = {
  icon: <span data-testid="icon" />,
  title: 'Become a Host',
  description: 'Run pods for your club.',
  onOpen: vi.fn(),
  disabled: false,
};

/** The card's one image — failing here, not on a null, when it is missing. */
const imageIn = (container: HTMLElement) => {
  const image = container.querySelector('img');
  if (!image) throw new Error('the card drew no featured image');
  return image;
};

describe('EarnBox featured image', () => {
  it('draws the image as decoration above the title', async () => {
    const { container } = wrap(<EarnBox {...base} imageUrl="https://img.test/host.jpg" />);
    await settle();

    const image = imageIn(container);
    expect(image).toHaveAttribute('src', 'https://img.test/host.jpg');
    expect(image).toHaveAttribute('alt', '');
    expect(screen.getByText('Become a Host')).toBeInTheDocument();
  });

  it('drops the image when it fails to load and keeps the card', async () => {
    const { container } = wrap(<EarnBox {...base} imageUrl="https://img.test/gone.jpg" />);
    await settle();

    fireEvent.error(imageIn(container));

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Become a Host')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders no image slot when the card has no image', async () => {
    const { container } = wrap(<EarnBox {...base} />);
    await settle();

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Run pods for your club.')).toBeInTheDocument();
  });
});
