import { describe, expect, it } from 'vitest';
import {
  CREATE_GIG_JOB_MUTATION,
  EXPRESS_GIG_INTEREST_MUTATION,
  FREELANCER_PROFILE_PATH,
  GIG_CATEGORIES_QUERY,
  GIG_JOBS_QUERY,
  GIG_JOB_INTERESTS_QUERY,
  GIG_JOB_QUERY,
  GIG_POST_PATH,
  GIG_VIEWER_QUERY,
  MY_FREELANCER_PROFILE_QUERY,
  MY_GIGS_PATH,
  MY_GIG_JOBS_QUERY,
  SAVE_FREELANCER_PROFILE_MUTATION,
  SET_GIG_JOB_STATUS_MUTATION,
  UPDATE_GIG_JOB_MUTATION,
  canPostGigs,
  emptyGigJobValues,
  freelancerSkillOptions,
  freelancerToValues,
  gigBudgetText,
  gigContactLinks,
  gigEventTypeKey,
  gigJobEditPath,
  gigJobPath,
  gigJobToValues,
  gigPosterRoleKey,
  gigRoleOptions,
  gigStatusKey,
  gigViewerAction,
  prunedGigRoles,
  settledGigFilter,
  GIG_FILTER_SETTLE_MS,
  toFreelancerInput,
  toGigJobInput,
  type FreelancerProfile,
  type GigCategory,
  type GigJob,
  type GigViewer,
} from '../src/gig-jobs';

const CATEGORIES: GigCategory[] = [
  { id: 'c1', title: 'Photography & Videography', examples: ['Photographer', 'Drone Operator'] },
  { id: 'c2', title: 'Food & Catering', examples: ['Caterer', 'Photographer'] },
];

const VIEWER: GigViewer = {
  poster_roles: ['VENUE_OWNER'],
  is_freelancer: false,
  default_contact: { name: 'Asha Rao', phone: '+919876543210', email: 'asha@example.com' },
};

const JOB: GigJob = {
  id: 'g1',
  title: 'Photographer for a pottery workshop',
  category_title: 'Photography & Videography',
  category_id: 'c1',
  roles: ['Photographer'],
  event_type: 'WORKSHOP',
  event_date: '2026-11-02T00:00:00.000Z',
  city: 'Pune',
  location: 'Koregaon Park',
  description: 'Two hours of candid shots.',
  budget: 5000,
  openings: 2,
  status: 'OPEN',
  poster_role: 'VENUE_OWNER',
  poster_name: 'Asha Rao',
  interest_count: 0,
  is_mine: false,
  viewer_interested: false,
  contact: null,
  created_at: '2026-10-18T10:00:00.000Z',
};

describe('gig paths', () => {
  it('builds the board, post, mine, detail and edit paths', () => {
    expect(GIG_POST_PATH).toBe('/gigs/new');
    expect(MY_GIGS_PATH).toBe('/gigs/mine');
    expect(FREELANCER_PROFILE_PATH).toBe('/earn/freelancer');
    expect(gigJobPath('abc')).toBe('/gigs/abc');
    expect(gigJobEditPath('abc')).toBe('/gigs/abc/edit');
  });

  it('encodes an id so it can never break out of its segment', () => {
    expect(gigJobPath('a/b')).toBe('/gigs/a%2Fb');
  });
});

describe('gig documents', () => {
  it.each([
    ['GigCategories', GIG_CATEGORIES_QUERY],
    ['GigViewer', GIG_VIEWER_QUERY],
    ['GigJobs', GIG_JOBS_QUERY],
    ['MyGigJobs', MY_GIG_JOBS_QUERY],
    ['GigJob', GIG_JOB_QUERY],
    ['GigJobInterests', GIG_JOB_INTERESTS_QUERY],
    ['MyFreelancerProfile', MY_FREELANCER_PROFILE_QUERY],
    ['CreateGigJob', CREATE_GIG_JOB_MUTATION],
    ['UpdateGigJob', UPDATE_GIG_JOB_MUTATION],
    ['SetGigJobStatus', SET_GIG_JOB_STATUS_MUTATION],
    ['ExpressGigInterest', EXPRESS_GIG_INTEREST_MUTATION],
    ['SaveFreelancerProfile', SAVE_FREELANCER_PROFILE_MUTATION],
  ])('%s is one named operation with balanced braces', (name, doc) => {
    expect(doc).toMatch(new RegExp('^(query|mutation) ' + name + '[ ({]'));
    const opens = doc.split('{').length - 1;
    expect(opens).toBeGreaterThan(0);
    expect(doc.split('}').length - 1).toBe(opens);
    expect(doc.trimEnd().endsWith('}')).toBe(true);
  });

  it('asks for the contact only where a gig is opened, never on the board', () => {
    expect(GIG_JOB_QUERY).toContain('contact { name phone email }');
    expect(GIG_JOBS_QUERY).not.toContain('contact');
    expect(MY_GIG_JOBS_QUERY).not.toContain('contact');
  });
});

