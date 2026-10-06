import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PortalAppSettingsTable from '../PortalAppSettingsTable';
import type { PortalAppRow } from '../queries';

vi.mock('@duncit/table', async (importOriginal) => {
  const stub = await import('../../../__tests__/table-mock');
  return {
    ...(await importOriginal<typeof import('@duncit/table')>()),
    DuncitTable: stub.DuncitTable,
  };
});

const row = (over: Partial<PortalAppRow>): PortalAppRow => ({
  key: 'finance',
  name: 'Finance',
  kind: 'PORTAL',
  url: 'https://finance.duncit.com/',
  chat_enabled: true,
  apps_enabled: false,
  ...over,
});

const FINANCE = row({});
const WEBSITE = row({ key: 'website', name: 'Website', kind: 'WEBSITE', url: null });
const APP = row({ key: 'mobile', name: 'Mobile App', kind: 'APP', url: undefined });

function renderTable(rows: PortalAppRow[], busyKey: string | null = null) {
  const onToggle = vi.fn();
  const fetchRows = vi.fn(async () => ({ rows, total: rows.length }));
  render(
    <PortalAppSettingsTable
      fetchRows={fetchRows}
      refetchRef={{ current: null }}
      busyKey={busyKey}
      onToggle={onToggle}
    />
  );
  return { onToggle, fetchRows };
}

const rowOf = (name: string) =>
  screen
    .getAllByTestId('table-row')
    .find((el) => within(el).queryAllByText(name).length > 0) as HTMLElement;

describe('PortalAppSettingsTable', () => {
  it('labels the columns and the empty state from the translations', async () => {
    renderTable([]);
    expect(screen.getByTestId('col-name')).toHaveTextContent('Portal');
    expect(screen.getByTestId('col-url')).toHaveTextContent('Link');
    expect(screen.getByTestId('col-chat_enabled')).toHaveTextContent('Chat with a coworker');
    expect(screen.getByTestId('col-apps_enabled')).toHaveTextContent('App');
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No portals registered.');
    expect(screen.getByTestId('duncit-table')).toHaveAttribute(
      'data-search-placeholder',
      'Search by name or key'
    );
  });

  it('shows a portal with its kind, a trimmed external link and On/Off feature values', async () => {
    renderTable([FINANCE]);
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(1));
    const finance = rowOf('Finance');

    expect(within(finance).getByText('finance')).toBeInTheDocument();
    expect(within(finance).getByText('Portal')).toBeInTheDocument();
    expect(within(finance).getByTestId('value-name')).toHaveTextContent('Finance');
    expect(within(finance).getByTestId('value-url')).toHaveTextContent('https://finance.duncit.com/');

    const link = within(finance).getByRole('link');
    expect(link).toHaveAttribute('href', 'https://finance.duncit.com/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('finance.duncit.com');
    expect(link.textContent).not.toContain('https://');

    expect(within(finance).getByTestId('value-chat_enabled')).toHaveTextContent('On');
    expect(within(finance).getByTestId('value-apps_enabled')).toHaveTextContent('Off');
  });

  it('shows a dash for a row with no link, and says a non-console has no header', async () => {
    renderTable([WEBSITE, APP]);
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));

    for (const [name, kindLabel] of [
      ['Website', 'Website'],
      ['Mobile App', 'App'],
    ] as const) {
      const el = rowOf(name);
      expect(within(el).getAllByText(kindLabel).length).toBeGreaterThan(0);
      expect(within(el).queryByRole('link')).toBeNull();
      expect(within(el).getByTestId('cell-url')).toHaveTextContent('—');
      expect(within(el).getByTestId('value-url')).toHaveTextContent('');
      expect(within(el).getByTestId('value-chat_enabled')).toHaveTextContent('No console header');
      expect(within(el).getByTestId('value-apps_enabled')).toHaveTextContent('No console header');
      expect(within(el).queryByRole('switch')).toBeNull();
    }
  });

  it('hands a switch flip to onToggle and locks the switches of the busy portal', async () => {
    const { onToggle } = renderTable([FINANCE, row({ key: 'crm', name: 'CRM' })], 'finance');
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));

    expect(screen.getByRole('switch', { name: 'Chat with a coworker — Finance' })).toBeDisabled();
    const crmApps = screen.getByRole('switch', { name: 'App — CRM' });
    expect(crmApps).toBeEnabled();
    expect(crmApps).not.toBeChecked();

    fireEvent.click(crmApps);
    expect(onToggle).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'crm' }),
      'apps_enabled',
      true
    );
  });
});
