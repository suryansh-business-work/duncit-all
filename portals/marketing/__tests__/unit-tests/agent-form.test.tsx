import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { makeAccountDoctor, makeAgent } from '../mocks';

import AgentForm, { MAX_BRIEF, MAX_POSTS_PER_WEEK, agentFormSchema, toFormValues, toUpdateInput } from '../../src/pages/agents-page/agent-form';

const valid = { every: 'WEEK' as const, hour: 9, weekday: 1, brief: ' Monsoon pods ', networks: ['LINKEDIN' as const], posts_per_week: '2' };

const issue = (values: Record<string, unknown>) => {
  const out = agentFormSchema().safeParse(values);
  return out.success ? null : out.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('agentFormSchema', () => {
  it('reads the count as a number and trims the brief', () => {
    expect(agentFormSchema().parse(valid)).toEqual({ every: 'WEEK', hour: 9, weekday: 1, brief: 'Monsoon pods', networks: ['LINKEDIN'], posts_per_week: 2 });
  });

  it('refuses a count that is not a whole number, or outside one to seven, in words', () => {
    expect(issue({ ...valid, posts_per_week: '' })).toEqual(['posts_per_week: Enter a whole number of posts.']);
    expect(issue({ ...valid, posts_per_week: '2.5' })).toEqual(['posts_per_week: Enter a whole number of posts.']);
    expect(issue({ ...valid, posts_per_week: 'two' })).toEqual(['posts_per_week: Enter a whole number of posts.']);
    expect(issue({ ...valid, posts_per_week: '0' })).toEqual(['posts_per_week: At least one post a week.']);
    expect(issue({ ...valid, posts_per_week: '8' })).toEqual([`posts_per_week: At most ${MAX_POSTS_PER_WEEK} posts a week.`]);
  });

  it('refuses a brief that runs on, an unknown network, and a schedule off the clock', () => {
    expect(issue({ ...valid, brief: 'x'.repeat(MAX_BRIEF + 1) })).toEqual([`brief: Keep the brief under ${MAX_BRIEF} characters.`]);
    expect(issue({ ...valid, networks: ['TIKTOK'] })?.[0]).toMatch(/^networks\.0: /);
    expect(issue({ ...valid, hour: 24 })?.[0]).toMatch(/^hour: /);
    expect(issue({ ...valid, weekday: 7 })?.[0]).toMatch(/^weekday: /);
    expect(issue({ ...valid, every: 'MONTH' })?.[0]).toMatch(/^every: /);
  });
});

describe('toFormValues and toUpdateInput', () => {
  it('reads an agent into the fields and writes the fields back as the server takes them', () => {
    const agent = makeAgent({ schedule: { every: 'DAY', hour: 6, weekday: 3 }, params: { brief: 'Pets', networks: ['X'], posts_per_week: 5 } });
    const values = toFormValues(agent);
    expect(values).toEqual({ every: 'DAY', hour: 6, weekday: 3, brief: 'Pets', networks: ['X'], posts_per_week: '5' });
    // A copy, so editing the networks never touches the cached agent.
    expect(values.networks).not.toBe(agent.params.networks);

    const parsed = agentFormSchema().parse(values);
    expect(toUpdateInput(parsed, true)).toEqual({
      schedule: { every: 'DAY', hour: 6, weekday: 3 },
      params: { brief: 'Pets', networks: ['X'], posts_per_week: 5 },
    });
    // An agent that reads no params is sent its schedule alone.
    expect(toUpdateInput(parsed, false)).toEqual({ schedule: { every: 'DAY', hour: 6, weekday: 3 } });
  });
});

const openSelect = (name: RegExp) => fireEvent.mouseDown(screen.getByRole('combobox', { name }));
const pickOption = (name: string) => fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name }));

