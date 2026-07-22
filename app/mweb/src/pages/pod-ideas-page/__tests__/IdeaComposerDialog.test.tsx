import { describe, expect, it, vi } from 'vitest';
import { MockedProvider } from '@apollo/client/testing';
import { fireEvent, render, screen } from '@testing-library/react';
import IdeaComposerDialog from '../IdeaComposerDialog';
import { EMPTY_CATEGORY_SCOPE, type CategoryScope } from '../CategoryCascade';
import { CATEGORIES, type CategoryOption } from '../../survey-gate/queries';

const supers: CategoryOption[] = [
  {
    id: 's1',
    name: 'Sports',
    level: 'SUPER',
    parent_id: null,
    is_active: true,
    sort_order: 1,
  },
];

const superMock = {
  request: { query: CATEGORIES, variables: { level: 'SUPER', parent_id: null } },
  result: { data: { categories: supers } },
};

type Props = Parameters<typeof IdeaComposerDialog>[0];

const baseProps: Props = {
  open: true,
  title: '',
  setTitle: vi.fn(),
  description: '',
  setDescription: vi.fn(),
  scope: EMPTY_CATEGORY_SCOPE as CategoryScope,
  onCategoryChange: vi.fn(),
  error: null,
  creating: false,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
};

const renderDialog = (over: Partial<Props> = {}) =>
  render(
    <MockedProvider mocks={[superMock]} addTypename={false}>
      <IdeaComposerDialog {...baseProps} {...over} />
    </MockedProvider>,
  );

describe('IdeaComposerDialog', () => {
  it('renders the composer with title, description and category cascade when open', () => {
    renderDialog();
    expect(screen.getByText('Share a pod idea')).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText('Super Category *')).toBeInTheDocument();
    expect(screen.getByText('0 / 160')).toBeInTheDocument();
    expect(screen.getByText(/0 \/ 2001/)).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('Share a pod idea')).not.toBeInTheDocument();
  });

  it('shows the error alert when error is set', () => {
    renderDialog({ error: 'Something went wrong' });
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('caps the title at 160 chars via setTitle', () => {
    const setTitle = vi.fn();
    renderDialog({ setTitle });
    const input = screen.getByLabelText(/Title/);
    fireEvent.change(input, { target: { value: 'a'.repeat(200) } });
    expect(setTitle).toHaveBeenCalledWith('a'.repeat(160));
  });

  it('caps the description at 2001 chars via setDescription', () => {
    const setDescription = vi.fn();
    renderDialog({ setDescription });
    const input = screen.getByLabelText(/Description/);
    fireEvent.change(input, { target: { value: 'b'.repeat(2500) } });
    expect(setDescription).toHaveBeenCalledWith('b'.repeat(2001));
  });

  it('reflects populated values and their counters', () => {
    renderDialog({ title: 'Hello', description: 'World' });
    expect((screen.getByLabelText(/Title/) as HTMLInputElement).value).toBe('Hello');
    expect((screen.getByLabelText(/Description/) as HTMLTextAreaElement).value).toBe('World');
    expect(screen.getByText('5 / 160')).toBeInTheDocument();
    expect(screen.getByText(/5 \/ 2001/)).toBeInTheDocument();
  });

  it('fires onSubmit and onClose from the action buttons', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    renderDialog({ onSubmit, onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons and shows a spinner while creating', () => {
    renderDialog({ creating: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    const submit = screen.getByRole('button', { name: '' });
    expect(submit).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
  });

  it('calls onClose on backdrop dismiss when not creating', () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose on dismiss while creating', () => {
    const onClose = vi.fn();
    renderDialog({ creating: true, onClose });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
