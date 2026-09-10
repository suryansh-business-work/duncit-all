import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AutoPodStageChip } from '../AutoPodStageChip';
import { STAGE_LABEL_KEY } from '../helpers';
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
