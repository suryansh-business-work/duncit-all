/**
 * The attendee row and the activity rail on the inputs older records turn up
 * with — a booking from before seats were counted, a companion with no country
 * code, a refund state of NONE — plus the shared formatters they lean on.
 */
import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import AttendeeRow from '../src/AttendeeRow';
import PodActivityFeed from '../src/PodActivityFeed';
import { fmtDateTime, money } from '../src/format';
import type { AdminPodAttendeeRow } from '../src/queries';
import { testTheme } from './harness';

const row = (over: Partial<AdminPodAttendeeRow>): AdminPodAttendeeRow => ({
  member_id: 'pm-1',
  seats: 1,
  companions: [],
  user_id: 'u-1',
  full_name: 'Meera N',
  email: 'meera@duncit.com',
  phone: '9000000001',
  profile_photo: null,
  is_host: false,
  status: 'JOINED',
  joined_at: '2026-08-01T10:00:00.000Z',
  backed_out_at: null,
  source: 'APP',
  refund_status: null,
  payment_id: 'pay-1',
  backout_no: null,
  replaced_by_user_id: null,
  replaced_by_name: null,
  participation: null,
  ...over,
});

const mountRow = (booking: AdminPodAttendeeRow) =>
  render(
    <ThemeProvider theme={testTheme}>
      <MemoryRouter initialEntries={['/pods/pod-1']}>
        <Routes>
          <Route
            path="/pods/:id"
            element={
              <table>
                <tbody>
                  <AttendeeRow row={booking} statusText="Joined" colSpan={8} />
                </tbody>
              </table>
            }
          />
          <Route path="/users/:id" element={<div>user-page</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );

describe('AttendeeRow fallbacks', () => {
  it('treats a booking from before seats were counted as one seat', () => {
    mountRow(row({ seats: null as unknown as number, companions: null as unknown as [] }));

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('prints a companion’s country code when one was recorded', () => {
    mountRow(
      row({
        seats: 2,
        companions: [{ name: 'Vikram N', phone_extension: '+91', phone_number: '9000000002' }],
      }),
    );

    expect(screen.getByText('Vikram N · +91 9000000002')).toBeInTheDocument();
  });

  it('dashes a refund state of NONE and a booking with no source', () => {
    mountRow(row({ refund_status: 'NONE', source: null, profile_photo: 'https://cdn.duncit.com/u/meera.jpg' }));

    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('opens the replacement’s profile from the "Spot filled by" line', async () => {
    mountRow(
      row({
        status: 'BACKED_OUT',
        backout_no: 'DUN-BKO-0007',
        replaced_by_user_id: 'u-9',
        replaced_by_name: null,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'a new attendee' }));
    expect(await screen.findByText('user-page')).toBeInTheDocument();
  });
});

describe('PodActivityFeed tones', () => {
  it('draws the rail dot in the disabled colour for an action mapped to default', () => {
    const { container } = render(
      <ThemeProvider theme={testTheme}>
        <PodActivityFeed
          entries={[
            {
              id: 'audit-1',
              action: 'NOTE',
              source: 'ADMIN',
              actor_name: 'Asha Rao',
              note: 'Called the venue',
              ai_risk: 'NONE',
              created_at: '2026-08-01T10:00:00.000Z',
            },
          ]}
          colorMap={{ NOTE: 'default' }}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('NOTE')).toBeInTheDocument();
    expect(container.innerHTML).not.toBe('');
  });
});

describe('format', () => {
  it('dashes a missing date and prints a real one', () => {
    expect(fmtDateTime(null)).toBe('—');
    expect(fmtDateTime(undefined)).toBe('—');
    expect(fmtDateTime('2026-08-30T12:30:00.000Z')).not.toBe('—');
  });

  it('prefixes the symbol and treats a missing amount as zero', () => {
    expect(money('₹', 250)).toBe('₹250');
    expect(money('₹', null)).toBe('₹0');
    expect(money('₹')).toBe('₹0');
  });
});
