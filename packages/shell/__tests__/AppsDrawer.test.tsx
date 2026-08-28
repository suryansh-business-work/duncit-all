import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import FolderIcon from '@mui/icons-material/Folder';
import { AppsDrawer } from '../src/chrome/AppsDrawer';

/**
 * The file manager is deliberately NOT mounted until it is opened: it uses
 * Apollo, and the header this drawer lives in renders in every portal — some of
 * them before an ApolloProvider exists above it.
 */
describe('AppsDrawer', () => {
  it('lists the platform tools and searches them by keyword', () => {
    render(<AppsDrawer open onClose={vi.fn()} />);
    expect(screen.getByText('File Manager')).toBeInTheDocument();

    // "assets" is nowhere in the name or description — only in its keywords.
    fireEvent.change(screen.getByPlaceholderText('Search apps'), { target: { value: 'assets' } });
    expect(screen.getByText('File Manager')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search apps'), { target: { value: 'payroll' } });
    expect(screen.queryByText('File Manager')).not.toBeInTheDocument();
    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument();
  });

  it("shows a portal own tools beside the platform ones", () => {
    render(
      <AppsDrawer
        open
        onClose={vi.fn()}
        extraTools={[
          { key: 'x', name: 'Rota', description: 'Who is on shift', icon: <FolderIcon /> },
        ]}
      />
    );
    expect(screen.getByText('Rota')).toBeInTheDocument();
    expect(screen.getByText('File Manager')).toBeInTheDocument();
  });

  it('drops the staff-chat tool when this console does not have chat', () => {
    render(<AppsDrawer open onClose={vi.fn()} chatEnabled={false} />);
    expect(screen.queryByText('Chat with a coworker')).not.toBeInTheDocument();
    expect(screen.getByText('File Manager')).toBeInTheDocument();
  });

  it('hands staff-chat up to the layout instead of opening it itself', () => {
    const onOpenChat = vi.fn();
    const onClose = vi.fn();
    render(<AppsDrawer open onClose={onClose} onOpenChat={onOpenChat} />);

    fireEvent.click(screen.getByText('Chat with a coworker'));

    expect(onOpenChat).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes and clears the search from its own close button', () => {
    const onClose = vi.fn();
    render(<AppsDrawer open onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText('Search apps'), { target: { value: 'payroll' } });

    fireEvent.click(screen.getByLabelText('Close apps'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText('Search apps')).toHaveValue('');
  });

  it('opens Jump to Portal over the page from its own tool, and closes it back to no dialog at all', async () => {
    render(
      <MockedProvider mocks={[]}>
        <AppsDrawer open onClose={vi.fn()} />
      </MockedProvider>,
    );

    fireEvent.click(screen.getByText('Jump to Portal'));
    // One "Jump to Portal" for the drawer's own list row, a second for the
    // dialog's title — the AppsDrawer itself is a modal Drawer too (also
    // `role="dialog"`) and stays open beneath, so counting text beats querying
    // by role here.
    expect(screen.getAllByText('Jump to Portal')).toHaveLength(2);

    fireEvent.click(screen.getByLabelText('Close'));
    await waitFor(() => expect(screen.getAllByText('Jump to Portal')).toHaveLength(1));
  });

  it('opens Ask Bot over the page from its own tool, and closes it back to no dialog at all', async () => {
    render(
      <MockedProvider mocks={[]}>
        <AppsDrawer open onClose={vi.fn()} />
      </MockedProvider>,
    );

    fireEvent.click(screen.getByText('Ask Bot'));
    expect(screen.getAllByText('Ask Bot')).toHaveLength(2);

    fireEvent.click(screen.getByLabelText('Close'));
    await waitFor(() => expect(screen.getAllByText('Ask Bot')).toHaveLength(1));
  });

  it('mounts the file manager only once a tool is chosen, and unmounts it again on close', async () => {
    const onClose = vi.fn();
    render(
      <MockedProvider mocks={[]}>
        <AppsDrawer open onClose={onClose} />
      </MockedProvider>
    );
    // Nothing Apollo-shaped has rendered yet — which is the point, since this
    // drawer lives in every portal's header.
    expect(screen.queryByText('File Manager. Upload')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('File Manager'));
    expect(onClose).toHaveBeenCalled();
    const close = screen.getByRole('button', { name: 'Close file manager' });
    expect(close).toBeInTheDocument();

    fireEvent.click(close);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Close file manager' })).not.toBeInTheDocument());
  });
});

describe('FileManagerDialog placement', () => {
  it('opens a file inside the dialog, not in a drawer over it', async () => {
    render(
      <MockedProvider mocks={[]}>
        <AppsDrawer open onClose={vi.fn()} />
      </MockedProvider>
    );
    fireEvent.click(screen.getByText('File Manager'));

    // The browser's own controls are what the dialog shows first...
    expect(screen.getByPlaceholderText('Search by file name')).toBeInTheDocument();
    // ...and there is exactly one surface: no second Close beside the dialog's.
    expect(screen.getAllByRole('button', { name: /close/i })).toHaveLength(1);
  });
});
