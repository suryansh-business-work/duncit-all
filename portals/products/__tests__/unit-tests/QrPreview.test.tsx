import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import QrPreview from '../../src/pages/inventory-page/inventory-product-page/QrPreview';

describe('QrPreview', () => {
  it('shows a placeholder when there is no value', () => {
    render(<QrPreview value="" />);
    expect(screen.getByText(/will appear here once saved/i)).toBeInTheDocument();
  });

  it('renders a QR image encoding the value and defaults the caption to the value', () => {
    render(<QrPreview value="SKU-123" />);
    const img = screen.getByRole('img', { name: 'QR for SKU-123' }) as HTMLImageElement;
    expect(img.src).toContain(encodeURIComponent('SKU-123'));
    expect(screen.getByText('SKU-123')).toBeInTheDocument();
  });

  it('uses a custom caption when provided', () => {
    render(<QrPreview value="SKU-9" caption="Scan me" />);
    expect(screen.getByText('Scan me')).toBeInTheDocument();
  });
});
