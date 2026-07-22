import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import SupportForm from '../SupportForm';

function renderForm(props: Partial<React.ComponentProps<typeof SupportForm>>) {
  const onSubmit = props.onSubmit ?? vi.fn();
  const utils = render(
    <MockedProvider mocks={[]}>
      <SupportForm onSubmit={onSubmit} {...props} />
    </MockedProvider>,
  );
  return { onSubmit, ...utils };
}

const fieldByLabel = (label: string) =>
  screen.getByLabelText(new RegExp(label, 'i')) as HTMLInputElement;

async function fillValid() {
  fireEvent.change(fieldByLabel('^Name'), { target: { value: 'Jane Doe' } });
  fireEvent.change(fieldByLabel('^Email'), { target: { value: 'jane@example.com' } });
  fireEvent.change(fieldByLabel('Subject'), { target: { value: 'Login broken' } });
  fireEvent.change(fieldByLabel("what's going on"), {
    target: { value: 'I cannot log in to my account anymore.' },
  });
}

describe('SupportForm — rendering', () => {
  it('renders all fields and the submit button', () => {
    renderForm({});
    expect(screen.getByLabelText(/^Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/what's going on/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send to support/i })).toBeInTheDocument();
  });

  it('marks Name and Email read-only', () => {
    renderForm({ initialValues: { name: 'A', email: 'a@b.com' } });
    expect(fieldByLabel('^Name')).toHaveAttribute('readonly');
    expect(fieldByLabel('^Email')).toHaveAttribute('readonly');
  });

  it('shows the attached-pod chip when pod_title is provided', () => {
    renderForm({ initialValues: { pod_title: 'Sunday Football' } });
    expect(screen.getByText(/About pod: Sunday Football/i)).toBeInTheDocument();
  });

  it('does not show the pod chip when no pod is attached', () => {
    renderForm({});
    expect(screen.queryByText(/About pod:/i)).not.toBeInTheDocument();
  });
});

describe('SupportForm — loading & error states', () => {
  it('disables the button and shows "Sending…" while loading', () => {
    renderForm({ loading: true });
    const btn = screen.getByRole('button', { name: /sending/i });
    expect(btn).toBeDisabled();
  });

  it('renders the errorMessage prop in an alert', () => {
    renderForm({ errorMessage: 'Server exploded' });
    expect(screen.getByRole('alert')).toHaveTextContent('Server exploded');
  });
});

describe('SupportForm — syncing async initialValues', () => {
  it('updates read-only fields when initialValues resolve after mount', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <MockedProvider mocks={[]}>
        <SupportForm initialValues={{}} onSubmit={onSubmit} />
      </MockedProvider>,
    );
    expect(fieldByLabel('^Name')).toHaveValue('');
    rerender(
      <MockedProvider mocks={[]}>
        <SupportForm
          initialValues={{ name: 'Late Name', email: 'late@x.com', pod_id: 'p1', pod_title: 'Late Pod' }}
          onSubmit={onSubmit}
        />
      </MockedProvider>,
    );
    expect(fieldByLabel('^Name')).toHaveValue('Late Name');
    expect(fieldByLabel('^Email')).toHaveValue('late@x.com');
    expect(screen.getByText(/About pod: Late Pod/i)).toBeInTheDocument();
  });
});

describe('SupportForm — submission', () => {
  it('calls onSubmit with valid values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });
    await fillValid();
    fireEvent.click(screen.getByRole('button', { name: /send to support/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Jane Doe',
      email: 'jane@example.com',
      subject: 'Login broken',
      message: 'I cannot log in to my account anymore.',
      category: 'QUESTION',
    });
  });

  it('does not call onSubmit when the form is invalid', async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    fireEvent.click(screen.getByRole('button', { name: /send to support/i }));
    await waitFor(() => expect(screen.getByText(/Name is required/i)).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a status alert when onSubmit throws', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network down'));
    renderForm({ onSubmit });
    await fillValid();
    fireEvent.click(screen.getByRole('button', { name: /send to support/i }));
    expect(await screen.findByText('Network down')).toBeInTheDocument();
  });

  it('changes the category via the select', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });
    await fillValid();
    fireEvent.mouseDown(screen.getByLabelText(/Category/i));
    fireEvent.click(await screen.findByText('Bug / Something is broken'));
    fireEvent.click(screen.getByRole('button', { name: /send to support/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].category).toBe('BUG');
  });
});
