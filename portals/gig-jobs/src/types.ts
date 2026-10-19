import type { GigContact, GigEventType, GigJobStatus, GigPosterRole } from '@duncit/utils';

/** Row shapes of the console's tables — the server's *AdminRow types. */

export interface GigJobAdminRow {
  id: string;
  title: string;
  category_title: string;
  roles: string[];
  event_type: GigEventType;
  event_date: string | null;
  city: string;
  budget: number | null;
  openings: number;
  status: GigJobStatus;
  poster_role: GigPosterRole;
  poster_name: string;
  poster_user_id: string;
  interest_count: number;
  contact: GigContact;
  created_at: string;
}

export interface FreelancerAdminRow {
  id: string;
  user_id: string;
  display_name: string;
  city: string;
  skills: string[];
  category_titles: string[];
  experience_years: number;
  portfolio_url: string;
  is_available: boolean;
  contact: GigContact;
  created_at: string;
}

export interface GigInterestAdminRow {
  id: string;
  job_id: string;
  job_title: string;
  freelancer_name: string;
  skills: string[];
  message: string;
  contact: GigContact;
  created_at: string;
}

export interface GigJobStats {
  total: number;
  open: number;
  closed: number;
  interests: number;
  freelancers: number;
  posters: number;
  categories: number;
}
