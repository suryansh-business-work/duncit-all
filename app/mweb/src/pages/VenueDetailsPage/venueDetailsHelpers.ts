export const addressParts = (venue: any) => [
  venue.address_line1,
  venue.address_line2,
  venue.locality,
  venue.city,
  venue.state,
  venue.postal_code,
  venue.country,
];

/** The round 40px surface action on the header's right. */
export const ROUND_BTN_SX = {
  width: 40,
  height: 40,
  minHeight: 40,
  bgcolor: 'background.paper',
  color: 'text.primary',
  border: '1px solid var(--duncit-card-border)',
} as const;

/** Hero inside the page padding with the calm 24px corners (native twin). */
export const HERO_SX = { width: '100%', height: { xs: 240, sm: 360 }, borderRadius: '24px', overflow: 'hidden' } as const;
