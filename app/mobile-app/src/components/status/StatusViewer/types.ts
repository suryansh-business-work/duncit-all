import type { StatusGroup } from '@/hooks/useStatus';
import type { StoryTarget } from '@/hooks/useStoryRail';

/** A viewer item: an author's story group, optionally carrying a sub-label and a
 * deep-link target (followed club/pod/user) for the "Open details" button. */
export type ViewerStatus = StatusGroup & {
  subLabel?: string | null;
  target?: StoryTarget;
  /** Duncit's own pinned group — names its parts with the official test ids. */
  official?: boolean;
};

export interface StatusViewerProps {
  status: ViewerStatus | null;
  onClose: () => void;
  /** Jump to the next author's story (auto-advance past the last slide, tap on
   * the right edge of the last slide, or swipe left). Falls back to onClose. */
  onNext?: () => void;
  /** Jump to the previous author's story (tap on the left edge of the first
   * slide, or swipe right). */
  onPrev?: () => void;
  /** Navigate to the item's club/pod/user when "Open details" is tapped (bug 3). */
  onOpenTarget?: (target: StoryTarget) => void;
  /** Own story only — delete the currently shown slide via the kebab menu (Bug 7). */
  onDelete?: (slideId: string) => void;
  /**
   * Flag the currently shown slide. Passed by ANY viewer who can see the
   * story — unlike delete, reporting is not an owner's privilege.
   */
  onReport?: (slideId: string) => void;
  /** Own story only — open the "seen by" viewers sheet for a slide (Bug 4). */
  onViewers?: (slideId: string) => void;
  /** Followers' stories only — like/unlike the current slide (Bug 5). */
  onToggleLike?: (slideId: string) => void;
  /** Record that a slide was shown so its ring greys (Bug 2). */
  onSlideSeen?: (slideId: string) => void;
  /** Duncit statuses only — open the slide's own link ("See more"). Each status
   * carries its own, so it belongs to the slide rather than to the group. */
  onOpenLink?: (url: string) => void;
  /** Slide to open on. A per-story rail (the club page) opens the tapped
   * story; author rails open at the start. */
  startIndex?: number;
  /** Whose profile the header name opens. Falls back to a `user` target;
   * absent on club, pod and ad stories, whose header names nobody's profile. */
  authorUserId?: string;
  /** Open the author's public profile — the viewer closes first. */
  onOpenAuthor?: (userId: string) => void;
}
