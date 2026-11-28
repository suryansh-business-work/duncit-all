import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../../../__tests__/testkit';
import { audienceListOwnersMock, makeSocialSettings } from '../../../../__tests__/mocks';
import { keywordList, settingsFormValues, settingsInput, socialSettingsSchema, SocialSettingsForm } from '.';

const t = (key: string, options?: { vars?: Record<string, string | number> }) => (options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key);

const messages = (result: ReturnType<ReturnType<typeof socialSettingsSchema>['safeParse']>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' | ');

const valid = () => settingsFormValues(makeSocialSettings());

describe('social settings values', () => {
  it('reads keywords trimmed, upper-cased and once each, and drops blanks', () => {
    expect(keywordList(' stop, Unsubscribe ,stop,, ')).toEqual(['STOP', 'UNSUBSCRIBE']);
    expect(keywordList('')).toEqual([]);
  });

  it('turns the saved settings into the form and back, keywords as one line', () => {
    const settings = makeSocialSettings({ ai_reply_guidelines: 'Warm' });
    const values = settingsFormValues(settings);
    expect(values.opt_out_keywords).toBe('STOP, UNSUBSCRIBE');
    expect(settingsInput({ ...values, ai_reply_guidelines: '  Warm  ', opt_in_keywords: 'start, go' })).toMatchObject({
      opt_out_keywords: ['STOP', 'UNSUBSCRIBE'],
      opt_in_keywords: ['START', 'GO'],
      ai_reply_guidelines: 'Warm',
    });
  });
});

describe('socialSettingsSchema', () => {
  const schema = socialSettingsSchema(t);

  it('takes the defaults', () => {
    expect(schema.safeParse(valid()).success).toBe(true);
  });

  it('refuses numbers outside their bounds or not whole', () => {
    expect(messages(schema.safeParse({ ...valid(), sync_every_hours: 0 }))).toBe('marketing.socialSettings.numberRange:{"min":1,"max":24}');
    expect(messages(schema.safeParse({ ...valid(), backfill_days: 91 }))).toBe('marketing.socialSettings.numberRange:{"min":0,"max":90}');
    expect(messages(schema.safeParse({ ...valid(), expiry_alert_days: 2.5 }))).toBe('marketing.socialSettings.wholeNumber');
    expect(messages(schema.safeParse({ ...valid(), auto_reply_daily_cap: 501 }))).toBe('marketing.socialSettings.numberRange:{"min":0,"max":500}');
  });

  it('refuses too many keywords, one too long, one on both lists, and guidelines too long', () => {
    const many = Array.from({ length: 21 }, (_, i) => `W${i}`).join(',');
    expect(messages(schema.safeParse({ ...valid(), opt_out_keywords: many }))).toBe('marketing.socialSettings.tooManyKeywords:{"max":20}');
    expect(messages(schema.safeParse({ ...valid(), opt_in_keywords: 'x'.repeat(31) }))).toBe('marketing.socialSettings.keywordTooLong:{"max":30}');
    expect(messages(schema.safeParse({ ...valid(), opt_in_keywords: 'stop, start' }))).toBe('marketing.socialSettings.keywordBothLists:{"words":"STOP"}');
    expect(messages(schema.safeParse({ ...valid(), ai_reply_guidelines: 'g'.repeat(2001) }))).toBe('marketing.socialSettings.guidelinesTooLong:{"max":2000}');
  });
});

