import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { FragmentForm } from '../../src/pages/cms/fragments-tab/fragment-form';
import type { CmsFragmentRow } from '../../src/pages/cms/queries/fragments';
import { renderWithProviders } from '../testkit';
import { makeCmsFragmentRow } from '../mocks/cms.mock';

const renderForm = (fragment: CmsFragmentRow | null = makeCmsFragmentRow({ name: 'Hero', key: 'hero', category: 'Home', description: 'The first thing people see.' })) => {
  const onSubmit = vi.fn();
  renderWithProviders(<FragmentForm fragment={fragment} submitting={false} errorMessage={null} onSubmit={onSubmit} onCancel={vi.fn()} />);
  return onSubmit;
};

describe('FragmentForm — category and description', () => {
  it('shows the saved category (with its hint) and description', () => {
    renderForm();
    expect(screen.getByLabelText('Category')).toHaveValue('Home');
    expect(screen.getByText(/Groups it in the block list of the editor/)).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toHaveValue('The first thing people see.');
  });

  it('saves the edited category and description, trimmed', async () => {
    const onSubmit = renderForm();
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '  Careers ' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Open roles.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ name: 'Hero', key: 'hero', kind: 'SECTION', category: 'Careers', description: 'Open roles.' });
  });

  it('starts a new component with both blank, and saves them blank', async () => {
    const onSubmit = renderForm(null);
    expect(screen.getByLabelText('Category')).toHaveValue('');
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Footer' } });
    fireEvent.change(screen.getByLabelText(/^Key/), { target: { value: 'footer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ category: '', description: '' });
  });

  it('refuses an over-long category or description with its own message', async () => {
    const onSubmit = renderForm();
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'c'.repeat(61) } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'd'.repeat(501) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Keep the category under 60 characters.')).toBeInTheDocument();
    expect(screen.getByText('Keep the description under 500 characters.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows why the last save failed', () => {
    renderWithProviders(<FragmentForm fragment={null} submitting={false} errorMessage="That key is already used." onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('That key is already used.');
  });
});
