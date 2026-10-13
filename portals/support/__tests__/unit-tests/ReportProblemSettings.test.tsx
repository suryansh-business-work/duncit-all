import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import ReportProblemSettingsPage from '../../src/pages/reported-problems/ReportProblemSettingsPage';
import { renderWithProviders } from '../testkit';
import {
  makeProblemCategory,
  makeProblemConfig,
  makeProblemSlack,
  makeSlackChannel,
  problemConfigErrorMock,
  problemConfigMock,
  problemSlackErrorMock,
  problemSlackMock,
  updateProblemConfigMock,
  updateProblemSlackMock,
} from '../mocks';

/**
 * Everything Support decides about Report a Problem: what the app asks the
 * reporter, and which Slack channel hears about each report. Slack is only a
 * notification: the report is saved either way.
 */
const renderPage = (mocks: MockedResponse[] = []) =>
  renderWithProviders(<ReportProblemSettingsPage />, {
    mocks: [problemConfigMock(), problemSlackMock(), ...mocks],
  });

const nameInputs = () => screen.queryAllByTestId('problem-settings-category-name') as HTMLInputElement[];
const loaded = () => waitFor(() => expect(nameInputs()).toHaveLength(2));
const saveButtons = () => screen.getAllByRole('button', { name: 'Save' });
/** The first Save belongs to the form-fields card, the second to Slack routing. */
const saveForm = () => saveButtons()[0];
const saveSlack = () => saveButtons()[1];

