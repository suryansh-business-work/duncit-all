import type { NestedCatalogue } from '../catalogue';

/**
 * The four directory consoles — venues, clubs, club admins, hosts.
 *
 * ONE bundle rather than four, because the four consoles are the same screen
 * over a different entity: a brief of how many there are and where they stand,
 * then a list, then a row's full detail. Four namespaces would be four copies
 * of "Awaiting review" drifting apart one console at a time (rule 34), and a
 * fifth entity would then be a fifth bundle instead of one more `entity` block.
 *
 * `directory.common.*` is what every console says; `directory.<entity>.*` is
 * only what is genuinely specific to that one.
 */
export const DIRECTORY_BUNDLE: NestedCatalogue = {
  directory: {
    common: {
      total: 'Total',
      active: 'Active',
      inactive: 'Inactive',
      approved: 'Approved',
      awaitingReview: 'Awaiting review',
      declined: 'Declined',
      verified: 'Verified',
      // Every tile is a way in, so the hint says so rather than restating the
      // number the tile already shows.
      openList: 'Open the list',
      openFiltered: 'Open the list, filtered to these',
    },
    venues: {
      title: 'Venues',
      subtitle: 'Every venue Duncit works with — an application awaiting review and a live space taking bookings sit in one list.',
      dashboardTitle: 'Venues at a glance',
    },
    clubs: {
      title: 'Clubs',
      subtitle: 'Every club on Duncit — its admins, its pods, its media and its content.',
      dashboardTitle: 'Clubs at a glance',
    },
    clubAdmins: {
      title: 'Club Admins',
      subtitle: 'Every club admin on Duncit — the clubs they run and the commission they are on.',
      dashboardTitle: 'Club admins at a glance',
      // The detail page a row opens.
      eyebrow: 'Club Admin',
      unnamed: 'Unnamed club admin',
      backToList: 'Back to club admins',
      notFound: 'Club admin not found.',
      contact: 'Contact',
      email: 'Email',
      phone: 'Phone',
      category: 'Category',
      commission: 'Commission',
      commissionDefault: 'Platform default',
      assignedClubs: 'Clubs they run',
      noClubsAssigned: 'No clubs assigned yet — assign them from Review on the list.',
      onboardingRecord: 'Onboarding record',
      clubAdminId: 'Club Admin ID',
      requestNo: 'Meeting request',
      joinedAt: 'Joined',
      reviewerNotes: 'Reviewer notes',
    },
    hosts: {
      title: 'Hosts',
      subtitle: 'Every host on Duncit — an application awaiting review and a host already running pods sit in one list.',
      dashboardTitle: 'Hosts at a glance',
    },
  },
};
