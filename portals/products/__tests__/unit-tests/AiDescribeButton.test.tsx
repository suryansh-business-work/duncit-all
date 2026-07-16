import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AiDescribeButton from '../../src/pages/inventory-page/inventory-product-page/AiDescribeButton';
import { blankProductForm } from '../../src/pages/inventory-page/inventory-product-page/types';

const mut = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useMutation: () => [mut.fn, { loading: false }],
}));

const values = { ...blankProductForm, product_name: 'Cold Brew', tags: ['coffee'] };

beforeEach(() => {
  mut.fn.mockReset();
});

describe('AiDescribeButton', () => {
  it('is disabled with a hint when there is no product name', () => {
    render(
      <AiDescribeButton
        values={{ ...blankProductForm, product_name: '  ' }}
        onApply={vi.fn()}
        onError={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Generate with AI/i })).toBeDisabled();
  });

  it('applies the AI-generated copy on success', async () => {
    mut.fn.mockResolvedValue({
      data: {
        aiDescribeInventoryProduct: JSON.stringify({
          short_description: 'Short',
          description: 'Long copy',
        }),
      },
    });
    const onApply = vi.fn();
    render(<AiDescribeButton values={values} onApply={onApply} onError={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Generate with AI/i }));
    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith({ short_description: 'Short', description: 'Long copy' }),
    );
  });

  it('defaults missing fields to empty strings', async () => {
    mut.fn.mockResolvedValue({
      data: { aiDescribeInventoryProduct: JSON.stringify({ short_description: 'Only short' }) },
    });
    const onApply = vi.fn();
    render(<AiDescribeButton values={values} onApply={onApply} onError={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Generate with AI/i }));
    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith({ short_description: 'Only short', description: '' }),
    );
  });

  it('reports malformed AI JSON', async () => {
    mut.fn.mockResolvedValue({ data: { aiDescribeInventoryProduct: 'not json' } });
    const onError = vi.fn();
    render(<AiDescribeButton values={values} onApply={vi.fn()} onError={onError} />);
    fireEvent.click(screen.getByRole('button', { name: /Generate with AI/i }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('AI returned malformed JSON'));
  });

  it('reports a mutation failure', async () => {
    mut.fn.mockRejectedValue(new Error('quota exceeded'));
    const onError = vi.fn();
    render(<AiDescribeButton values={values} onApply={vi.fn()} onError={onError} />);
    fireEvent.click(screen.getByRole('button', { name: /Generate with AI/i }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('quota exceeded'));
  });

  it('falls back to a generic message when the error has none', async () => {
    mut.fn.mockRejectedValue({});
    const onError = vi.fn();
    render(<AiDescribeButton values={values} onApply={vi.fn()} onError={onError} />);
    fireEvent.click(screen.getByRole('button', { name: /Generate with AI/i }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('AI generation failed'));
  });
});
