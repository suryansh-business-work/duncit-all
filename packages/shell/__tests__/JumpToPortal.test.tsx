/**
 * Jump to Portal — the directory behind the apps drawer's tool of the same name.
 *
 * The split between what this user can open and what they must ask for comes
 * from the SERVER, which is the same map the login gate enforces. So what is
 * worth pinning down is that the dialog renders the server's answer rather than
 * deciding for itself, and that asking for access re-reads it rather than
 * guessing what the request did.
 */
import { describe, expect, it, vi } from 'vitest';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { JumpToPortalDialog } from '../src/chrome/jump-to-portal/JumpToPortalDialog';
import { PortalLinkRow, PortalRequestRow } from '../src/chrome/jump-to-portal/PortalRows';
import {
  MY_PORTAL_ACCESS,
  REQUEST_PORTAL_ACCESS,
  type PortalAccessEntry,
} from '../src/chrome/jump-to-portal/queries';

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const portal = (over: Partial<PortalAccessEntry> = {}): PortalAccessEntry => ({
  key: 'finance',
  name: 'Finance',
  url: 'https://finance.duncit.com/',
  has_access: true,
  can_request: true,
  request_status: null,
  ...over,
});

const accessMock = (
  portals: readonly PortalAccessEntry[],
  over: Partial<MockedResponse> = {},
): MockedResponse =>
  ({
    request: { query: MY_PORTAL_ACCESS },
    result: {
      data: {
        myPortalAccess: portals.map((p) => ({ __typename: 'PortalAccessEntry', ...p })),
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
    ...over,
  }) as MockedResponse;

/** The locked half is collapsed on open — only the accessible one starts out
 * expanded, so a test that wants a request row has to open it. */
const expandLocked = async () => {
  fireEvent.click(screen.getByText("Portals you don't have access to"));
  await settle();
};

const open = (mocks: readonly MockedResponse[], props: Record<string, unknown> = {}) => {
  const onClose = vi.fn();
  render(
    <MockedProvider mocks={[...mocks]}>
      <JumpToPortalDialog open onClose={onClose} {...props} />
    </MockedProvider>
  );
  return { onClose };
};

describe('JumpToPortalDialog', () => {
  it('asks for nothing at all while it is closed', () => {
    const asked = vi.fn();
    render(
      <MockedProvider
        mocks={[
          {
            request: { query: MY_PORTAL_ACCESS, variables: () => {
              asked();
              return true;
            } },
            result: { data: { myPortalAccess: [] } },
          },
        ]}
      >
        <JumpToPortalDialog open={false} onClose={vi.fn()} />
      </MockedProvider>
    );

    expect(asked).not.toHaveBeenCalled();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('waits on the directory rather than claiming an empty one', () => {
    open([accessMock([portal()])]);

    expect(document.body.querySelector('[role="progressbar"]')).not.toBeNull();
  });

  it('splits the consoles the way the server did, and counts each side', async () => {
    open([
      accessMock([
        portal(),
        portal({ key: 'crm', name: 'CRM', url: 'https://crm.duncit.com/' }),
        portal({ key: 'legal', name: 'Legal', url: 'https://legal.duncit.com/', has_access: false }),
      ]),
    ]);
    await settle();

    expect(screen.getByText('Portals you can access')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('CRM')).toBeInTheDocument();
    // The two counts are what the reader checks the split against.
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('says so rather than showing an empty list when no console is open to these roles', async () => {
    open([accessMock([portal({ has_access: false })])]);
    await settle();

    expect(screen.getByText('No consoles are open to your roles yet.')).toBeInTheDocument();
  });

  it('says so when every console is already open to them', async () => {
    open([accessMock([portal()])]);
    await settle();

    expect(screen.getByText('You can open every portal.')).toBeInTheDocument();
  });

  it('states the reason rather than a blank dialog when the directory could not be read', async () => {
    open([accessMock([], { result: undefined, error: new Error('offline') })]);
    await settle();

    expect(screen.getByText('Could not load the portal list. Please try again.')).toBeInTheDocument();
  });

  // The refetch is what makes the row honest: the request answers with one
  // portal, but the directory is what the login gate reads.
  it('asks an admin for access, then re-reads the directory rather than guessing', async () => {
    const locked = portal({ key: 'legal', name: 'Legal', has_access: false });
    open([
      accessMock([locked], { maxUsageCount: 1 }),
      {
        request: { query: REQUEST_PORTAL_ACCESS, variables: { portal_key: 'legal' } },
        result: {
          data: {
            requestPortalAccess: {
              __typename: 'PortalAccessEntry',
              ...locked,
              request_status: 'PENDING',
            },
          },
        },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
      accessMock([{ ...locked, request_status: 'PENDING' }], {
        maxUsageCount: Number.POSITIVE_INFINITY,
      }),
    ]);
    await settle();

    await expandLocked();
    expect(screen.getByRole('button', { name: 'Request access' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Request access' }));
    await settle();
    await settle();
    await settle();

    expect(screen.getByText('Requested')).toBeInTheDocument();
  });

  it('states the reason when the request could not be sent, and lets the reader dismiss it', async () => {
    const locked = portal({ key: 'legal', name: 'Legal', has_access: false });
    open([
      accessMock([locked]),
      {
        request: { query: REQUEST_PORTAL_ACCESS, variables: { portal_key: 'legal' } },
        error: new Error('You already asked for this one today'),
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();

    await expandLocked();
    fireEvent.click(screen.getByRole('button', { name: 'Request access' }));
    await settle();
    await settle();
    expect(screen.getByText('You already asked for this one today')).toBeInTheDocument();

    // The alert's own dismiss, not the dialog's — MUI names both 'Close'.
    const [dismiss] = screen.getAllByRole('button', { name: 'Close' }).filter((button) =>
      button.closest('[role="alert"]'),
    );
    fireEvent.click(dismiss);
    await settle();

    expect(screen.queryByText('You already asked for this one today')).not.toBeInTheDocument();
  });

  it('closes through the caller', async () => {
    const { onClose } = open([accessMock([portal()])]);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('PortalLinkRow', () => {
  // A console opens in a new tab: the reader is jumping to it, not leaving the
  // one they are working in.
  it('is the link itself, opened in a new tab', () => {
    render(<PortalLinkRow portal={portal()} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://finance.duncit.com/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByText('Finance')).toBeInTheDocument();
  });
});

describe('PortalRequestRow', () => {
  const locked = (over: Partial<PortalAccessEntry> = {}) =>
    portal({ has_access: false, ...over });

  const row = (over: Partial<PortalAccessEntry> = {}, busy = false) => {
    const onRequest = vi.fn();
    render(<PortalRequestRow portal={locked(over)} busy={busy} onRequest={onRequest} />);
    return onRequest;
  };

  it('offers the ask, and reports which console it is for', () => {
    const onRequest = row();

    fireEvent.click(screen.getByRole('button', { name: 'Request access' }));

    expect(onRequest).toHaveBeenCalledWith('finance');
  });

  it('shows the ask already sent, with what happens next', () => {
    row({ request_status: 'PENDING' });

    expect(screen.getByText('Requested')).toBeInTheDocument();
    expect(screen.getByText('Waiting for an admin decision.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  // A declined request is not the end of it — the reader may ask again.
  it('says a previous ask was declined, and still offers another', () => {
    row({ request_status: 'DENIED' });

    expect(screen.getByText('Your last request was declined — you can ask again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request access' })).toBeInTheDocument();
  });

  // Some consoles are handed out personally rather than requested.
  it('says a console cannot be asked for at all', () => {
    row({ can_request: false });

    expect(screen.getByText('Granted personally by a super admin.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the console address until there is something else to say', () => {
    row();

    expect(screen.getByText('https://finance.duncit.com/')).toBeInTheDocument();
  });

  it('locks its own ask while that request is in flight', () => {
    row({}, true);

    expect(screen.getByRole('button', { name: 'Request access' })).toBeDisabled();
  });
});
