import type { Translate } from '@duncit/shell';
import type { PodRow } from '../queries';

export interface PodsColumnDeps {
  /** Column headings and the status chips are copy — the page hands its
   *  translator down rather than a column module reaching for a hook. */
  t: Translate;
  showProducts: boolean;
  clubName: (id: string) => string;
  /** Where the club runs ("Gomti Nagar, Lucknow"); '' when unknown. */
  clubLocation: (id: string) => string;
  venueName: (id: string) => string;
  locName: (id: string) => string;
  /** The club's sub-category minimum people (0 = none). */
  minPax: (clubId: string) => number;
  onEdit: (p: PodRow) => void;
  onQuickEdit: (p: PodRow) => void;
  onDelete: (p: PodRow) => void;
  onComplete: (p: PodRow) => void;
  onMonitor: (p: PodRow) => void;
}
