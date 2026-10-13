import { fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { getScenarioColumns } from '../../src/pages/whatsapp-page/wa-automation/scenarioColumns/scenarioColumns';
import type { WaScenario } from '../../src/pages/whatsapp-page/wa-automation/queries';
import { makeScenario } from '../mocks/whatsapp.mock';
import { renderWithProviders } from '../testkit';

const defaults = { image: 'https://cdn.example.test/default.png', document: '' };

const build = (over: Partial<Parameters<typeof getScenarioColumns>[0]> = {}) => {
  const handlers = { onToggle: vi.fn(), onSetMedia: vi.fn(), onProvision: vi.fn() };
  const columns = getScenarioColumns({
    t: (key) => key,
    busyKey: null,
    defaults,
    categories: ['TRANSACTIONAL', 'PROMOTIONAL'],
    ...handlers,
    ...over,
  });
  const col = (field: string) => columns.find((c) => c.field === field)!;
  const render = (field: string, row: WaScenario) =>
    renderWithProviders(
      <>{(col(field).cellRenderer as (r: WaScenario) => ReactNode)(row)}</>
    );
  const value = (field: string, row: WaScenario) =>
    (col(field).valueGetter as (r: WaScenario) => string)(row);
  return { columns, col, render, value, ...handlers };
};

describe('scenario columns - values', () => {
  it('lists the columns in board order, with the status column hidden', () => {
    const { columns, col } = build();
    expect(columns.map((c) => c.field)).toEqual([
      'event_key',
      'audience',
      'category',
      'campaign',
      'template_name',
      'campaign_status',
      'template_params',
      'override_media_url',
      'blocker',
      'enabled',
    ]);
    expect(col('campaign_status').hide).toBe(true);
  });

  it('exposes what search and sort read for each column', () => {
    const { value } = build();
    const row = makeScenario({ blocker: '' });
    expect(value('event_key', row)).toBe('order_placed When an order is placed');
    // Category sorts and filters by its human label, which is what the cell shows.
    expect(value('category', makeScenario({ category: 'billing' }))).toBe(
      'whatsappPreference.categories.billing.label'
    );
    // A category the bundle has no copy for yet still reads as itself.
    expect(value('category', makeScenario({ category: 'NINTH_ONE' }))).toBe('NINTH_ONE');
    expect(value('campaign', row)).toBe('order_camp LIVE');
    expect(value('template_name', row)).toBe('order_tpl APPROVED');
    expect(value('campaign_status', row)).toBe('LIVE / APPROVED');
    expect(value('template_params', row)).toBe('2 / 2');
    // No blocker reads as the ready label, so "ready" is searchable.
    expect(value('blocker', row)).toBe('adminWhatsapp.blockerNone');
    expect(value('blocker', makeScenario({ blocker: 'Media URL Missing' }))).toBe(
      'Media URL Missing'
    );
  });

  it('sorts the media column by its state label, not its URL', () => {
    const { value } = build();
    expect(value('override_media_url', makeScenario({ needs_media: false }))).toBe(
      'adminWhatsapp.mediaNotNeeded'
    );
    expect(
      value('override_media_url', makeScenario({ needs_media: true, template_header_format: 'VIDEO' }))
    ).toBe('adminWhatsapp.mediaNone');
  });

  it('offers every category the board carries as a filter choice', () => {
    const { col } = build();
    const options = (col('category') as unknown as { options: { value: string }[] }).options;
    expect(options.map((o) => o.value)).toEqual(['TRANSACTIONAL', 'PROMOTIONAL']);
  });
});

describe('scenario columns - cells', () => {
  it('shows the scenario key and the sentence that fires it', () => {
    build().render('event_key', makeScenario());
    expect(screen.getByText('order_placed')).toBeInTheDocument();
    expect(screen.getByText('When an order is placed')).toBeInTheDocument();
  });

  it('shows names with their AiSensy state chips, and a dash for a missing name', () => {
    const { render } = build();
    render('campaign', makeScenario({ campaign: '', campaign_status: '' }));
    expect(screen.getByText('—')).toBeInTheDocument();
    render('template_name', makeScenario({ template_status: 'rejected' }));
    expect(screen.getByText('order_tpl')).toBeInTheDocument();
    expect(screen.getByText('rejected')).toBeInTheDocument();
  });

  it('flags a values mismatch between the code and the live template', () => {
    build().render('template_params', makeScenario({ params: ['a'], template_params: 3 }));
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('shows the media state with the way in to change it, only where media matters', () => {
    const { render, onSetMedia } = build();
    const row = makeScenario({ needs_media: true });
    render('override_media_url', row);
    expect(screen.getByText('adminWhatsapp.mediaDefault')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'adminWhatsapp.setMedia' }));
    expect(onSetMedia).toHaveBeenCalledWith(row);
  });

  it('keeps a text-header row a quiet caption with no button', () => {
    build().render('override_media_url', makeScenario({ needs_media: false }));
    expect(screen.getByText('adminWhatsapp.mediaNotNeeded')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers a leftover override a button even when the template no longer needs media', () => {
    build().render(
      'override_media_url',
      makeScenario({ needs_media: false, override_media_url: 'https://cdn.example.test/o.png' })
    );
    expect(screen.getByText('adminWhatsapp.mediaCustom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'adminWhatsapp.setMedia' })).toBeInTheDocument();
  });

  it('says a clean row is ready, and a blocked row why, with the provisioning step', () => {
    const { render, onProvision } = build();
    render('blocker', makeScenario());
    expect(screen.getByText('adminWhatsapp.blockerNone')).toBeInTheDocument();

    const blocked = makeScenario({ blocker: 'No template', provision_step: 'TEMPLATE' });
    render('blocker', blocked);
    expect(screen.getByText('No template')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'adminWhatsapp.provisionTemplate' }));
    expect(onProvision).toHaveBeenCalledWith(blocked);
  });

  it('shows a blocker without a button when there is nothing to provision', () => {
    build().render('blocker', makeScenario({ blocker: 'Disabled upstream' }));
    expect(screen.getByText('Disabled upstream')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('disables the provision button only on the row a write is in flight for', () => {
    build({ busyKey: 'order_placed' }).render(
      'blocker',
      makeScenario({ blocker: 'No campaign', provision_step: 'CAMPAIGN' })
    );
    expect(screen.getByRole('button', { name: 'adminWhatsapp.provisionCampaign' })).toBeDisabled();
  });

  it('toggles a scenario by event key through its switch', () => {
    const { render, onToggle } = build();
    render('enabled', makeScenario({ enabled: true }));
    fireEvent.click(screen.getByRole('switch', { name: 'order_placed' }));
    expect(onToggle).toHaveBeenCalledWith('order_placed', false);
  });

  it('locks the switch for a scenario that cannot be disabled', () => {
    build().render('enabled', makeScenario({ can_disable: false }));
    expect(screen.getByRole('switch', { name: 'order_placed' })).toBeDisabled();
  });

  it('locks the switch while a write for that row is in flight', () => {
    build({ busyKey: 'order_placed' }).render('enabled', makeScenario());
    expect(screen.getByRole('switch', { name: 'order_placed' })).toBeDisabled();
  });
});
