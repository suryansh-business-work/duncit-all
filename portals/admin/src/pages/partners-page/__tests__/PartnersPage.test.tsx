import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { Route, useParams } from 'react-router';
import { formatDate } from '@duncit/app-settings';
import { renderWithProviders } from '../../../__tests__/testkit';
import PartnersPage, { PARTNERS_TABLE } from '../PartnersPage';

/**
 * Grid stub with a fetch that round-trips through the suite's MockedProvider,
 * plus an "open" button per fetched row standing in for the real grid's row click.
 */
vi.mock('@duncit/table', async (importOriginal) => {
  const { useState } = await import('react');
  const stub = await import('../../location-subscriptions/__tests__/table-mock');
  type GridProps = Parameters<typeof stub.DuncitTable>[0];
  interface Row {
    user_id: string;
  }
  function DuncitTable(props: Readonly<GridProps & { onRowClick: (row: Row) => void }>) {
    const [fetched, setFetched] = useState<Row[]>([]);
    const fetchRows: GridProps['fetchRows'] = async (query) => {
      const result = await props.fetchRows(query);
      setFetched(result.rows as Row[]);
      return result;
    };
    return (
      <>
        <stub.DuncitTable {...props} fetchRows={fetchRows} />
        {fetched.map((row) => (
          <button key={row.user_id} type="button" onClick={() => props.onRowClick(row)}>
            {`open ${row.user_id}`}
          </button>
        ))}
      </>
    );
  }
  return {
    ...(await importOriginal<typeof import('@duncit/table')>()),
    DuncitTable,
    useApolloTableFetch: stub.useApolloTableFetch,
  };
});

const partner = (over: Record<string, unknown>) => ({
  __typename: 'PartnerRow',
  user_id: 'u-host',
  full_name: 'Meera Host',
  email: 'meera@duncit.com',
  phone_number: '+919800000001',
  roles: ['HOST', 'VENUE_OWNER', 'USER'],
  created_at: '2026-03-15T08:00:00.000Z',
  ...over,
});

/** A partner with nothing on the profile but the account id. */
const BARE = partner({
  user_id: 'u-bare',
  full_name: null,
  email: null,
  phone_number: null,
  roles: null,
  created_at: null,
});
/** No email, so the phone is the contact line. */
const PHONE_ONLY = partner({
  user_id: 'u-phone',
  full_name: 'Ravi Seller',
  email: '',
  phone_number: '+919800000002',
  roles: ['ECOMM_MANAGER', 'CLUB_ADMIN'],
});

const tableMock = (rows: unknown[]): MockedResponse => ({
  request: { query: PARTNERS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { partnersTable: { __typename: 'PartnersTablePage', total: rows.length, rows } } },
});

function UserDetailsProbe() {
  const { id } = useParams();
  return <p>{`user details page for ${id}`}</p>;
}

const rows = () => screen.getAllByTestId('table-row');

describe('PartnersPage — the table', () => {
  it('names each partner, their contact line, their partner types and when they joined', async () => {
    renderWithProviders(<PartnersPage />, { mocks: [tableMock([partner({}), PHONE_ONLY, BARE])] });
    await waitFor(() => expect(rows()).toHaveLength(3));
    const [host, seller, bare] = rows();

    expect(within(host).getByTestId('value-full_name')).toHaveTextContent('Meera Host');
    expect(within(host).getByText('meera@duncit.com')).toBeInTheDocument();
    // Only partner roles become chips; a plain USER role is not a partner type.
    expect(within(host).getByTestId('value-role')).toHaveTextContent('Host, Venue Partner');
    expect(within(host).getByText('Host')).toBeInTheDocument();
    expect(within(host).getByText('Venue Partner')).toBeInTheDocument();
    expect(within(host).queryByText('USER')).toBeNull();
    expect(within(host).getByTestId('value-phone_number')).toHaveTextContent('+919800000001');
    expect(within(host).getByTestId('value-created_at')).toHaveTextContent(formatDate('2026-03-15T08:00:00.000Z'));

    expect(within(seller).getByTestId('value-role')).toHaveTextContent('Product Seller, Club Admin');
    // The contact line falls back to the phone, which the phone column also shows.
    expect(within(seller).getAllByText('+919800000002')).toHaveLength(2);

    expect(within(bare).getByTestId('value-full_name')).toHaveTextContent('—');
    expect(within(bare).getByTestId('value-role')).toBeEmptyDOMElement();
    expect(within(bare).getByTestId('value-phone_number')).toHaveTextContent('—');
    expect(within(bare).getByTestId('value-created_at')).toHaveTextContent('—');
    // Name value, rendered name and contact line all dash.
    expect(within(within(bare).getByTestId('cell-full_name')).getAllByText('—')).toHaveLength(3);
  });

  it('says there are no partners when the list is empty', async () => {
    renderWithProviders(<PartnersPage />, { mocks: [tableMock([])] });
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No partners yet.');
    expect(screen.queryAllByTestId('table-row')).toHaveLength(0);
  });

  it('opens the clicked partner on the common user-details page', async () => {
    renderWithProviders(<PartnersPage />, {
      mocks: [tableMock([partner({}), PHONE_ONLY])],
      initialEntries: ['/partners'],
      routes: (
        <>
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/users/:id" element={<UserDetailsProbe />} />
        </>
      ),
    });
    fireEvent.click(await screen.findByRole('button', { name: 'open u-phone' }));
    expect(await screen.findByText('user details page for u-phone')).toBeInTheDocument();
  });
});
