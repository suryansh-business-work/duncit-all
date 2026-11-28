import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import HrOverview from '../../../src/pages/dashboard/HrOverview';
import { renderWithProviders } from '../../testkit';
import { statsMock, unrecordedMock } from '../../mocks';

describe('HrOverview', () => {
  it('shows the head counts and the department split, naming the unassigned group', async () => {
    renderWithProviders(<HrOverview />, { mocks: [statsMock(), unrecordedMock()] });
    expect(await screen.findByTestId('hr-overview')).toBeInTheDocument();
    expect(screen.getByText('Active employees')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Joined this month')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('No department')).toBeInTheDocument();
    expect(screen.queryByText(/have Employee access but no HR record/)).not.toBeInTheDocument();
  });

  it('warns when accounts have Employee access but no HR record', async () => {
    renderWithProviders(<HrOverview />, {
      mocks: [statsMock(), unrecordedMock([{ id: 'u9', name: 'Legacy', email: null, photo: null }])],
    });
    expect(await screen.findByText('1 accounts have Employee access but no HR record.')).toBeInTheDocument();
  });

  it('says so when the counts cannot be loaded', async () => {
    renderWithProviders(<HrOverview />, { mocks: [unrecordedMock()] });
    expect(await screen.findByText('Head counts could not be loaded.')).toBeInTheDocument();
  });
});