describe('gig label keys', () => {
  it('names each poster role, event type and status with a literal key', () => {
    expect(gigPosterRoleKey('HOST')).toBe('gigJobs.posterRole.HOST');
    expect(gigPosterRoleKey('VENUE_OWNER')).toBe('gigJobs.posterRole.VENUE_OWNER');
    expect(gigPosterRoleKey('ECOMM_MANAGER')).toBe('gigJobs.posterRole.ECOMM_MANAGER');
    expect(gigEventTypeKey('WORKSHOP')).toBe('gigJobs.eventType.WORKSHOP');
    expect(gigEventTypeKey('OTHER')).toBe('gigJobs.eventType.OTHER');
    expect(gigStatusKey('CLOSED')).toBe('gigJobs.status.CLOSED');
  });

  it('falls back to a real label for a value the client does not know yet', () => {
    expect(gigPosterRoleKey('ECOMM_STORE_MANAGER')).toBe('gigJobs.posterRole.HOST');
    expect(gigEventTypeKey(undefined)).toBe('gigJobs.eventType.EVENT');
    expect(gigStatusKey('ARCHIVED')).toBe('gigJobs.status.OPEN');
  });
});

describe('gigBudgetText', () => {
  it('formats a budget in rupees, including a zero budget', () => {
    expect(gigBudgetText(15000)).toBe('₹15,000');
    expect(gigBudgetText(0)).toBe('₹0');
  });

  it('is null when the budget is left to discuss', () => {
    expect(gigBudgetText(null)).toBeNull();
    expect(gigBudgetText(undefined)).toBeNull();
  });
});

describe('canPostGigs', () => {
  it('is true only for a viewer holding a poster role', () => {
    expect(canPostGigs(VIEWER)).toBe(true);
    expect(canPostGigs({ poster_roles: [] })).toBe(false);
    expect(canPostGigs(null)).toBe(false);
    expect(canPostGigs(undefined)).toBe(false);
  });
});

describe('gigViewerAction', () => {
  it('lets the poster manage their own gig, open or closed', () => {
    expect(gigViewerAction({ ...JOB, is_mine: true }, VIEWER)).toBe('MANAGE');
    expect(gigViewerAction({ ...JOB, is_mine: true, status: 'CLOSED' }, VIEWER)).toBe('MANAGE');
  });

  it('keeps a shared contact visible after the gig closes', () => {
    expect(gigViewerAction({ ...JOB, viewer_interested: true, status: 'CLOSED' }, VIEWER)).toBe('CONTACT_SHARED');
  });

  it('refuses new interest on a closed gig', () => {
    expect(gigViewerAction({ ...JOB, status: 'CLOSED' }, { is_freelancer: true })).toBe('CLOSED');
  });

  it('asks a non-freelancer to join first, and lets a freelancer show interest', () => {
    expect(gigViewerAction(JOB, { is_freelancer: false })).toBe('JOIN_AS_FREELANCER');
    expect(gigViewerAction(JOB, null)).toBe('JOIN_AS_FREELANCER');
    expect(gigViewerAction(JOB, { is_freelancer: true })).toBe('INTEREST');
  });
});

describe('role and skill options', () => {
  it('offers the chosen category’s roles, and none for an unknown category', () => {
    expect(gigRoleOptions(CATEGORIES, 'c1')).toEqual(['Photographer', 'Drone Operator']);
    expect(gigRoleOptions(CATEGORIES, 'missing')).toEqual([]);
  });

  it('merges skills across the chosen categories without repeats', () => {
    expect(freelancerSkillOptions(CATEGORIES, ['c1', 'c2'])).toEqual(['Photographer', 'Drone Operator', 'Caterer']);
    expect(freelancerSkillOptions(CATEGORIES, [])).toEqual([]);
  });
});

describe('settledGigFilter', () => {
  it('waits a moment of quiet typing before it queries', () => {
    expect(GIG_FILTER_SETTLE_MS).toBe(350);
  });

  it('queries the typed search and city, keeping the picked category', () => {
    expect(settledGigFilter({ category_id: 'c1' }, 'dj', 'Pune')).toEqual({ category_id: 'c1', search: 'dj', city: 'Pune' });
  });

  it('fires nothing when the boxes already match the filter, empty or filled', () => {
    expect(settledGigFilter({}, '', '')).toBeNull();
    expect(settledGigFilter({ search: 'dj', city: 'Pune' }, 'dj', 'Pune')).toBeNull();
  });

  it('queries when only one box changed', () => {
    expect(settledGigFilter({ search: 'dj', city: 'Pune' }, 'dj', '')).toEqual({ search: 'dj', city: '' });
  });
});

describe('prunedGigRoles', () => {
  it('drops the roles the new category does not offer', () => {
    expect(prunedGigRoles(CATEGORIES, 'c2', ['Photographer', 'Drone Operator'])).toEqual(['Photographer']);
  });

  it('changes nothing while every pick is still on offer', () => {
    expect(prunedGigRoles(CATEGORIES, 'c1', ['Drone Operator'])).toBeNull();
    expect(prunedGigRoles(CATEGORIES, 'c1', [])).toBeNull();
  });

  it('keeps the picks while no category (or an unlisted one) is chosen', () => {
    expect(prunedGigRoles(CATEGORIES, '', ['Caterer'])).toBeNull();
    expect(prunedGigRoles(CATEGORIES, 'switched-off', ['Caterer'])).toBeNull();
  });
});

