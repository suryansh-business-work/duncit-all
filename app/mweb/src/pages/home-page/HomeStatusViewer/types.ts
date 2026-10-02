export interface HomeStatusViewerSlide {
  /** Post id — present for real stories so the slide can be recorded/liked/deleted. */
  id?: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  subLabel?: string;
  caption?: string;
  createdAt?: string;
  /** When the status auto-expires (drives the "X remaining" countdown). */
  expiresAt?: string | null;
  likeCount?: number;
  /** Has the viewer liked this story (Bug 5). */
  likedByMe?: boolean;
  commentCount?: number;
  thumbnailUrl?: string;
  /** "See more" target — the pinned Duncit group carries its link per slide. */
  linkUrl?: string;
  /** True when linkUrl is an in-app path; false leaves the app. */
  linkInternal?: boolean;
}

export interface HomeStatusViewerItem {
  label: string;
  subLabel?: string;
  avatarUrl?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  slides?: HomeStatusViewerSlide[];
  targetUrl?: string;
  internal?: boolean;
  /** The author's user id — tapping the header name or avatar opens /u/:id.
   * Absent on club, pod and ad stories, whose header names nobody's profile. */
  authorId?: string;
  /** Origin of the story — gates like (user) vs viewers/delete (mine) (Bugs 4,5,7).
   * An `ad` story carries none of those: it is sponsored media, not somebody's post.
   * `official` is the pinned Duncit group from Marketing > Status. */
  kind?: 'mine' | 'user' | 'club' | 'pod' | 'ad' | 'official';
}

export interface HomeStatusViewerProps {
  item: HomeStatusViewerItem | null;
  onClose: () => void;
  /** Jump to the next follower's story (end of slides / right tap / swipe left). */
  onNext?: () => void;
  /** Jump to the previous follower's story (back tap on slide 1 / swipe right). */
  onPrev?: () => void;
  /** Own story only — delete the currently shown slide by its post id (Bug 7). */
  onDelete?: (slideId: string) => void;
  /** Somebody else's story — offer "Report story" in the 3-dot menu. Unlike
   * delete, reporting is for anyone who can see the story except its owner.
   * The viewer runs the report dialog itself and holds the story while it is
   * open, so a slide cannot advance away from under a half-written report. */
  canReport?: boolean;
  /** Own story only — open the "seen by" viewers dialog for a slide (Bug 4). */
  onViewers?: (slideId: string) => void;
  /** Followers' stories only — like/unlike the current slide (Bug 5). */
  onToggleLike?: (slideId: string) => void;
  /** Record that a slide was shown so its ring greys (Bug 2). */
  onRecordView?: (slideId: string) => void;
  /** Slide to open on. A per-story rail (a member's profile) opens the tapped
   * story; author rails open at the start. */
  startIndex?: number;
}
