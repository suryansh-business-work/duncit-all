import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AutoPodRowMenu, { type AutoPodRowMenuProps } from '../AutoPodRowMenu';
import type { AutoPodTableRow } from '../queries';

const makeRow = (over: Partial<AutoPodTableRow> = {}): AutoPodTableRow => ({
  id: 'doc1',
  auto_pod_no: 'AP-1',
  stage: 'OPEN',
  is_active: true,
  pod_title: 'Weekend Trek',
  pod_description: '',
  pod_info: '',
  pod_hashtag: [],
  pod_images_and_videos: [],
  super_category_id: 'sc1',
  sub_category_id: 'sub1',
  category_name: 'Adventure',
  category_path: ['Outdoors', 'Hiking', 'Adventure'],
  pod_amount: 500,
  no_of_spots: 10,
  pod_occurrence: 'ONE_TIME',
  pod_mode: 'PHYSICAL',
  payment_terms: null,
  venue_claim: null,
  host_claim: null,
  club_claim: null,
  location: null,
  pod_id: null,
  created_at: '2026-01-02T08:00:00.000Z',
  updated_at: '2026-01-03T08:00:00.000Z',
  ...over,
});

const t = (key: string) => key;

const renderMenu = (row: AutoPodTableRow, over: Partial<AutoPodRowMenuProps> = {}) => {
  const props: AutoPodRowMenuProps = {
    row,
    t,
    onViewDetails: vi.fn(),
    onEdit: vi.fn(),
    onCancel: vi.fn(),
    onDelete: vi.fn(),
    onViewPod: vi.fn(),
    onToggleActive: vi.fn(),
    ...over,
  };
  render(<AutoPodRowMenu {...props} />);
  return props;
};

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'admin.autoPods.moreActions' }));

describe('AutoPodRowMenu', () => {
  it('opens on the three-dot button and offers Edit, Deactivate, Cancel and Delete on a fresh offer', () => {
    renderMenu(makeRow());
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    openMenu();
    expect(screen.getByRole('menuitem', { name: 'admin.autoPods.edit' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'admin.autoPods.deactivate' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'admin.autoPods.cancel' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'admin.autoPods.delete' })).toBeEnabled();
    // Nothing to open before the offer has materialized.
    expect(screen.queryByRole('menuitem', { name: 'admin.autoPods.viewPod' })).not.toBeInTheDocument();
  });

  it('runs each action with the row and closes the menu first', async () => {
    const props = renderMenu(makeRow({ pod_id: 'pod-9' }));
    for (const [label, handler] of [
      ['admin.autoPods.edit', props.onEdit],
      ['admin.autoPods.deactivate', props.onToggleActive],
      ['admin.autoPods.viewPod', props.onViewPod],
      ['admin.autoPods.cancel', props.onCancel],
      ['admin.autoPods.delete', props.onDelete],
    ] as const) {
      openMenu();
      fireEvent.click(screen.getByRole('menuitem', { name: label }));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: 'doc1' }));
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    }
  });

  it('offers Activate on a paused offer', () => {
    renderMenu(makeRow({ is_active: false }));
    openMenu();
    expect(screen.getByRole('menuitem', { name: 'admin.autoPods.activate' })).toBeEnabled();
    expect(screen.queryByRole('menuitem', { name: 'admin.autoPods.deactivate' })).not.toBeInTheDocument();
  });

  it('disables Edit, the pause toggle, Cancel and Delete once the offer is live, and offers Open pod', () => {
    renderMenu(makeRow({ stage: 'LIVE', pod_id: 'pod-9' }));
    openMenu();
    expect(screen.getByRole('menuitem', { name: 'admin.autoPods.edit' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: 'admin.autoPods.deactivate' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: 'admin.autoPods.cancel' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: 'admin.autoPods.delete' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: 'admin.autoPods.viewPod' })).toBeEnabled();
  });

  it('still allows Delete on a cancelled offer, which is over but not a pod', () => {
    renderMenu(makeRow({ stage: 'CANCELLED' }));
    openMenu();
    expect(screen.getByRole('menuitem', { name: 'admin.autoPods.delete' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'admin.autoPods.edit' })).toHaveAttribute('aria-disabled', 'true');
  });
});
