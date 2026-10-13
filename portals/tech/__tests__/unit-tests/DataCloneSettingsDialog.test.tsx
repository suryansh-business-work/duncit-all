import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import {
  DATA_CLONE_SETTINGS,
  SAVE_DATA_CLONE_CONNECTION,
  TEST_DATA_CLONE_CONNECTION,
} from '../../src/pages/data-clone/queries';
import { DataCloneSettingsDialog } from '../../src/pages/data-clone/settings';
import { dataCloneConnectionSchema } from '../../src/pages/data-clone/settings/data-clone-connection.types';

type Conn = Record<string, unknown>;

const conn = (over: Conn = {}): Conn => ({
  __typename: 'DataCloneConnection',
  role: 'PRODUCTION',
  uriMasked: 'mongodb+srv://***@prod',
  hasUri: true,
  database: 'duncit-prod',
  connected: true,
  collectionCount: 4,
  lastTestedAt: '2026-01-01T00:00:00.000Z',
  lastTestError: null,
  ...over,
});

const stagingConn = (over: Conn = {}): Conn =>
  conn({
    role: 'STAGING',
    uriMasked: '',
    hasUri: false,
    database: '',
    connected: false,
    collectionCount: 0,
    lastTestedAt: null,
    ...over,
  });

const settings = (production: Conn = conn(), staging: Conn = stagingConn()) => ({
  __typename: 'DataCloneSettings',
  production,
  staging,
});

const settingsMock = (data = settings()): MockedResponse => ({
  request: { query: DATA_CLONE_SETTINGS },
  result: { data: { dataCloneSettings: data } },
});

const renderDialog = (mocks: MockedResponse[], onClose = vi.fn()) => {
  renderWithProviders(<DataCloneSettingsDialog open onClose={onClose} />, { mocks });
  return onClose;
};

const uriFields = () => screen.getAllByLabelText(/^Connection string/, { selector: 'input' });
const dbFields = () => screen.getAllByLabelText(/^Database name/);

