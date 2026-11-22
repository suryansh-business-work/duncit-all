import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EMPLOYEE_TARGET_LIMITS } from '@duncit/utils';
import { ReviewTargetForm, reviewTargetSchema } from '.';

type Translate = Parameters<typeof reviewTargetSchema>[0];
const t = ((key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${Object.values(options.vars).join('|')}` : key) as Translate;

const comment = () => screen.getByTestId('review-target-comment') as HTMLInputElement;

describe('reviewTargetSchema', () => {
  it('takes an optional, trimmed comment within the server limit', () => {
    expect(reviewTargetSchema(t).parse({ comment: '  Great month ' })).toEqual({ comment: 'Great month' });
    expect(reviewTargetSchema(t).parse({ comment: '' })).toEqual({ comment: '' });
    const result = reviewTargetSchema(t).safeParse({ comment: 'x'.repeat(EMPLOYEE_TARGET_LIMITS.commentMax + 1) });
    expect(result.success).toBe(false);
  });
});

describe('ReviewTargetForm', () => {
  it('marks the report reviewed with the comment, then clears it', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<ReviewTargetForm onSubmit={onSubmit} />);
    fireEvent.change(comment(), { target: { value: 'Great month' } });
    fireEvent.click(screen.getByTestId('review-target-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ comment: 'Great month' }));
    await waitFor(() => expect(comment().value).toBe(''));
  });

  it('can be sent without a comment, and keeps what was typed when saving fails', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    render(<ReviewTargetForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('review-target-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ comment: '' }));
    fireEvent.change(comment(), { target: { value: 'Keep me' } });
    fireEvent.click(screen.getByTestId('review-target-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(comment().value).toBe('Keep me');
  });
});
