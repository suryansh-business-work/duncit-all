import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AutoPodStageChip, CancelAutoPodButton, ViewPodButton } from '../AutoPodStageChip';
import { STAGE_LABEL_KEY } from '../helpers';
import type { AutoPodTableRow } from '../queries';

const makeRow = (over: Partial<AutoPodTableRow> = {}): AutoPodTableRow => ({
  id: 'doc1',
  auto_pod_no: 'AP-1',
  stage: 'OPEN',
  pod_title: 'Weekend Trek',
  pod_description: '',
  pod_info: '',
  pod_hashtag: [],
  pod_images_and_videos: [],
  super_category_id: 'sc1',
  sub_category_id: 'sub1',
  category_name: 'Adventure',
  pod_amount: 500,
  no_of_spots: 10,
  pod_occurrence: 'ONE_TIME',
  payment_terms: null,
  venue_claim: null,
  host_claim: null,
  club_claim: null,
  location: null,
  pod_id: null,
  created_at: '2026-01-02T08:00:00.000Z',
  ...over,
});

const t = (key: string) => `T:${key}`;

describe('AutoPodStageChip', () => {
  it('renders a chip coloured and labelled for the stage, for every stage', () => {
    const cases: [AutoPodTableRow['stage'], string][] = [
      ['OPEN', 'MuiChip-colorWarning'],
      ['CLAIMING', 'MuiChip-colorWarning'],
      ['MATERIALIZING', 'MuiChip-colorInfo'],
      ['LIVE', 'MuiChip-colorSuccess'],
      ['CANCELLED', 'MuiChip-colorError'],
      ['EXPIRED', 'MuiChip-colorDefault'],
    ];
    for (const [stage, colorClass] of cases) {
      const { container, unmount } = render(<AutoPodStageChip row={makeRow({ stage })} t={t} />);
      expect(container.querySelector(`.${colorClass}`)).toBeInTheDocument();
      expect(screen.getByText(`T:${STAGE_LABEL_KEY[stage]}`)).toBeInTheDocument();
      unmount();
    }
  });
});

describe('ViewPodButton', () => {
  it('renders nothing before the offer has materialized into a pod', () => {
    const { container } = render(
      <ViewPodButton row={makeRow({ pod_id: null })} label="Open pod" onClick={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an icon button once a pod exists, and calls back with the row', () => {
    const onClick = vi.fn();
    const row = makeRow({ pod_id: 'pod-9' });
    render(<ViewPodButton row={row} label="Open pod" onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Open pod' });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledWith(row);
  });
});

describe('CancelAutoPodButton', () => {
  it('is disabled once the offer is past the pre-live stage', () => {
    render(
      <CancelAutoPodButton row={makeRow({ stage: 'LIVE' })} label="Cancel Auto Pod" onClick={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Cancel Auto Pod' })).toBeDisabled();
  });

  it('is enabled while pre-live, and calls back with the row when clicked', () => {
    const onClick = vi.fn();
    const row = makeRow({ stage: 'OPEN' });
    render(<CancelAutoPodButton row={row} label="Cancel Auto Pod" onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Cancel Auto Pod' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledWith(row);
  });
});
