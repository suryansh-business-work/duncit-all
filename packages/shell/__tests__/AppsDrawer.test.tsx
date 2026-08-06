import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('mounts the file manager only once a tool is chosen', () => {
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
    expect(screen.getByRole('button', { name: 'Close file manager' })).toBeInTheDocument();
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
