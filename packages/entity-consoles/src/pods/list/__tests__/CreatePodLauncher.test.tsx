import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import { renderWithProviders } from '../../../../__tests__/testkit';
import CreatePodLauncher from '../CreatePodLauncher';

const flags = vi.hoisted(() => ({ autoPods: false }));

vi.mock('@duncit/app-settings', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useFeatureFlag: (key: string) => key === 'auto_pods' && flags.autoPods,
  };
});

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="pathname">{location.pathname}</span>;
}

const renderLauncher = (onNormal: () => void) =>
  renderWithProviders(<></>, {
    initialEntries: ['/pods'],
    routes: (
      <>
        <Route
          path="/pods"
          element={
            <>
              <CreatePodLauncher onNormal={onNormal} />
              <LocationProbe />
            </>
          }
        />
        <Route path="/auto-pods/new" element={<LocationProbe />} />
      </>
    ),
  });

beforeEach(() => {
  flags.autoPods = false;
});

describe('CreatePodLauncher / auto pods off', () => {
  it('opens the ordinary editor straight away without asking which kind', () => {
    const onNormal = vi.fn();
    renderLauncher(onNormal);
    fireEvent.click(screen.getByRole('button', { name: 'New Pod' }));
    expect(onNormal).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('What kind of pod?')).not.toBeInTheDocument();
  });
});

describe('CreatePodLauncher / auto pods on', () => {
  beforeEach(() => {
    flags.autoPods = true;
  });

  it('asks which kind of pod before opening anything', async () => {
    const onNormal = vi.fn();
    renderLauncher(onNormal);
    fireEvent.click(screen.getByRole('button', { name: 'New Pod' }));
    expect(await screen.findByText('What kind of pod?')).toBeInTheDocument();
    expect(onNormal).not.toHaveBeenCalled();
  });

  it('opens the ordinary editor when Normal Pod is picked', async () => {
    const onNormal = vi.fn();
    renderLauncher(onNormal);
    fireEvent.click(screen.getByRole('button', { name: 'New Pod' }));
    fireEvent.click(await screen.findByRole('button', { name: /Normal Pod/ }));
    expect(onNormal).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText('What kind of pod?')).not.toBeInTheDocument());
    expect(screen.getByTestId('pathname')).toHaveTextContent('/pods');
  });

  it("takes the admin to the Auto Pod editor when Auto Pod is picked", async () => {
    const onNormal = vi.fn();
    renderLauncher(onNormal);
    fireEvent.click(screen.getByRole('button', { name: 'New Pod' }));
    fireEvent.click(await screen.findByRole('button', { name: /Auto Pod/ }));
    await waitFor(() => expect(screen.getByTestId('pathname')).toHaveTextContent('/auto-pods/new'));
    expect(onNormal).not.toHaveBeenCalled();
  });

  it('closes the question without opening anything when dismissed', async () => {
    const onNormal = vi.fn();
    renderLauncher(onNormal);
    fireEvent.click(screen.getByRole('button', { name: 'New Pod' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('What kind of pod?')).not.toBeInTheDocument());
    expect(onNormal).not.toHaveBeenCalled();
    expect(screen.getByTestId('pathname')).toHaveTextContent('/pods');
  });
});
