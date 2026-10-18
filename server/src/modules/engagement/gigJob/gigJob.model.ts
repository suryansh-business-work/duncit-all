import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * Gig Jobs — what a host, a venue owner or a brand owner needs for an event or
 * a workshop (a photographer, a caterer, a sponsor), posted for freelancers to
 * pick up. Nothing here is billed: interest shares contacts both ways for free
 * today, which is why every contact read goes through one gate
 * (`gigJob.service` `contactVisibleTo`) — the gate is where a future paid
 * unlock would sit.
 */

/** The partner roles that may post a gig. Brand owner = ECOMM_MANAGER (Partner
 * Brand, never the pet store's ECOMM_STORE_MANAGER). */
export const GIG_POSTER_ROLES = ['HOST', 'VENUE_OWNER', 'ECOMM_MANAGER'] as const;
export type GigPosterRole = (typeof GIG_POSTER_ROLES)[number];

export const GIG_EVENT_TYPES = ['EVENT', 'WORKSHOP', 'OTHER'] as const;
export type GigEventType = (typeof GIG_EVENT_TYPES)[number];

export const GIG_JOB_STATUSES = ['OPEN', 'CLOSED'] as const;
export type GigJobStatus = (typeof GIG_JOB_STATUSES)[number];

/** The role a freelancer holds once their profile is saved (Earn with Duncit). */
export const FREELANCER_ROLE = 'FREELANCER';

export interface IGigCategory extends Document {
  slug_id: string;
  title: string;
  description: string;
  /** The gig roles under this category ("Photographer", "Drone Operator" …),
   * offered as the picks on a post and on a freelancer's skills. */
  examples: string[];
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const gigCategorySchema = new Schema<IGigCategory>(
  {
    slug_id: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    examples: { type: [String], default: [] },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

gigCategorySchema.index({ is_active: 1, sort_order: 1 });

export const GigCategoryModel = model<IGigCategory>('GigCategory', gigCategorySchema);

export interface IGigJob extends Document {
  poster_user_id: Types.ObjectId;
  poster_role: GigPosterRole;
  /** The poster's name when they posted — a list never joins users. */
  poster_name: string;
  category_id: Types.ObjectId;
  title: string;
  description: string;
  /** The gig roles needed, picked from the category's examples. */
  roles: string[];
  event_type: GigEventType;
  event_date: Date | null;
  city: string;
  location: string;
  /** Rupees, whole. Null = "discuss with the poster". */
  budget: number | null;
  openings: number;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  status: GigJobStatus;
  interest_count: number;
  created_at: Date;
  updated_at: Date;
}

const gigJobSchema = new Schema<IGigJob>(
  {
    poster_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    poster_role: { type: String, enum: GIG_POSTER_ROLES, required: true },
    poster_name: { type: String, default: '' },
    category_id: { type: Schema.Types.ObjectId, ref: 'GigCategory', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    roles: { type: [String], default: [] },
    event_type: { type: String, enum: GIG_EVENT_TYPES, default: 'EVENT' },
    event_date: { type: Date, default: null },
    city: { type: String, default: '', trim: true },
    location: { type: String, default: '', trim: true },
    budget: { type: Number, default: null, min: 0 },
    openings: { type: Number, default: 1, min: 1 },
    contact_name: { type: String, default: '' },
    contact_phone: { type: String, default: '' },
    contact_email: { type: String, default: '' },
    status: { type: String, enum: GIG_JOB_STATUSES, default: 'OPEN' },
    interest_count: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The board (open gigs, newest first, optionally one category) and "My posts".
gigJobSchema.index({ status: 1, created_at: -1 });
gigJobSchema.index({ status: 1, category_id: 1, created_at: -1 });
gigJobSchema.index({ poster_user_id: 1, created_at: -1 });

export const GigJobModel = model<IGigJob>('GigJob', gigJobSchema);

/**
 * A freelancer's "I'm interested" on one gig. Their contact is copied on at
 * that moment, so the poster keeps the number they were given even if the
 * freelancer edits their profile later. One row per freelancer per gig.
 */
export interface IGigInterest extends Document {
  job_id: Types.ObjectId;
  poster_user_id: Types.ObjectId;
  freelancer_user_id: Types.ObjectId;
  freelancer_name: string;
  freelancer_phone: string;
  freelancer_email: string;
  skills: string[];
  message: string;
  created_at: Date;
  updated_at: Date;
}

const gigInterestSchema = new Schema<IGigInterest>(
  {
    job_id: { type: Schema.Types.ObjectId, ref: 'GigJob', required: true },
    poster_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    freelancer_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    freelancer_name: { type: String, default: '' },
    freelancer_phone: { type: String, default: '' },
    freelancer_email: { type: String, default: '' },
    skills: { type: [String], default: [] },
    message: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The duplicate guard: a double tap or a retry can never count twice.
gigInterestSchema.index({ job_id: 1, freelancer_user_id: 1 }, { unique: true });
gigInterestSchema.index({ freelancer_user_id: 1, job_id: 1 });

export const GigInterestModel = model<IGigInterest>('GigInterest', gigInterestSchema);

export interface IFreelancerProfile extends Document {
  user_id: Types.ObjectId;
  display_name: string;
  category_ids: Types.ObjectId[];
  skills: string[];
  city: string;
  bio: string;
  portfolio_url: string;
  experience_years: number;
  contact_phone: string;
  contact_email: string;
  is_available: boolean;
  created_at: Date;
  updated_at: Date;
}

const freelancerProfileSchema = new Schema<IFreelancerProfile>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    display_name: { type: String, default: '', trim: true },
    category_ids: { type: [Schema.Types.ObjectId], ref: 'GigCategory', default: [] },
    skills: { type: [String], default: [] },
    city: { type: String, default: '', trim: true },
    bio: { type: String, default: '' },
    portfolio_url: { type: String, default: '' },
    experience_years: { type: Number, default: 0, min: 0 },
    contact_phone: { type: String, default: '' },
    contact_email: { type: String, default: '' },
    is_available: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const FreelancerProfileModel = model<IFreelancerProfile>('FreelancerProfile', freelancerProfileSchema);
