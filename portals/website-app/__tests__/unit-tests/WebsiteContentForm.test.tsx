import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { WebsiteContentForm } from '../../src/pages/website/content/website-content';
import type { WebsiteContentItem } from '../../src/pages/website/content/queries';
import { renderWithProviders } from './testkit';

const dtf = vi.hoisted(() => ({ onChange: null as unknown as (v: string | null) => void }));
const img = vi.hoisted(() => ({ onChange: null as unknown as (v: string | null) => void }));

// The MUI X picker needs a LocalizationProvider; stub DateTimeField (covered by
// its own spec) so the form renders without one. Capture its onChange so a test
// can push a null value (exercising the `field.value ?? ''` fallback).
vi.mock('../../src/components/DateTimeField', () => ({
  default: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (v: string | null) => void;
  }) => {
    dtf.onChange = onChange;
    return <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />;
  },
}));

// SingleImageUploadField pulls in ImageKit upload wiring; stub it to a plain
// input that still drives the Controller's onChange/error/helperText branch.
vi.mock('@duncit/media-picker', () => ({
  SingleImageUploadField: ({
    label,
    value,
    onChange,
    error,
    helperText,
  }: {
    label: string;
    value: string;
    onChange: (v: string | null) => void;
    error?: boolean;
    helperText?: string;
  }) => {
    img.onChange = onChange;
    return (
      <div>
        <input
          aria-label={label}
          aria-invalid={error}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
        {helperText ? <span>{helperText}</span> : null}
      </div>
    );
  },
}));

const item: WebsiteContentItem = {
  id: '1',
  type: 'BLOG',
  title: 'Existing',
  slug: 'existing',
  summary: 'sum',
  body: 'body',
  category: 'Eng',
  image_url: 'https://img/x.png',
  cta_label: 'Go',
  cta_url: 'https://go',
  published_at: '2026-01-15T10:30:00.000Z',
  is_published: true,
  sort_order: 2,
  updated_at: '2026-01-16T00:00:00.000Z',
};

describe('WebsiteContentForm', () => {
  it('submits a new entry with the bound page type', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <WebsiteContentForm
        type="CAREERS"
        item={null}
        submitting={false}
        errorMessage={null}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'New Role' } });
    fireEvent.change(screen.getByLabelText('Image'), { target: { value: 'https://img/new.png' } });
    fireEvent.click(screen.getByLabelText('Published'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ type: 'CAREERS', title: 'New Role' });
  });

  it('seeds fields from an item, shows the error alert and a saving state', () => {
    const onCancel = vi.fn();
    renderWithProviders(
      <WebsiteContentForm
        type="BLOG"
        item={item}
        submitting
        errorMessage="Something failed"
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByDisplayValue('Existing')).toBeInTheDocument();
    expect(screen.getByText('Something failed')).toBeInTheDocument();
    // While submitting the button reads "Saving…" and Cancel is disabled.
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(cancel).toBeDisabled();
    fireEvent.click(cancel);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels an editable form and blocks submit when the title is empty', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    renderWithProviders(
      <WebsiteContentForm
        type="NEWSROOM"
        item={null}
        submitting={false}
        errorMessage={null}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('Title is required')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('handles a cleared (null) published date and an invalid image URL', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <WebsiteContentForm
        type="BLOG"
        item={null}
        submitting={false}
        errorMessage={null}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    // Clearing the picker/image pushes null → the `field.value ?? ''` fallbacks run.
    dtf.onChange(null);
    img.onChange(null);
    // An invalid link surfaces the image field's error/helperText branch on submit.
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Ok' } });
    fireEvent.change(screen.getByLabelText('Image'), { target: { value: 'ftp://bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText(/valid URL/i)).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
