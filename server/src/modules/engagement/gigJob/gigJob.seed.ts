/**
 * The Gig Jobs categories Duncit launches with. Seeded create-only on boot
 * (`gigCategoryService.seedDefaults`), so an admin's rename, reorder or
 * switch-off in Admin > Gig Categories survives every redeploy — after the
 * first boot the database, not this file, is the source of truth.
 */
export interface GigCategorySeed {
  slug_id: string;
  title: string;
  examples: string[];
  sort_order: number;
}

export const DEFAULT_GIG_CATEGORIES: readonly GigCategorySeed[] = [
  {
    slug_id: 'photography-videography',
    title: 'Photography & Videography',
    examples: ['Photographer', 'Videographer', 'Reel Creator', 'Drone Operator', 'Video Editor', 'Live Streaming Operator'],
    sort_order: 10,
  },
  {
    slug_id: 'food-catering',
    title: 'Food & Catering',
    examples: ['Caterer', 'Chef', 'Barista', 'Bartender', 'Waiter', 'Food Stall Operator', 'Snack Supplier', 'Baker'],
    sort_order: 20,
  },
  {
    slug_id: 'decoration-setup',
    title: 'Decoration & Setup',
    examples: ['Event Decorator', 'Balloon Artist', 'Florist', 'Theme Designer', 'Stage Designer', 'Lighting Decorator'],
    sort_order: 30,
  },
  {
    slug_id: 'entertainment',
    title: 'Entertainment',
    examples: ['DJ', 'Singer', 'Musician', 'Stand-up Comedian', 'Anchor', 'Dancer', 'Magician', 'Karaoke Host'],
    sort_order: 40,
  },
  {
    slug_id: 'event-staff',
    title: 'Event Staff',
    examples: ['Event Coordinator', 'Registration Staff', 'Ticket Scanner', 'Usher', 'Volunteer', 'Crowd Manager', 'Event Assistant'],
    sort_order: 50,
  },
  {
    slug_id: 'marketing-promotion',
    title: 'Marketing & Promotion',
    examples: ['Influencer', 'Content Creator', 'Social Media Manager', 'Event Promoter', 'Campus Ambassador', 'Poster Designer'],
    sort_order: 60,
  },
  {
    slug_id: 'audio-technical',
    title: 'Audio & Technical',
    examples: ['Sound Engineer', 'AV Technician', 'Lighting Technician', 'Projector Operator', 'Live Stream Technician'],
    sort_order: 70,
  },
  {
    slug_id: 'logistics-operations',
    title: 'Logistics & Operations',
    examples: ['Delivery Partner', 'Equipment Transporter', 'Setup Crew', 'Loading Staff', 'Cleanup Crew', 'Parking Attendant'],
    sort_order: 80,
  },
  {
    slug_id: 'workshop-experts',
    title: 'Workshop Experts',
    examples: ['Pottery Instructor', 'Art Teacher', 'Dance Instructor', 'Yoga Trainer', 'Fitness Coach', 'Baking Instructor', 'Craft Expert'],
    sort_order: 90,
  },
  {
    slug_id: 'party-social-events',
    title: 'Party & Social Events',
    examples: ['Makeup Artist', 'Mehndi Artist', 'Tattoo Artist', 'Face Painter', 'Game Coordinator', 'Photo Booth Operator'],
    sort_order: 100,
  },
  {
    slug_id: 'sports-gaming',
    title: 'Sports & Gaming',
    examples: ['Referee', 'Umpire', 'Scorekeeper', 'Sports Coach', 'Tournament Coordinator', 'Gaming Moderator'],
    sort_order: 110,
  },
  {
    slug_id: 'pet-events',
    title: 'Pet Events',
    examples: ['Pet Groomer', 'Pet Trainer', 'Pet Photographer', 'Pet Handler', 'Veterinary Professional'],
    sort_order: 120,
  },
  {
    slug_id: 'safety-support',
    title: 'Safety & Support',
    examples: ['Security Guard', 'First Aid Responder', 'Lifeguard', 'Housekeeping', 'Accessibility Assistant'],
    sort_order: 130,
  },
  {
    slug_id: 'rentals-supplies',
    title: 'Rentals & Supplies',
    examples: ['Camera Rental', 'Sound System Rental', 'Projector Rental', 'Chairs & Tables', 'Tent Rental', 'Workshop Material Supplier'],
    sort_order: 140,
  },
  {
    slug_id: 'sponsorship',
    title: 'Sponsorship',
    examples: ['Event Sponsor', 'Brand Partner', 'Prize Sponsor', 'Food & Beverage Sponsor', 'Venue Sponsor'],
    sort_order: 150,
  },
];