describe('SocialSettingsForm', () => {
  const renderForm = (over: Partial<Parameters<typeof SocialSettingsForm>[0]> = {}, mocks = [audienceListOwnersMock]) => {
    const onSubmit = vi.fn(async () => undefined);
    renderWithProviders(<SocialSettingsForm settings={makeSocialSettings()} canEdit canPickAssignee onSubmit={onSubmit} {...over} />, { mocks });
    return onSubmit;
  };

  it('states Meta’s fixed rules, and describes every setting', () => {
    renderForm();
    expect(screen.getByTestId('social-settings-meta-rules')).toHaveTextContent('Meta’s own rules are not settings');
    expect(screen.getByText(/How often each account’s posts, comments and DMs are read again/)).toBeInTheDocument();
    expect(screen.getByText(/Each auto-reply waits in Approvals/)).toBeInTheDocument();
    expect(screen.getByTestId('settings-assignee')).toHaveTextContent('Nobody');
    expect(screen.getByTestId('social-settings-save')).toBeDisabled();
  });

  it('saves the changed settings as the server takes them', async () => {
    const onSubmit = renderForm();
    fireEvent.change(screen.getByRole('spinbutton', { name: /Sync every/ }), { target: { value: '6' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Stop keywords' }), { target: { value: 'stop, quit' } });
    fireEvent.click(screen.getByLabelText('Auto-replies on'));
    await waitFor(() => expect(screen.getByTestId('social-settings-save')).toBeEnabled());
    fireEvent.click(screen.getByTestId('social-settings-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ sync_every_hours: 6, opt_out_keywords: ['STOP', 'QUIT'], auto_reply_enabled: true })));
  });

  it('keeps human agent replies off unless switched on, and saves the switch', async () => {
    const onSubmit = renderForm();
    expect(screen.getByTestId('social-settings-meta-rules')).toHaveTextContent('within 24 hours');
    const toggle = screen.getByLabelText('Human agent replies (24 hours to 7 days)');
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByTestId('social-settings-save')).toBeEnabled());
    fireEvent.click(screen.getByTestId('social-settings-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ human_agent_replies: true })));
  });

  it('says what is wrong instead of saving', async () => {
    const onSubmit = renderForm();
    fireEvent.change(screen.getByRole('textbox', { name: 'Start keywords' }), { target: { value: 'stop' } });
    fireEvent.click(screen.getByTestId('social-settings-save'));
    expect(await screen.findByText('STOP cannot be both a stop and a start keyword.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('is read-only for someone who may not change it', () => {
    renderForm({ canEdit: false, settings: makeSocialSettings({ default_assignee_user_id: 'boss', default_assignee_name: 'Ravi Boss' }) });
    expect(screen.getByTestId('social-settings-read-only')).toBeInTheDocument();
    expect(screen.queryByTestId('social-settings-save')).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /Sync every/ })).toBeDisabled();
    expect(screen.getByTestId('settings-assignee')).toHaveTextContent('Ravi Boss');
    expect(screen.queryByTestId('settings-assignee-change')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-assignee-clear')).not.toBeInTheDocument();
  });

  it('picks a new default assignee, shows it is unsaved, and clears it', async () => {
    const onSubmit = renderForm();
    fireEvent.click(screen.getByTestId('settings-assignee-change'));
    const dialog = await screen.findByRole('dialog', { name: 'Who gets new conversations?' });
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Owner' }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Ravi Boss' }));
    fireEvent.click(within(dialog).getByTestId('lead-owner-save'));
    await waitFor(() => expect(screen.getByTestId('settings-assignee')).toHaveTextContent('A new person — saved when you press Save'));
    fireEvent.click(screen.getByTestId('social-settings-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ default_assignee_user_id: 'boss' })));
    fireEvent.click(screen.getByTestId('settings-assignee-clear'));
    expect(screen.getByTestId('settings-assignee')).toHaveTextContent('Nobody');
  });

  it('offers no picker to someone who may not read the people list', () => {
    renderForm({ canPickAssignee: false });
    expect(screen.queryByTestId('settings-assignee-change')).not.toBeInTheDocument();
  });

  it('names a saved assignee whose name is unknown as a new person', () => {
    renderForm({ settings: makeSocialSettings({ default_assignee_user_id: 'ghost', default_assignee_name: null }) });
    expect(screen.getByTestId('settings-assignee')).toHaveTextContent('A new person');
  });
});