describe('AgentForm', () => {
  it('shows the schedule and, for the planner, the brief, the networks and the count', () => {
    renderWithProviders(<AgentForm agent={makeAgent()} readOnly={false} busy={false} onSubmit={vi.fn()} />);
    expect(screen.getByRole('form', { name: 'Agent settings' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Runs/ })).toHaveTextContent('Every week');
    expect(screen.getByRole('combobox', { name: /^On/ })).toHaveTextContent('Monday');
    expect(screen.getByRole('combobox', { name: /^At/ })).toHaveTextContent('09:00');
    expect(screen.getByLabelText(/^Brief/)).toHaveValue('');
    expect(screen.getByText('What the planner writes about this week — a theme, a city, a launch. Leave it empty for anything on-brand.')).toBeInTheDocument();
    const networks = within(screen.getByTestId('agent-networks'));
    expect(networks.getAllByRole('checkbox')).toHaveLength(6);
    expect(networks.getByRole('checkbox', { name: 'LinkedIn' })).not.toBeChecked();
    expect(screen.getByLabelText(/^Posts a week/)).toHaveValue(3);
    expect(screen.getByText(`How many posts the planner creates each run, spread across the week (${MAX_POSTS_PER_WEEK} at most).`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('hides the weekday for a daily agent, and the params for one that reads none', () => {
    renderWithProviders(<AgentForm agent={makeAccountDoctor()} readOnly={false} busy={false} onSubmit={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: /^Runs/ })).toHaveTextContent('Every day');
    expect(screen.queryByRole('combobox', { name: /^On/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Brief/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('agent-networks')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Posts a week/)).not.toBeInTheDocument();
  });

  it('brings the weekday in when a daily agent is set to run weekly', async () => {
    renderWithProviders(<AgentForm agent={makeAccountDoctor()} readOnly={false} busy={false} onSubmit={vi.fn()} />);
    openSelect(/^Runs/);
    pickOption('Every week');
    expect(await screen.findByRole('combobox', { name: /^On/ })).toHaveTextContent('Sunday');
  });

  it('submits what was changed, read as the server takes it, and waits for the answer', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    renderWithProviders(<AgentForm agent={makeAgent()} readOnly={false} busy={false} onSubmit={onSubmit} />);
    const network = (name: string) => within(screen.getByTestId('agent-networks')).getByRole('checkbox', { name });
    fireEvent.change(screen.getByLabelText(/^Brief/), { target: { value: '  Monsoon pods ' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    fireEvent.click(network('LinkedIn'));
    await waitFor(() => expect(network('LinkedIn')).toBeChecked());
    fireEvent.click(network('X'));
    await waitFor(() => expect(network('X')).toBeChecked());
    fireEvent.click(network('LinkedIn'));
    await waitFor(() => expect(network('LinkedIn')).not.toBeChecked());
    fireEvent.change(screen.getByLabelText(/^Posts a week/), { target: { value: '2' } });
    openSelect(/^On/);
    pickOption('Friday');
    await waitFor(() => expect(screen.getByRole('combobox', { name: /^On/ })).toHaveTextContent('Friday'));
    openSelect(/^At/);
    pickOption('18:00');
    await waitFor(() => expect(screen.getByRole('combobox', { name: /^At/ })).toHaveTextContent('18:00'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ every: 'WEEK', hour: 18, weekday: 5, brief: 'Monsoon pods', networks: ['X'], posts_per_week: 2 });
  });

  it('refuses a bad count before submit, in words, and keeps Save off', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<AgentForm agent={makeAgent()} readOnly={false} busy={false} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/^Posts a week/), { target: { value: '9' } });
    expect(await screen.findByText(`At most ${MAX_POSTS_PER_WEEK} posts a week.`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^Posts a week/), { target: { value: '0' } });
    expect(await screen.findByText('At least one post a week.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('follows the agent when the server answers with new values', () => {
    const { rerender } = renderWithProviders(<AgentForm agent={makeAgent()} readOnly={false} busy={false} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^Brief/), { target: { value: 'typing' } });
    rerender(<AgentForm agent={makeAgent({ params: { brief: 'Saved brief', networks: ['X'], posts_per_week: 1 } })} readOnly={false} busy={false} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/^Brief/)).toHaveValue('Saved brief');
    expect(screen.getByLabelText(/^Posts a week/)).toHaveValue(1);
    expect(within(screen.getByTestId('agent-networks')).getByRole('checkbox', { name: 'X' })).toBeChecked();
  });

  it('reads only, with every field off and no Save, for someone who may not change it', () => {
    renderWithProviders(<AgentForm agent={makeAgent()} readOnly busy={false} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/^Brief/)).toBeDisabled();
    expect(screen.getByLabelText(/^Posts a week/)).toBeDisabled();
    for (const box of within(screen.getByTestId('agent-networks')).getAllByRole('checkbox')) expect(box).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /^Runs/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('waits, with the fields off, while a save is in flight', () => {
    renderWithProviders(<AgentForm agent={makeAgent()} readOnly={false} busy onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/^Brief/)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
