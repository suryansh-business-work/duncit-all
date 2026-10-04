import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { alpha, createTheme } from '@mui/material/styles';
import LocationsTable from '../LocationsTable';
import type { LocationRow } from '../queries';

/**
 * The portal-wide grid stub ignores `getRowStyle`; this one paints each row
 * with it, the way AG Grid does, so the launch tint is observable.
 */
vi.mock('@duncit/table', async (importOriginal) => {
  const { useEffect, useState } = await import('react');
  interface StubProps {
    fetchRows: (q: unknown) => Promise<{ rows: LocationRow[] }>;
    getRowId: (row: LocationRow) => string;
    getRowStyle: (row: LocationRow) => Record<string, string>;
  }
  function DuncitTable({ fetchRows, getRowId, getRowStyle }: Readonly<StubProps>) {
    const [rows, setRows] = useState<LocationRow[]>([]);
    useEffect(() => {
      fetchRows({}).then((res) => setRows(res.rows));
    }, [fetchRows]);
    return (
      <div>
        {rows.map((row) => (
          <div key={getRowId(row)} data-testid={`row-${getRowId(row)}`} style={getRowStyle(row)}>
            {row.city}
          </div>
        ))}
      </div>
    );
  }
  return { ...(await importOriginal<typeof import('@duncit/table')>()), DuncitTable };
});

const city = (id: string, name: string, isLaunched: boolean): LocationRow => ({
  id,
  location_name: name,
  country: 'India',
  country_code: 'IN',
  state: 'Karnataka',
  state_code: 'KA',
  city: name,
  location_image: '',
  location_zones: [],
  is_active: true,
  is_launched: isLaunched,
  launch_target: 2000,
  whatsapp_group_url: '',
  launch_media: {} as LocationRow['launch_media'],
});

describe('LocationsTable — row tint', () => {
  it('tints a launched city green and a waitlisted one amber', async () => {
    const fetchRows = vi.fn(async () => ({
      rows: [city('loc-blr', 'Bengaluru', true), city('loc-ngp', 'Nagpur', false)],
      total: 2,
    }));
    render(
      <LocationsTable fetchRows={fetchRows} refetchRef={{ current: null }} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    const { palette } = createTheme();
    await waitFor(() => expect(screen.getByTestId('row-loc-blr')).toHaveTextContent('Bengaluru'));
    expect(screen.getByTestId('row-loc-blr')).toHaveStyle({ backgroundColor: alpha(palette.success.main, 0.14) });
    expect(screen.getByTestId('row-loc-ngp')).toHaveStyle({ backgroundColor: alpha(palette.warning.main, 0.14) });
    expect(alpha(palette.success.main, 0.14)).not.toBe(alpha(palette.warning.main, 0.14));
  });
});
