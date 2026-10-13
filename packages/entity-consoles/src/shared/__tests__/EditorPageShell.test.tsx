import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import type { ComponentProps } from 'react';
import EditorPageShell from '../EditorPageShell';

// The real dialog browses ImageKit over the network; the shell only owns the
// bridge — when it is open, which folder, and what it settles with.
vi.mock('@duncit/media-picker', () => ({
  default: ({
    open,
    folder,
    onClose,
    onPicked,
  }: {
    open: boolean;
    folder: string;
    onClose: () => void;
    onPicked: (url: string) => void;
  }) =>
    open ? (
      <div role="dialog" data-folder={folder}>
        <button type="button" onClick={() => onPicked('https://cdn.example.test/new.jpg')}>
          pick
        </button>
        <button type="button" onClick={onClose}>
          dismiss
        </button>
      </div>
    ) : null,
}));

function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>;
}

type Props = ComponentProps<typeof EditorPageShell>;

const baseProps = (over: Partial<Props> = {}): Props => ({
  eyebrow: 'Hosts · Edit',
  title: 'Ananya Iyer',
  backTo: '/hosts/h-1',
  saveLabel: 'Save host',
  busy: false,
  error: null,
  onSubmit: vi.fn(async () => undefined),
  picker: { open: false, folder: '/hosts', pickImage: vi.fn(), settle: vi.fn() },
  children: <input aria-label="Full name" />,
  ...over,
});

const mount = (props: Props) =>
  render(
    <MemoryRouter initialEntries={['/hosts/h-1/edit']}>
      <Routes>
        <Route path="*" element={<EditorPageShell {...props} />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );

describe('EditorPageShell', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('frames the record: eyebrow, title, children, and Save at the head and the foot', () => {
    mount(baseProps());
    expect(screen.getByText('Hosts · Edit')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ananya Iyer' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Full name' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Save host' })).toHaveLength(2);
  });

  it('submits through the form-level handler', async () => {
    const onSubmit = vi.fn(async () => undefined);
    mount(baseProps({ onSubmit }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Save host' })[1]);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('cancels back to the record', () => {
    mount(baseProps());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/hosts/h-1');
  });

  it('shows the save error and disables Cancel while busy', () => {
    mount(baseProps({ busy: true, error: 'Server refused the save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Server refused the save');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('after a failed Save, scrolls to the field left in error rather than the banner', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    mount(baseProps({ children: <input aria-label="Phone" aria-invalid="true" /> }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Save host' })[0]);
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(screen.getByRole('textbox', { name: 'Phone' })).toHaveFocus();
  });

  it('after a Save the server refused, scrolls the error banner into view', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    mount(baseProps({ error: 'Pod limit exceeded' }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Save host' })[0]);
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' }));
  });

  it('settles the upload with the picked URL, and with null when the dialog is dismissed', () => {
    const settle = vi.fn();
    mount(baseProps({ picker: { open: true, folder: '/host-documents', pickImage: vi.fn(), settle } }));

    expect(screen.getByRole('dialog')).toHaveAttribute('data-folder', '/host-documents');
    fireEvent.click(screen.getByRole('button', { name: 'pick' }));
    expect(settle).toHaveBeenLastCalledWith('https://cdn.example.test/new.jpg');

    fireEvent.click(screen.getByRole('button', { name: 'dismiss' }));
    expect(settle).toHaveBeenLastCalledWith(null);
  });
});
