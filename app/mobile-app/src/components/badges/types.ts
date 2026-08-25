/** Structural shape of the `myBadgeProgress` selection — what the badge
 * components accept, so they stay decoupled from the generated document. */
export interface BadgeRowShape {
  current: number;
  target: number;
  achieved: boolean;
  achieved_at?: string | null;
  badge: {
    id: string;
    title: string;
    description: string;
    image_url: string;
    condition_type: string;
    threshold: number;
  };
}