describe('ReportProblemSettingsPage — the form the app shows', () => {
  it('seeds the categories, the prompt and the screenshot rules from the saved config', async () => {
    renderPage();
    await loaded();

    expect(screen.getByText('Configure Report a Problem')).toBeInTheDocument();
    expect(nameInputs().map((input) => input.value)).toEqual(['Payments', 'Bugs']);
    expect(screen.getByText('PAYMENTS')).toBeInTheDocument();
    expect(screen.getByLabelText('Question')).toHaveValue('What went wrong?');
    expect(screen.getByLabelText('Helper text')).toHaveValue('Tell us what you were doing.');
    expect(screen.getByLabelText('Minimum characters')).toHaveValue(10);
    expect(screen.getByLabelText('Max screenshots')).toHaveValue(5);
    const shown = screen.getAllByRole('switch', { name: 'Shown' });
    expect(shown[0]).toBeChecked();
    expect(shown[1]).not.toBeChecked();
  });

  it('saves renamed, switched and added categories in order, leaving new ones to get a server key', async () => {
    renderPage([
      updateProblemConfigMock((variables) => {
        const input = variables.input as Record<string, unknown>;
        return (
          JSON.stringify(input.categories) ===
            JSON.stringify([
              { key: 'PAYMENTS', label: 'Payments and refunds', is_active: true, sort_order: 0 },
              { key: 'BUGS', label: 'Bugs', is_active: true, sort_order: 1 },
              { label: 'Safety', is_active: true, sort_order: 2 },
            ]) &&
          input.message_label === 'What went wrong?' &&
          input.message_min_length === 10 &&
          input.allow_media === true &&
          input.max_media === 5
        );
      }),
    ]);
    await loaded();

    fireEvent.change(nameInputs()[0], { target: { value: 'Payments and refunds' } });
    fireEvent.click(screen.getAllByRole('switch', { name: 'Shown' })[1]);
    fireEvent.change(screen.getByLabelText('New category'), { target: { value: '  Safety  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByLabelText('New category')).toHaveValue('');
    expect(nameInputs()).toHaveLength(3);

    fireEvent.click(saveForm());
    expect(await screen.findByText('Saved — the app picks this up on its next open.')).toBeInTheDocument();
  });

  it('adds a category with the Enter key and ignores a blank one', async () => {
    renderPage();
    await loaded();
    const draft = screen.getByLabelText('New category');
    const add = screen.getByRole('button', { name: 'Add' });
    expect(add).toBeDisabled();

    fireEvent.change(draft, { target: { value: '   ' } });
    fireEvent.keyDown(draft, { key: 'Enter' });
    expect(nameInputs()).toHaveLength(2);

    fireEvent.change(draft, { target: { value: 'Delivery' } });
    fireEvent.keyDown(draft, { key: 'a' });
    expect(nameInputs()).toHaveLength(2);
    fireEvent.keyDown(draft, { key: 'Enter' });
    expect(nameInputs()).toHaveLength(3);
    expect(nameInputs()[2].value).toBe('Delivery');
  });

  it('removes a category, and will not save with none left', async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Remove category: Payments' }));
    expect(nameInputs().map((input) => input.value)).toEqual(['Bugs']);
    fireEvent.click(screen.getByRole('button', { name: 'Remove category: Bugs' }));

    expect(nameInputs()).toHaveLength(0);
    expect(saveForm()).toBeDisabled();
  });

  it('keeps screenshots off the limit field when they are switched off, and coerces blanks to 1', async () => {
    renderPage([
      updateProblemConfigMock((variables) => {
        const input = variables.input as Record<string, unknown>;
        return (
          input.allow_media === false &&
          input.message_min_length === 1 &&
          input.max_media === 5 &&
          input.message_label === 'What happened?' &&
          input.message_hint === 'Describe the steps.'
        );
      }),
    ]);
    await loaded();
    fireEvent.change(screen.getByLabelText('Minimum characters'), { target: { value: '' } });
    expect(screen.getByLabelText('Minimum characters')).toHaveValue(1);

    fireEvent.change(screen.getByLabelText('Max screenshots'), { target: { value: '' } });
    expect(screen.getByLabelText('Max screenshots')).toHaveValue(1);
    fireEvent.change(screen.getByLabelText('Max screenshots'), { target: { value: '5' } });

    fireEvent.click(screen.getByRole('switch', { name: 'Let reporters attach screenshots' }));
    expect(screen.getByLabelText('Max screenshots')).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'What happened?' } });
    fireEvent.change(screen.getByLabelText('Helper text'), { target: { value: 'Describe the steps.' } });
    fireEvent.click(saveForm());
    expect(await screen.findByText('Saved — the app picks this up on its next open.')).toBeInTheDocument();
  });

  it("shows the server's reason when the save is refused and does not claim success", async () => {
    renderPage([updateProblemConfigMock(() => true, 'Category labels must be unique')]);
    await loaded();
    fireEvent.click(saveForm());

    expect(await screen.findByText('Category labels must be unique')).toBeInTheDocument();
    expect(screen.queryByText('Saved — the app picks this up on its next open.')).not.toBeInTheDocument();
  });

  it('closes the saved notice from its own button', async () => {
    renderPage([updateProblemConfigMock()]);
    await loaded();
    fireEvent.click(saveForm());
    const notice = await screen.findByText('Saved — the app picks this up on its next open.');
    fireEvent.click(within(notice.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: /close/i }));

    await waitFor(() =>
      expect(screen.queryByText('Saved — the app picks this up on its next open.')).not.toBeInTheDocument(),
    );
  });

  it('dismisses the saved notice when the agent clicks elsewhere', async () => {
    renderPage([updateProblemConfigMock()]);
    await loaded();
    fireEvent.click(saveForm());
    await screen.findByText('Saved — the app picks this up on its next open.');
    fireEvent.click(document.body);

    await waitFor(() =>
      expect(screen.queryByText('Saved — the app picks this up on its next open.')).not.toBeInTheDocument(),
    );
  });

  it("shows the server's reason when the config cannot be read", async () => {
    renderWithProviders(<ReportProblemSettingsPage />, {
      mocks: [problemConfigErrorMock('Config service is down'), problemSlackMock()],
    });
    expect(await screen.findByText('Config service is down')).toBeInTheDocument();
  });

  it('opens with no categories while the config has not arrived and a saved one has none', async () => {
    renderPage();
    expect(screen.queryAllByTestId('problem-settings-category-name')).toHaveLength(0);
    expect(saveForm()).toBeDisabled();
    await loaded();
    expect(saveForm()).toBeEnabled();
  });

  it('seeds a config whose categories are all hidden', async () => {
    renderWithProviders(<ReportProblemSettingsPage />, {
      mocks: [
        problemConfigMock(
          makeProblemConfig({
            categories: [makeProblemCategory({ is_active: false })],
          }),
        ),
        problemSlackMock(),
      ],
    });
    await waitFor(() => expect(nameInputs()).toHaveLength(1));
    expect(screen.getByRole('switch', { name: 'Shown' })).not.toBeChecked();
  });
});

