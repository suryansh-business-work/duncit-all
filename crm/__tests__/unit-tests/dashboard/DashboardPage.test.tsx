import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DashboardPage from '@/pages/dashboard';

const wrap = () =>
  render(
    <MockedProvider mocks={[]}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DashboardPage />
      </LocalizationProvider>
    </MockedProvider>
  );

describe('DashboardPage', () => {
  it('renders the dashboard header + range filter without crashing on missing mocks', () => {
    wrap();
    expect(screen.getByText(/CRM Dashboard/i)).toBeTruthy();
    expect(screen.getByText(/This month/i)).toBeTruthy();
  });
});
