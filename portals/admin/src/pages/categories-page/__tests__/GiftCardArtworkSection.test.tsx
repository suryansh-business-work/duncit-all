import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import GiftCardArtworkSection from '../GiftCardArtworkSection';
import { blankForm, type FormState } from '../queries';
import { renderWithProviders } from './testkit';

// The shared media picker dialog owns its own upload/Pexels queries; the field
// wrapper (label + input) this section actually drives stays real.
vi.mock('@duncit/media-picker', () => ({ default: () => null }));

const FRONT_LABEL = 'Gift card front image';
const BACK_LABEL = 'Gift card back image';

const renderSection = (form: FormState) => {
  const onFormChange = vi.fn();
  const view = renderWithProviders(
    <GiftCardArtworkSection form={form} onFormChange={onFormChange} />
  );
  return { ...view, onFormChange };
};

describe('GiftCardArtworkSection', () => {
  it('renders the front/back pickers with no face preview when neither is set', () => {
    renderSection(blankForm);

    expect(screen.getByLabelText(FRONT_LABEL)).toBeTruthy();
    expect(screen.getByLabelText(BACK_LABEL)).toBeTruthy();
    expect(screen.queryByAltText(FRONT_LABEL)).toBeNull();
    expect(screen.queryByAltText(BACK_LABEL)).toBeNull();
    expect(screen.queryByText('Buyers can flip between these faces on mWeb and the app.')).toBeNull();
  });

  it('shows only the front preview when just the front is set', () => {
    renderSection({ ...blankForm, gift_card_image_front: 'https://cdn.test/front.png' });

    expect(screen.getByAltText(FRONT_LABEL).getAttribute('src')).toBe('https://cdn.test/front.png');
    expect(screen.queryByAltText(BACK_LABEL)).toBeNull();
    expect(screen.getByText('Buyers can flip between these faces on mWeb and the app.')).toBeTruthy();
  });

  it('shows only the back preview when just the back is set', () => {
    renderSection({ ...blankForm, gift_card_image_back: 'https://cdn.test/back.png' });

    expect(screen.getByAltText(BACK_LABEL).getAttribute('src')).toBe('https://cdn.test/back.png');
    expect(screen.queryByAltText(FRONT_LABEL)).toBeNull();
  });

  it('shows both previews once both faces are set', () => {
    renderSection({
      ...blankForm,
      gift_card_image_front: 'https://cdn.test/front.png',
      gift_card_image_back: 'https://cdn.test/back.png',
    });

    expect(screen.getByAltText(FRONT_LABEL).getAttribute('src')).toBe('https://cdn.test/front.png');
    expect(screen.getByAltText(BACK_LABEL).getAttribute('src')).toBe('https://cdn.test/back.png');
  });

  it('reports a typed front URL back to the parent without touching the back', () => {
    const { onFormChange } = renderSection({ ...blankForm, gift_card_image_back: 'https://cdn.test/back.png' });

    fireEvent.change(screen.getByLabelText(FRONT_LABEL), {
      target: { value: 'https://cdn.test/new-front.png' },
    });

    expect(onFormChange).toHaveBeenCalledWith({
      ...blankForm,
      gift_card_image_back: 'https://cdn.test/back.png',
      gift_card_image_front: 'https://cdn.test/new-front.png',
    });
  });

  it('reports a typed back URL back to the parent without touching the front', () => {
    const { onFormChange } = renderSection(blankForm);

    fireEvent.change(screen.getByLabelText(BACK_LABEL), {
      target: { value: 'https://cdn.test/new-back.png' },
    });

    expect(onFormChange).toHaveBeenCalledWith({
      ...blankForm,
      gift_card_image_back: 'https://cdn.test/new-back.png',
    });
  });
});
