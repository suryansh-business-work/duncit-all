import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ReasonDialog, buildReasonSchema, REASON_MAX } from '../reason-form';
import { RosterForm, buildRosterSchema } from '../roster-form';
import { CreateChallengeForm, buildCreateChallengeSchema } from '../create-challenge-form';
import { fallbackT } from '../../../i18n/fallback';

vi.mock('@duncit/user-core', async (orig) => {
  let n = 0;
  return { ...(await orig<object>()), makeDeviceId: () => `device-id-${String(++n).padStart(4, '0')}` };
});

beforeEach(() => vi.clearAllMocks());

describe('ReasonDialog', () => {
  const dialog = (over: Partial<Parameters<typeof ReasonDialog>[0]> = {}) => {
    const props = { open: true, title: 'Remove score', message: 'Are you sure?', confirmLabel: 'Remove', required: false, saving: false, onSubmit: vi.fn(), onClose: vi.fn(), ...over };
    render(<ReasonDialog {...props} />);
    return props;
  };

  it('submits an optional reason trimmed, or none at all', async () => {
    const props = dialog();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledWith({ reason: '' }));
    fireEvent.change(screen.getByLabelText(fallbackT('mweb.challenge.fields.reason')), { target: { value: '  mis-tap  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(props.onSubmit).toHaveBeenLastCalledWith({ reason: 'mis-tap' }));
  });

  it('requires a reason of at least three characters when it is a correction', async () => {
    const props = dialog({ required: true });
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(await screen.findByText(fallbackT('mweb.challenge.errors.reason'))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(new RegExp(fallbackT('mweb.challenge.fields.reason'))), { target: { value: 'ab' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.getByText(fallbackT('mweb.challenge.errors.reason'))).toBeInTheDocument());
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('rejects an over-long reason, optional or required', async () => {
    const props = dialog();
    fireEvent.change(screen.getByLabelText(fallbackT('mweb.challenge.fields.reason')), { target: { value: 'x'.repeat(REASON_MAX + 1) } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(await screen.findByText(fallbackT('mweb.challenge.errors.reasonLong'))).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('clears the text and closes on cancel, and disables both buttons while saving', () => {
    const props = dialog();
    fireEvent.change(screen.getByLabelText(fallbackT('mweb.challenge.fields.reason')), { target: { value: 'draft' } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.cancel') }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(fallbackT('mweb.challenge.fields.reason'))).toHaveValue('');
  });

  it('disables the buttons while saving', () => {
    dialog({ saving: true });
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.cancel') })).toBeDisabled();
  });

  it('builds a schema whose required rule is the only difference', () => {
    const t = (key: string) => key;
    expect(buildReasonSchema(t, false).safeParse({ reason: '' }).success).toBe(true);
    expect(buildReasonSchema(t, true).safeParse({ reason: '' }).success).toBe(false);
    expect(buildReasonSchema(t, true).safeParse({ reason: 'abc' }).success).toBe(true);
    expect(buildReasonSchema(t, true).safeParse({ reason: ' ab ' }).success).toBe(false);
  });
});

describe('CreateChallengeForm', () => {
  const templates = [
    { id: 't1', name: 'Quiz' },
    { id: 't2', name: 'Race' },
  ];
  const form = (over: Partial<Parameters<typeof CreateChallengeForm>[0]> = {}) => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<CreateChallengeForm templates={templates} defaultTemplateId="t2" saving={false} onSubmit={onSubmit} {...over} />);
    return onSubmit;
  };

  it('starts on the default template, submits it with the typed name and keeps the template for the next one', async () => {
    const onSubmit = form();
    expect(screen.getByRole('combobox')).toHaveTextContent('Race');
    fireEvent.change(screen.getByLabelText(fallbackT('mweb.challenge.fields.challengeName')), { target: { value: '  Final  ' } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.addChallenge') }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ template_id: 't2', name: 'Final' }));
    await waitFor(() => expect(screen.getByLabelText(fallbackT('mweb.challenge.fields.challengeName'))).toHaveValue(''));
    expect(screen.getByRole('combobox')).toHaveTextContent('Race');
  });

  it('falls back to the first template when the default is not offered, or there is none', () => {
    form({ defaultTemplateId: 'gone' });
    expect(screen.getByRole('combobox')).toHaveTextContent('Quiz');
  });

  it('falls back to the first template when no default is set', () => {
    form({ defaultTemplateId: null });
    expect(screen.getByRole('combobox')).toHaveTextContent('Quiz');
  });

  it('lets the host pick another template', async () => {
    const onSubmit = form();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'Quiz' }));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.addChallenge') }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ template_id: 't1', name: '' }));
  });

  it('keeps what was typed when the server refused it', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    form({ onSubmit });
    fireEvent.change(screen.getByLabelText(fallbackT('mweb.challenge.fields.challengeName')), { target: { value: 'Mine' } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.addChallenge') }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(screen.getByLabelText(fallbackT('mweb.challenge.fields.challengeName'))).toHaveValue('Mine');
  });

  it('refuses an over-long name and a missing template', async () => {
    const onSubmit = form({ templates: [], defaultTemplateId: null });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.addChallenge') }));
    expect(await screen.findByText(fallbackT('mweb.challenge.errors.template'))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a name over the limit', async () => {
    const onSubmit = form();
    fireEvent.change(screen.getByLabelText(fallbackT('mweb.challenge.fields.challengeName')), { target: { value: 'n'.repeat(81) } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.addChallenge') }));
    expect(await screen.findByText(fallbackT('mweb.challenge.errors.challengeName'))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the name hint normally, and disables the form while saving', () => {
    form({ saving: true });
    expect(screen.getByText(fallbackT('mweb.challenge.nameHint'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.addChallenge') })).toBeDisabled();
  });

  it('builds a schema needing a template and capping the name', () => {
    const schema = buildCreateChallengeSchema((key) => key);
    expect(schema.safeParse({ template_id: 't1', name: '' }).success).toBe(true);
    expect(schema.safeParse({ template_id: '', name: '' }).success).toBe(false);
    expect(schema.safeParse({ template_id: 't1', name: 'n'.repeat(81) }).success).toBe(false);
  });
});

describe('RosterForm', () => {
  const attendees = [
    { user_id: 'u1', name: 'Asha Rao' },
    { user_id: 'u2', name: 'Bela Shah' },
  ];
  const values = {
    competitors: [{ competitor_id: 'c1', name: 'Asha', user_id: '' }],
    players: [] as { player_id: string; name: string; user_id: string; team_id: string }[],
    judge_user_ids: [] as string[],
  };
  const form = (over: Partial<Parameters<typeof RosterForm>[0]> = {}) => {
    const props = { values, teamMode: false, attendees, saving: false, onSubmit: vi.fn(), onCancel: vi.fn(), ...over };
    render(<RosterForm {...props} />);
    return props;
  };
  const save = () => screen.getByRole('button', { name: fallbackT('mweb.challenge.saveRoster') });

  it('starts clean: save is disabled until something changes, and cancel closes', () => {
    const props = form();
    expect(save()).toBeDisabled();
    expect(screen.getByRole('heading', { name: fallbackT('mweb.challenge.competitors') })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: fallbackT('mweb.challenge.players') })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.cancel') }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('adds a competitor with a fresh id, renames and links an attendee, and saves', async () => {
    const props = form();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.addCompetitor') }));
    const names = screen.getAllByLabelText(fallbackT('mweb.challenge.fields.name'));
    expect(names).toHaveLength(2);
    fireEvent.change(names[1], { target: { value: 'Bela' } });
    const links = screen.getAllByRole('combobox', { name: fallbackT('mweb.challenge.fields.attendee') });
    fireEvent.mouseDown(links[1]);
    fireEvent.click(await screen.findByRole('option', { name: 'Bela Shah' }));
    expect(save()).toBeEnabled();
    fireEvent.click(save());
    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1));
    const submitted = (props.onSubmit as unknown as { mock: { calls: any[][] } }).mock.calls[0][0];
    expect(submitted.competitors).toHaveLength(2);
    expect(submitted.competitors[1]).toEqual({ competitor_id: expect.stringMatching(/^[\w-]{8}$/), name: 'Bela', user_id: 'u2' });
  });

  it('removes a row, and refuses a roster with no competitors', async () => {
    const props = form();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.remove', { vars: { name: 'Asha' } }) }));
    fireEvent.click(save());
    expect(await screen.findByText(fallbackT('mweb.challenge.errors.noCompetitors'))).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a blank competitor name', async () => {
    const props = form();
    fireEvent.change(screen.getByLabelText(fallbackT('mweb.challenge.fields.name')), { target: { value: '' } });
    fireEvent.click(save());
    expect(await screen.findByText(fallbackT('mweb.challenge.errors.name'))).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('assigns judges from the attendees', async () => {
    const props = form();
    fireEvent.mouseDown(screen.getByLabelText(fallbackT('mweb.challenge.judges')));
    fireEvent.click(await screen.findByRole('option', { name: 'Asha Rao' }));
    fireEvent.click(save());
    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1));
    expect((props.onSubmit as unknown as { mock: { calls: any[][] } }).mock.calls[0][0].judge_user_ids).toEqual(['u1']);
  });

  it('shows teams and players in team mode, adding a player to a team, and requiring a team', async () => {
    const props = form({ teamMode: true });
    expect(screen.getByRole('heading', { name: fallbackT('mweb.challenge.teams') })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: fallbackT('mweb.challenge.players') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.addPlayer') }));
    const nameFields = screen.getAllByLabelText(fallbackT('mweb.challenge.fields.name'));
    fireEvent.change(nameFields[1], { target: { value: 'Player One' } });
    fireEvent.click(save());
    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1));
    expect((props.onSubmit as unknown as { mock: { calls: any[][] } }).mock.calls[0][0].players[0]).toEqual({ player_id: expect.any(String), name: 'Player One', user_id: '', team_id: 'c1' });
  });

  it('cannot add a player while there are no teams to join', () => {
    form({ teamMode: true, values: { ...values, competitors: [] } });
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.addPlayer') })).toBeDisabled();
  });

  it('lets a player switch team, and lists unlinked as an option', async () => {
    const withPlayer = {
      competitors: [{ competitor_id: 'c1', name: 'Red', user_id: '' }, { competitor_id: 'c2', name: 'Blue', user_id: '' }],
      players: [{ player_id: 'p1', name: 'Pat', user_id: '', team_id: 'c1' }],
      judge_user_ids: [],
    };
    const props = form({ teamMode: true, values: withPlayer });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: fallbackT('mweb.challenge.fields.team') }));
    fireEvent.click(await screen.findByRole('option', { name: 'Blue' }));
    fireEvent.mouseDown(screen.getAllByRole('combobox', { name: fallbackT('mweb.challenge.fields.attendee') })[2]);
    expect(await screen.findByRole('option', { name: fallbackT('mweb.challenge.notLinked') })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    fireEvent.click(save());
    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1));
    expect((props.onSubmit as unknown as { mock: { calls: any[][] } }).mock.calls[0][0].players[0].team_id).toBe('c2');
  });

  it('refuses a player without a team', async () => {
    const props = form({
      teamMode: true,
      values: { competitors: [{ competitor_id: 'c1', name: 'Red', user_id: '' }], players: [{ player_id: 'p1', name: 'Pat', user_id: '', team_id: '' }], judge_user_ids: [] },
    });
    fireEvent.change(screen.getAllByLabelText(fallbackT('mweb.challenge.fields.name'))[0], { target: { value: 'Red team' } });
    fireEvent.click(save());
    expect(await screen.findByText(fallbackT('mweb.challenge.errors.team'))).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('disables editing while saving', () => {
    form({ saving: true });
    expect(screen.getByLabelText(fallbackT('mweb.challenge.fields.name'))).toBeDisabled();
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.addCompetitor') })).toBeDisabled();
    expect(within(document.body).getByRole('button', { name: fallbackT('mweb.challenge.cancel') })).toBeDisabled();
  });

  it('builds a schema with the roster rules', () => {
    const schema = buildRosterSchema((key) => key);
    const ok = { competitors: [{ competitor_id: 'c', name: 'A', user_id: '' }], players: [], judge_user_ids: [] };
    expect(schema.safeParse(ok).success).toBe(true);
    expect(schema.safeParse({ ...ok, competitors: [] }).success).toBe(false);
    expect(schema.safeParse({ ...ok, competitors: [{ competitor_id: 'c', name: 'n'.repeat(61), user_id: '' }] }).success).toBe(false);
  });
});
