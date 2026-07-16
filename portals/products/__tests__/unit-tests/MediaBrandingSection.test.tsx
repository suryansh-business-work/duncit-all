import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFormContext } from 'react-hook-form';
import MediaBrandingSection from '../../src/pages/inventory-page/inventory-product-page/MediaBrandingSection';
import { ProductFormHarness } from './form-harness';

const images = vi.hoisted(() => ({ props: null as null | Record<string, any> }));
const ai = vi.hoisted(() => ({ props: null as null | Record<string, any> }));

vi.mock('../../src/pages/inventory-page/inventory-product-page/ImagesField', () => ({
  default: (props: Record<string, any>) => {
    images.props = props;
    return <div data-testid="images-field" data-cover={props.coverUrl} />;
  },
}));
vi.mock('../../src/pages/inventory-page/inventory-product-page/AiDescribeButton', () => ({
  default: (props: Record<string, any>) => {
    ai.props = props;
    return <button onClick={() => props.onApply(ai.applied)}>ai</button>;
  },
}));

function Probe() {
  const { watch } = useFormContext();
  return (
    <output data-testid="probe">{`${watch('image_url')}|${watch('short_description')}|${watch('description')}`}</output>
  );
}

const setup = () =>
  render(
    <ProductFormHarness>
      <MediaBrandingSection onError={vi.fn()} />
      <Probe />
    </ProductFormHarness>,
  );

describe('MediaBrandingSection', () => {
  it('writes picked images and the cover into the form', () => {
    setup();
    images.props?.onChange(['x.jpg', 'y.jpg'], 'y.jpg');
    expect(screen.getByTestId('probe').textContent).toContain('y.jpg|');
  });

  it('applies AI copy for both description fields when present', () => {
    (ai as any).applied = { short_description: 'S', description: 'D' };
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'ai' }));
    expect(screen.getByTestId('probe').textContent).toContain('|S|D');
  });

  it('skips empty AI fields', () => {
    (ai as any).applied = { short_description: '', description: '' };
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'ai' }));
    // Both remain blank (skipped setValue branches).
    expect(screen.getByTestId('probe').textContent).toBe('||');
  });
});
