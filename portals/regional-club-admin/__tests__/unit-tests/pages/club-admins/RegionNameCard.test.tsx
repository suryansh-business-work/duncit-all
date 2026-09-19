import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import RegionNameCard from '../../../../src/pages/club-admins/RegionNameCard';
import { RENAME_MY_REGION, type Region } from '../../../../src/pages/queries';
import { renderWithProviders } from '../../../testkit';
import { makeRegion } from '../../../mocks/region';

const RENAMED = 'Bengaluru South & East';

const renameMock = (delay = 0): MockedResponse => ({
  request: { query: RENAME_MY_REGION, variables: { region_name: RENAMED } },
  delay,
  result: { data: { renameMyRegion: makeRegion({ region_name: RENAMED }) } },
});

const renameRefused: MockedResponse = {
  request: { query: RENAME_MY_REGION, variables: { region_name: RENAMED } },
  result: { errors: [new GraphQLError('Region name is already taken.')] },
};

const renderCard = (props: { region?: Region; loading?: boolean }, mocks: MockedResponse[] = []) => {
  const onRenamed = vi.fn();
  const view = renderWithProviders(
    <RegionNameCard region={props.region} loading={props.loading ?? false} onRenamed={onRenamed} />,
    { mocks },
  );
  return { ...view, onRenamed };
};

const nameField = () => screen.getByRole('textbox', { name: 'Region name' });
const saveButton = () => screen.getByRole('button', { name: 'shell.common.save' });

describe('RegionNameCard', () => {
  it('holds its own shape until the region arrives', () => {
    renderCard({ loading: true });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the region’s name, permanent number and member count', () => {
    renderCard({ region: makeRegion() });
    expect(nameField()).toHaveValue('Bengaluru South');
    expect(screen.getByText('RGN-000042')).toBeInTheDocument();
    expect(screen.getByText('2 Club Admin(s)')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('only offers Save for a real, non-blank change', () => {
    renderCard({ region: makeRegion() });
    fireEvent.change(nameField(), { target: { value: '  Bengaluru South  ' } });
    expect(saveButton()).toBeDisabled();
    fireEvent.change(nameField(), { target: { value: '   ' } });
    expect(saveButton()).toBeDisabled();
    fireEvent.change(nameField(), { target: { value: RENAMED } });
    expect(saveButton()).toBeEnabled();
  });

  it('saves the trimmed name and tells the page to re-read the region', async () => {
    const { onRenamed } = renderCard({ region: makeRegion() }, [renameMock(20)]);
    fireEvent.change(nameField(), { target: { value: `  ${RENAMED} ` } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('shell.common.saving')).toBeInTheDocument();
    await waitFor(() => expect(onRenamed).toHaveBeenCalledTimes(1));
    expect(nameField()).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps the typed name and says why when the server refuses it', async () => {
    const { onRenamed } = renderCard({ region: makeRegion() }, [renameRefused]);
    fireEvent.change(nameField(), { target: { value: RENAMED } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('Region name is already taken.')).toBeInTheDocument();
    expect(nameField()).toHaveAttribute('aria-invalid', 'true');
    expect(nameField()).toHaveValue(RENAMED);
    expect(onRenamed).not.toHaveBeenCalled();
  });

  it('still renders, with nothing to save, when the region could not be read', () => {
    renderCard({ region: undefined, loading: false });
    expect(nameField()).toHaveValue('');
    expect(screen.getByText('0 Club Admin(s)')).toBeInTheDocument();
    expect(screen.queryByText('RGN-000042')).not.toBeInTheDocument();
    fireEvent.change(nameField(), { target: { value: RENAMED } });
    expect(saveButton()).toBeDisabled();
  });

  it('follows the region when a refetch brings a new name', () => {
    const { rerender, onRenamed } = renderCard({ region: makeRegion() });
    rerender(<RegionNameCard region={makeRegion({ region_name: RENAMED })} loading={false} onRenamed={onRenamed} />);
    expect(nameField()).toHaveValue(RENAMED);
  });
});
