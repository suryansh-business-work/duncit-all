import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { RosterForm } from '../roster.form';
import type { AttendeeOption, RosterValues } from '../roster.types';
import { fallbackT } from '../../../../i18n/fallback';

const attendees: AttendeeOption[] = [
  { user_id: 'u1', name: 'Asha' },
  { user_id: 'u2', name: 'Kabir' },
];

const solo: RosterValues = {
  competitors: [{ competitor_id: 'c1', name: 'Asha', user_id: 'u1' }],
  players: [],
  judge_user_ids: [],
};

function renderForm(values: RosterValues, teamMode = false, saving = false) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();
  render(
    <RosterForm values={values} teamMode={teamMode} attendees={attendees} saving={saving} onSubmit={onSubmit} onCancel={onCancel} />,
  );
  return { onSubmit, onCancel };
}

const nameBoxes = () => screen.getAllByLabelText(fallbackT('mweb.challenge.fields.name'));
const saveButton = () => screen.getByRole('button', { name: fallbackT('mweb.challenge.saveRoster') });

describe('RosterForm', () => {
  it('keeps save shut until the roster is changed, then submits the edit', async () => {
    const { onSubmit } = renderForm(solo);
    expect(saveButton()).toBeDisabled();
    fireEvent.change(nameBoxes()[0]!, { target: { value: '  Asha K  ' } });
    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      competitors: [{ competitor_id: 'c1', name: 'Asha K', user_id: 'u1' }],
      players: [],
      judge_user_ids: [],
    });
  });

  it('adds a competitor row with a fresh id and refuses a blank name', async () => {
    const { onSubmit } = renderForm(solo);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.addCompetitor') }));
    await waitFor(() => expect(nameBoxes()).toHaveLength(2));
    fireEvent.click(saveButton());
    expect(await screen.findByText(fallbackT('mweb.challenge.errors.name'))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(nameBoxes()[1]!, { target: { value: 'Kabir' } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submitted = onSubmit.mock.calls[0]?.[0] as RosterValues;
    expect(submitted.competitors).toHaveLength(2);
    expect(submitted.competitors[1]).toMatchObject({ name: 'Kabir', user_id: '' });
    expect(submitted.competitors[1]?.competitor_id).toBeTruthy();
    expect(submitted.competitors[1]?.competitor_id).not.toBe('c1');
  });

  it('refuses an empty roster with the no-competitors message', async () => {
    const { onSubmit } = renderForm(solo);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.remove', { vars: { name: 'Asha' } }) }));
    await waitFor(() => expect(nameBoxes).toThrow());
    fireEvent.click(saveButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(fallbackT('mweb.challenge.errors.noCompetitors'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows players only in team mode, and offers adding one only once a team exists', async () => {
    renderForm(solo, true);
    expect(screen.getByText(fallbackT('mweb.challenge.players'))).toBeInTheDocument();
    const addPlayer = screen.getByRole('button', { name: fallbackT('mweb.challenge.addPlayer') });
    expect(addPlayer).toBeEnabled();
    fireEvent.click(addPlayer);
    await waitFor(() => expect(nameBoxes()).toHaveLength(2));
  });

  it('does not offer players for a solo challenge, and disables the add button with no team', () => {
    const { unmount } = render(
      <RosterForm values={solo} teamMode={false} attendees={attendees} saving={false} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: fallbackT('mweb.challenge.addPlayer') })).not.toBeInTheDocument();
    unmount();
    render(
      <RosterForm
        values={{ ...solo, competitors: [] }}
        teamMode
        attendees={attendees}
        saving={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.addPlayer') })).toBeDisabled();
  });

  it('links a competitor to an attendee and submits the user id', async () => {
    const { onSubmit } = renderForm({ ...solo, competitors: [{ competitor_id: 'c1', name: 'Asha', user_id: '' }] });
    const select = screen.getAllByRole('combobox')[0]!;
    fireEvent.mouseDown(select);
    fireEvent.click(within(await screen.findByRole('listbox')).getByText('Kabir'));
    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0].competitors[0]).toMatchObject({ user_id: 'u2' });
  });

  it('locks every control while saving, and cancel calls back', () => {
    const { onCancel } = renderForm(solo, false, true);
    expect(nameBoxes()[0]).toBeDisabled();
    expect(saveButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.cancel') })).toBeDisabled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls cancel when the host backs out', () => {
    const { onCancel } = renderForm(solo);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.cancel') }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