describe('DataCloneSettingsDialog', () => {
  it('shows each end with its status, last check and masked saved string', async () => {
    renderDialog([settingsMock()]);
    expect(await screen.findByText('Production — the database that is read')).toBeInTheDocument();
    expect(screen.getByText('Staging — the database that is replaced')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Not connected')).toBeInTheDocument();
    expect(screen.getByText(/4 collections found/)).toBeInTheDocument();
    expect(screen.getByText('Saved: mongodb+srv://***@prod. Leave blank to keep it.')).toBeInTheDocument();
    // The saved credentials are only ever shown masked and the field starts empty.
    expect(uriFields()[0]).toHaveValue('');
    expect(dbFields()[0]).toHaveValue('duncit-prod');
    // Only the end that already has a string can be re-tested.
    expect(screen.getAllByText('Check again')).toHaveLength(1);
  });

  it('says never checked when a database is named but was not tested, and shows the last error', async () => {
    renderDialog([
      settingsMock(
        settings(
          conn({ lastTestedAt: null, lastTestError: 'auth failed', connected: false }),
          stagingConn(),
        ),
      ),
    ]);
    expect(await screen.findByText('Not checked yet.')).toBeInTheDocument();
    expect(screen.getByText('auth failed')).toBeInTheDocument();
  });

  it('shows a load failure inside the dialog', async () => {
    renderDialog([
      { request: { query: DATA_CLONE_SETTINGS }, error: new Error('settings unavailable') },
    ]);
    expect(await screen.findByText('settings unavailable')).toBeInTheDocument();
  });

  it('refuses an empty staging form with both required messages', async () => {
    renderDialog([settingsMock()]);
    await screen.findByText('Not connected');
    const stagingForm = uriFields()[1].closest('form') as HTMLFormElement;
    fireEvent.submit(stagingForm);
    expect(await screen.findByText('Paste the connection string for this database.')).toBeInTheDocument();
    expect(screen.getByText('Name the database this connection points at.')).toBeInTheDocument();
  });

  it('refuses a string that is not a mongodb URI', async () => {
    renderDialog([settingsMock()]);
    await screen.findByText('Not connected');
    fireEvent.change(uriFields()[1], { target: { value: 'postgres://x' } });
    fireEvent.change(dbFields()[1], { target: { value: 'duncit-staging' } });
    fireEvent.submit(uriFields()[1].closest('form') as HTMLFormElement);
    expect(
      await screen.findByText('A connection string starts with mongodb:// or mongodb+srv://.'),
    ).toBeInTheDocument();
  });

  it('saves and connects staging, then reflects the connected state from the cache write', async () => {
    const saved = settings(
      conn(),
      stagingConn({
        hasUri: true,
        uriMasked: 'mongodb+srv://***@stg',
        database: 'duncit-staging',
        connected: true,
        collectionCount: 9,
        lastTestedAt: '2026-02-02T00:00:00.000Z',
      }),
    );
    const save: MockedResponse = {
      request: {
        query: SAVE_DATA_CLONE_CONNECTION,
        variables: {
          role: 'STAGING',
          input: { uri: 'mongodb+srv://u:p@stg.example.test/db', database: 'duncit-staging' },
        },
      },
      result: { data: { saveDataCloneConnection: saved } },
    };
    renderDialog([settingsMock(), save]);
    await screen.findByText('Not connected');

    fireEvent.change(uriFields()[1], { target: { value: ' mongodb+srv://u:p@stg.example.test/db ' } });
    fireEvent.change(dbFields()[1], { target: { value: 'duncit-staging' } });
    fireEvent.submit(uriFields()[1].closest('form') as HTMLFormElement);

    await waitFor(() => expect(screen.queryByText('Not connected')).not.toBeInTheDocument());
    expect(screen.getAllByText('Connected')).toHaveLength(2);
    expect(screen.getByText(/9 collections found/)).toBeInTheDocument();
    // The typed string is cleared once the server round trip has completed.
    await waitFor(() => expect(uriFields()[1]).toHaveValue(''));
  });

  it('lets production keep its saved string while only the database name changes', async () => {
    const save: MockedResponse = {
      request: {
        query: SAVE_DATA_CLONE_CONNECTION,
        variables: { role: 'PRODUCTION', input: { uri: '', database: 'duncit-prod-2' } },
      },
      result: { data: { saveDataCloneConnection: settings(conn({ database: 'duncit-prod-2' })) } },
    };
    renderDialog([settingsMock(), save]);
    await screen.findByText('Connected');
    fireEvent.change(dbFields()[0], { target: { value: 'duncit-prod-2' } });
    fireEvent.submit(uriFields()[0].closest('form') as HTMLFormElement);
    await waitFor(() => expect(dbFields()[0]).toHaveValue('duncit-prod-2'));
    expect(screen.queryByText('Paste the connection string for this database.')).not.toBeInTheDocument();
  });

  it('re-tests a saved connection without changing it', async () => {
    const test: MockedResponse = {
      request: { query: TEST_DATA_CLONE_CONNECTION, variables: { role: 'PRODUCTION' } },
      result: {
        data: {
          testDataCloneConnection: settings(conn({ collectionCount: 11, lastTestedAt: '2026-03-03T00:00:00.000Z' })),
        },
      },
    };
    renderDialog([settingsMock(), test]);
    await screen.findByText('Connected');
    fireEvent.click(screen.getByText('Check again'));
    expect(await screen.findByText(/11 collections found/)).toBeInTheDocument();
  });

  it('shows the error when a save is rejected and lets it be dismissed', async () => {
    const save: MockedResponse = {
      request: {
        query: SAVE_DATA_CLONE_CONNECTION,
        variables: { role: 'STAGING', input: { uri: 'mongodb://h/db', database: 'same' } },
      },
      error: new Error('staging and production must differ'),
    };
    renderDialog([settingsMock(), save]);
    await screen.findByText('Not connected');
    fireEvent.change(uriFields()[1], { target: { value: 'mongodb://h/db' } });
    fireEvent.change(dbFields()[1], { target: { value: 'same' } });
    fireEvent.submit(uriFields()[1].closest('form') as HTMLFormElement);
    const msg = await screen.findByText('staging and production must differ');
    // the typed value is left in place so a typo can be corrected
    expect(uriFields()[1]).toHaveValue('mongodb://h/db');
    fireEvent.click(within(msg.closest('[role="alert"]') as HTMLElement).getByRole('button'));
    await waitFor(() =>
      expect(screen.queryByText('staging and production must differ')).not.toBeInTheDocument(),
    );
  });

  it('leaves the saved state alone when the server returns no settings', async () => {
    const save: MockedResponse = {
      request: {
        query: SAVE_DATA_CLONE_CONNECTION,
        variables: { role: 'STAGING', input: { uri: 'mongodb://h/db', database: 'stg' } },
      },
      result: { data: { saveDataCloneConnection: null } },
    };
    renderDialog([settingsMock(), save]);
    await screen.findByText('Not connected');
    fireEvent.change(uriFields()[1], { target: { value: 'mongodb://h/db' } });
    fireEvent.change(dbFields()[1], { target: { value: 'stg' } });
    fireEvent.submit(uriFields()[1].closest('form') as HTMLFormElement);
    await waitFor(() => expect(screen.getByText('Connected')).toBeInTheDocument());
    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });

  it('toggles the connection string between hidden and visible', async () => {
    renderDialog([settingsMock()]);
    await screen.findByText('Not connected');
    expect(uriFields()[1]).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show connection string' }));
    expect(uriFields()[1]).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Hide connection string' }));
    expect(uriFields()[1]).toHaveAttribute('type', 'password');
  });

  it('closes from the footer', async () => {
    const onClose = renderDialog([settingsMock()]);
    await screen.findByText('Connected');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('dataCloneConnectionSchema', () => {
  const messages = { uriRequired: 'URI?', uriFormat: 'FORMAT?', databaseRequired: 'DB?' };

  it('accepts both mongodb schemes and trims whitespace', () => {
    const schema = dataCloneConnectionSchema(false, messages);
    expect(schema.parse({ uri: '  mongodb://h/db ', database: ' x ' })).toEqual({
      uri: 'mongodb://h/db',
      database: 'x',
    });
    expect(schema.safeParse({ uri: 'mongodb+srv://h/db', database: 'x' }).success).toBe(true);
  });

  it('requires a string only when none is saved', () => {
    const empty = { uri: '   ', database: 'x' };
    const fresh = dataCloneConnectionSchema(false, messages).safeParse(empty);
    expect(fresh.success).toBe(false);
    expect(fresh.error?.issues[0].message).toBe('URI?');
    expect(dataCloneConnectionSchema(true, messages).safeParse(empty).success).toBe(true);
  });

  it('rejects other schemes, whitespace inside and a blank database', () => {
    const schema = dataCloneConnectionSchema(true, messages);
    expect(schema.safeParse({ uri: 'http://h', database: 'x' }).error?.issues[0].message).toBe('FORMAT?');
    expect(schema.safeParse({ uri: 'mongodb://h /db', database: 'x' }).success).toBe(false);
    expect(schema.safeParse({ uri: '', database: '  ' }).error?.issues[0].message).toBe('DB?');
  });
});
