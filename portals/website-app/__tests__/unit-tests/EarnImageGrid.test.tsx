import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import EarnImageGrid from '../../src/pages/website/earn/earn-form/EarnImageGrid';
import { en } from '../en';

const IMAGES = ['https://ik.test/a.jpg', 'https://ik.test/b.jpg', 'https://ik.test/c.jpg'];

const mount = (images = IMAGES, disabled = false) => {
  const onChange = vi.fn();
  render(<EarnImageGrid images={images} disabled={disabled} onChange={onChange} />);
  return onChange;
};
const button = (key: 'imageMoveLeft' | 'imageMoveRight' | 'imageRemove', n: number) =>
  screen.getByRole('button', { name: en(`websiteApp.earn.${key}`, { n }) });

describe('EarnImageGrid', () => {
  it('draws nothing when there are no photos', () => {
    const { container } = render(<EarnImageGrid images={[]} disabled={false} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each photo in order, numbered for screen readers', () => {
    mount();
    const list = screen.getByRole('list', { name: en('websiteApp.earn.imagesList') });
    expect(list.querySelectorAll('li')).toHaveLength(3);
    expect(screen.getByAltText(en('websiteApp.earn.imageAlt', { n: 2 }))).toHaveAttribute('src', IMAGES[1]);
  });

  it('moves a photo one step earlier', () => {
    const onChange = mount();
    fireEvent.click(button('imageMoveLeft', 2));
    expect(onChange).toHaveBeenCalledWith([IMAGES[1], IMAGES[0], IMAGES[2]]);
  });

  it('moves a photo one step later', () => {
    const onChange = mount();
    fireEvent.click(button('imageMoveRight', 2));
    expect(onChange).toHaveBeenCalledWith([IMAGES[0], IMAGES[2], IMAGES[1]]);
  });

  it('removes only the chosen photo', () => {
    const onChange = mount();
    fireEvent.click(button('imageRemove', 2));
    expect(onChange).toHaveBeenCalledWith([IMAGES[0], IMAGES[2]]);
  });

  it('cannot move the first photo earlier or the last one later', () => {
    mount();
    expect(button('imageMoveLeft', 1)).toBeDisabled();
    expect(button('imageMoveRight', 3)).toBeDisabled();
    expect(button('imageMoveLeft', 2)).toBeEnabled();
    expect(button('imageMoveRight', 1)).toBeEnabled();
  });

  it('locks every control while an upload is under way', () => {
    mount(IMAGES, true);
    for (const n of [1, 2, 3]) {
      expect(button('imageMoveLeft', n)).toBeDisabled();
      expect(button('imageMoveRight', n)).toBeDisabled();
      expect(button('imageRemove', n)).toBeDisabled();
    }
  });
});
