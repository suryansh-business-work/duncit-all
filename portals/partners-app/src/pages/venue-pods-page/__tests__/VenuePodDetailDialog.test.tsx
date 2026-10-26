import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import VenuePodDetailDialog from '../VenuePodDetailDialog';
import { makeVenuePodRow } from './fixtures';
import { renderWithProviders } from '../../../__tests__/render';
import { scriptedLink, STAY_PENDING, type ScriptedAnswer } from '../../../__tests__/groupC-link';
import type { VenuePodRow } from '../queries';

afterEach(cleanup);

const PROFILES = 'VenuePodAttendeeProfiles';

const mount = (row: VenuePodRow | null, answer?: ScriptedAnswer) => {
  const onClose = vi.fn();
  renderWithProviders(<VenuePodDetailDialog row={row} onClose={onClose} />, {
    link: scriptedLink(answer === undefined ? {} : { [PROFILES]: answer }),
  });
  return onClose;
};

const people = (...names: (string | null)[]) => ({
  publicUsersByIds: names.map((full_name, index) => ({
    __typename: 'PublicUser',
    user_id: `u${index + 1}`,
    full_name,
    profile_photo: null,
  })),
});

describe('VenuePodDetailDialog', () => {
  it('stays closed without a pod', () => {
    mount(null);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the pod facts, the host names and the attendees by name', async () => {
    mount(makeVenuePodRow(), people('Asha Rao', 'Dev Patel', null));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Yoga')).toBeTruthy();
    expect(dialog.getByText('Hall A')).toBeTruthy();
    expect(dialog.getByText('Hema Kaur')).toBeTruthy();
    expect(dialog.getByText('₹300')).toBeTruthy();
    expect(dialog.getByText('3 / 8')).toBeTruthy();
    expect(await dialog.findByText('Asha Rao')).toBeTruthy();
    expect(dialog.getByText('Dev Patel')).toBeTruthy();
    // A person with no name still gets a row.
    expect(dialog.getByText('Attendee')).toBeTruthy();
  });

  it('asks for exactly the pod’s attendees', async () => {
    const sent: { variables: Record<string, unknown> }[] = [];
    renderWithProviders(<VenuePodDetailDialog row={makeVenuePodRow({ pod_attendees: ['a', 'b'] })} onClose={() => undefined} />, {
      link: scriptedLink({ [PROFILES]: (variables) => { sent.push({ variables }); return people('Xavier'); } }),
    });
    await screen.findByText('Xavier');
    expect(sent[0].variables).toEqual({ ids: ['a', 'b'] });
  });

  it('shows a free pod, the completion time and no attendee query when nobody is coming', async () => {
    const sent: string[] = [];
    renderWithProviders(
      <VenuePodDetailDialog
        row={makeVenuePodRow({ pod_type: 'FREE', pod_attendees: [], attendee_count: 0, no_of_spots: 0, bucket: 'COMPLETED', completed_at: '2026-08-10T20:00:00.000Z' })}
        onClose={() => undefined}
      />,
      { link: scriptedLink({ [PROFILES]: () => { sent.push('asked'); return people(); } }) },
    );
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Free')).toBeTruthy();
    expect(dialog.getByText('No attendees yet.')).toBeTruthy();
    // The bucket chip and the "Completed" row both say it.
    expect(dialog.getAllByText('Completed')).toHaveLength(2);
    expect(sent).toHaveLength(0);
  });

  it('shows a dash for a pod with no host and no end time', async () => {
    mount(makeVenuePodRow({ host_names: [], pod_end_date_time: null }), people());
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('shows when a pod was cancelled', async () => {
    mount(makeVenuePodRow({ bucket: 'CANCELLED', cancelled_at: '2026-08-09T10:00:00.000Z' }), people());
    const dialog = within(await screen.findByRole('dialog'));
    // The bucket chip and the "Cancelled" row both say it.
    expect(dialog.getAllByText('Cancelled')).toHaveLength(2);
  });

  it('shows a spinner while the names load, and closes from the button', async () => {
    const onClose = mount(makeVenuePodRow(), STAY_PENDING);
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByRole('progressbar')).toBeTruthy();
    fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