describe('ReportProblemSettingsPage — where it is announced', () => {
  const channelField = () => screen.getByRole('combobox', { name: 'Channel' });
  const slackLoaded = () =>
    waitFor(() => expect(channelField()).toHaveTextContent('#support-alerts'));

  it('shows the saved channel and lists the others, marking private ones', async () => {
    renderPage();
    await slackLoaded();

    fireEvent.mouseDown(channelField());
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByRole('option', { name: 'Use the default channel from Tech settings' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: '#support-alerts' })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: /#leadership/ })).toHaveTextContent('Private');
  });

  it('saves the chosen channel with its name and the enabled switch', async () => {
    renderPage([
      updateProblemSlackMock((variables) => {
        const input = variables.input as Record<string, unknown>;
        return input.enabled === true && input.channel_id === 'C0002' && input.channel_name === 'leadership';
      }),
    ]);
    await slackLoaded();
    fireEvent.mouseDown(channelField());
    fireEvent.click(await screen.findByRole('option', { name: /#leadership/ }));
    fireEvent.click(saveSlack());

    expect(await screen.findByText('Saved — new reports go to this channel from now on.')).toBeInTheDocument();
  });

  it('falls back to the default channel with an empty name', async () => {
    renderPage([
      updateProblemSlackMock((variables) => {
        const input = variables.input as Record<string, unknown>;
        return input.channel_id === '' && input.channel_name === '';
      }),
    ]);
    await slackLoaded();
    fireEvent.mouseDown(channelField());
    fireEvent.click(await screen.findByRole('option', { name: 'Use the default channel from Tech settings' }));
    fireEvent.click(saveSlack());

    expect(await screen.findByText('Saved — new reports go to this channel from now on.')).toBeInTheDocument();
  });

  it('disables the channel picker while announcing is switched off', async () => {
    renderPage();
    await slackLoaded();
    fireEvent.click(screen.getByRole('switch', { name: 'Announce new reports on Slack' }));

    expect(channelField()).toHaveAttribute('aria-disabled', 'true');
  });

  it('keeps a saved channel the bot can no longer see, at the top of the list', async () => {
    renderWithProviders(<ReportProblemSettingsPage />, {
      mocks: [
        problemConfigMock(),
        problemSlackMock(
          makeProblemSlack({ channel_id: 'C0999', channel_name: 'old-alerts', channels: [makeSlackChannel()] }),
        ),
      ],
    });
    await waitFor(() => expect(channelField()).toHaveTextContent('#old-alerts'));
  });

  it('names a saved channel by its id when no name was stored', async () => {
    renderWithProviders(<ReportProblemSettingsPage />, {
      mocks: [
        problemConfigMock(),
        problemSlackMock(makeProblemSlack({ channel_id: 'C0999', channel_name: '', channels: [] })),
      ],
    });
    await waitFor(() => expect(channelField()).toHaveTextContent('#C0999'));
  });

  it('warns when Slack is not connected or cannot be reached', async () => {
    renderWithProviders(<ReportProblemSettingsPage />, {
      mocks: [
        problemConfigMock(),
        problemSlackMock(
          makeProblemSlack({ slack_configured: false, error: 'invalid_auth', channels: [], channel_id: '' }),
        ),
      ],
    });
    expect(
      await screen.findByText(/No Slack bot token is configured\. Connect Slack in the Tech portal/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Slack could not be reached, so the channel list is empty\. invalid_auth/)).toBeInTheDocument();
  });

  it('warns when the bot is not a member of the chosen channel', async () => {
    renderWithProviders(<ReportProblemSettingsPage />, {
      mocks: [
        problemConfigMock(),
        problemSlackMock(
          makeProblemSlack({
            channel_id: 'C0003',
            channel_name: 'ops',
            channels: [makeSlackChannel({ id: 'C0003', name: 'ops', is_member: false })],
          }),
        ),
      ],
    });
    expect(await screen.findByText(/The bot is not in this channel yet/)).toBeInTheDocument();
  });

  it("shows the server's reason when the routing save is refused", async () => {
    renderPage([updateProblemSlackMock(() => true, 'Slack workspace is not linked')]);
    await slackLoaded();
    fireEvent.click(saveSlack());

    expect(await screen.findByText('Slack workspace is not linked')).toBeInTheDocument();
    expect(screen.queryByText('Saved — new reports go to this channel from now on.')).not.toBeInTheDocument();
  });

  it('dismisses the saved notice when the agent clicks elsewhere', async () => {
    renderPage([updateProblemSlackMock()]);
    await slackLoaded();
    fireEvent.click(saveSlack());
    await screen.findByText('Saved — new reports go to this channel from now on.');
    fireEvent.click(document.body);

    await waitFor(() =>
      expect(
        screen.queryByText('Saved — new reports go to this channel from now on.'),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows the server's reason when the routing cannot be read", async () => {
    renderWithProviders(<ReportProblemSettingsPage />, {
      mocks: [problemConfigMock(), problemSlackErrorMock('Slack settings are unavailable')],
    });
    expect(await screen.findByText('Slack settings are unavailable')).toBeInTheDocument();
  });

  it('closes the saved notice from its own button', async () => {
    renderPage([updateProblemSlackMock()]);
    await slackLoaded();
    fireEvent.click(saveSlack());
    const notice = await screen.findByText('Saved — new reports go to this channel from now on.');
    fireEvent.click(within(notice.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: /close/i }));

    await waitFor(() =>
      expect(
        screen.queryByText('Saved — new reports go to this channel from now on.'),
      ).not.toBeInTheDocument(),
    );
  });
});