describe('gigContactLinks', () => {
  it('builds dial, WhatsApp and mail links from a formatted number', () => {
    expect(gigContactLinks({ name: 'A', phone: '+91 98765-43210', email: 'a@b.co' })).toEqual({
      call: 'tel:+919876543210',
      whatsapp: 'https://wa.me/919876543210',
      email: 'mailto:a@b.co',
    });
  });

  it('leaves out a link the contact has no detail for', () => {
    expect(gigContactLinks({ name: 'A', phone: '', email: '' })).toEqual({ call: null, whatsapp: null, email: null });
  });
});

describe('gig post form values', () => {
  it('starts from the account contact and preselects a single poster role', () => {
    const values = emptyGigJobValues(VIEWER);
    expect(values.poster_role).toBe('VENUE_OWNER');
    expect(values.contact_name).toBe('Asha Rao');
    expect(values.contact_phone).toBe('+919876543210');
    expect(values.contact_email).toBe('asha@example.com');
    expect(values.openings).toBe('1');
    expect(values.event_type).toBe('EVENT');
  });

  it('makes the poster choose when they hold several roles, and starts blank with no viewer', () => {
    expect(emptyGigJobValues({ ...VIEWER, poster_roles: ['HOST', 'ECOMM_MANAGER'] }).poster_role).toBe('');
    const blank = emptyGigJobValues();
    expect(blank.poster_role).toBe('');
    expect(blank.contact_name).toBe('');
    expect(blank.contact_phone).toBe('');
    expect(blank.contact_email).toBe('');
  });

  it('round-trips a saved gig through the form into the mutation input', () => {
    const withContact: GigJob = { ...JOB, contact: { name: 'Asha', phone: '+919876543210', email: 'a@b.co' } };
    const values = gigJobToValues(withContact);
    expect(values.event_date).toBe('2026-11-02');
    expect(values.budget).toBe('5000');
    expect(values.openings).toBe('2');
    expect(toGigJobInput(values)).toEqual({
      poster_role: 'VENUE_OWNER',
      category_id: 'c1',
      title: JOB.title,
      description: JOB.description,
      roles: ['Photographer'],
      event_type: 'WORKSHOP',
      event_date: '2026-11-02',
      city: 'Pune',
      location: 'Koregaon Park',
      budget: 5000,
      openings: 2,
      contact_name: 'Asha',
      contact_phone: '+919876543210',
      contact_email: 'a@b.co',
    });
  });

  it('turns a blank budget and date into null, and an unseen contact into blanks', () => {
    const values = gigJobToValues({ ...JOB, budget: null, event_date: null, contact: null });
    expect(values.budget).toBe('');
    expect(values.event_date).toBe('');
    expect(values.contact_phone).toBe('');
    const input = toGigJobInput({ ...values, budget: '  ', title: '  Trimmed  ', contact_phone: ' +91 98765-43210 ' });
    expect(input.contact_phone).toBe('+919876543210');
    expect(input.budget).toBeNull();
    expect(input.event_date).toBeNull();
    expect(input.title).toBe('Trimmed');
  });
});

describe('freelancer form values', () => {
  const PROFILE: FreelancerProfile = {
    id: 'f1',
    display_name: 'Ravi',
    category_ids: ['c1'],
    skills: ['Photographer', 'Drone Operator'],
    city: 'Pune',
    bio: 'Weddings and workshops.',
    portfolio_url: 'https://ravi.example',
    experience_years: 4,
    contact_phone: '+919000000000',
    contact_email: 'ravi@example.com',
    is_available: false,
  };

  it('starts a new profile from the account contact', () => {
    const values = freelancerToValues(null, VIEWER.default_contact);
    expect(values.display_name).toBe('Asha Rao');
    expect(values.contact_phone).toBe('+919876543210');
    expect(values.experience_years).toBe('0');
    expect(values.is_available).toBe(true);
    expect(freelancerToValues(undefined).display_name).toBe('');
  });

  it('loads a saved profile as it was saved', () => {
    const values = freelancerToValues(PROFILE);
    expect(values.experience_years).toBe('4');
    expect(values.is_available).toBe(false);
    expect(values.skills).toEqual(['Photographer', 'Drone Operator']);
  });

  it('drops skills no chosen category offers any more', () => {
    const values = { ...freelancerToValues(PROFILE), category_ids: ['c2'], experience_years: '', contact_phone: '+91 90000 00000' };
    expect(toFreelancerInput(values, CATEGORIES)).toMatchObject({
      contact_phone: '+919000000000',
      category_ids: ['c2'],
      skills: ['Photographer'],
      experience_years: 0,
      is_available: false,
    });
  });
});
