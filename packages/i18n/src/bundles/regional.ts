import type { NestedCatalogue } from '../catalogue';

/**
 * The Regional Club Admin console's copy.
 *
 * It used to live inside PARTNERS_BUNDLE, because the console was a section of
 * the Partners app. The console is its own portal now
 * (regional-club-admin.duncit.com), so its copy ships with it — a surface
 * shipping the slice it renders is the whole of rule 38.
 *
 * The KEYS deliberately keep the `partners.regional.*` prefix they were seeded
 * with. Admin > Localization never overwrites an existing translation, so a
 * rename would silently orphan every language already filled in and quietly
 * fall back to English. The prefix is also still honest: a Regional Club Admin
 * is a partner-facing appointment, on the partner side of the platform.
 */
export const REGIONAL_BUNDLE: NestedCatalogue = {
  partners: {
    regional: {
      structureTitle: 'Region Structure',
      structureSubtitle:
        'Your whole region on one canvas — every city, locality, Club Admin and Host under you.',
      clubAdminsTitle: 'Club Admins',
      clubAdminsSubtitle:
        'The one thing a region stores. Everything the canvas draws below a Club Admin follows from the clubs they already run.',

      // The five levels, in hierarchy order.
      kindRegion: 'Region',
      kindCity: 'City',
      kindLocality: 'Locality',
      kindClubAdmin: 'Club Admin',
      kindHost: 'Host',

      clickHostHint: 'Click a Host to see the pods they run in this region.',
      emptyRegion:
        'No Club Admins in your region yet. Add one from the Club Admins page and the canvas fills in from the clubs they run.',

      // The canvas controls.
      loadingRegion: 'Drawing your region…',
      searchCanvas: 'Search the canvas',
      searchCanvasHint: 'Type a name, a city or a locality — matches stay lit, the rest dims.',
      matchCount: '{count} of {total} boxes match',
      noCanvasMatch: 'Nothing on the canvas matches that search.',
      layout: 'Layout',
      layoutHorizontal: 'Horizontal',
      layoutVertical: 'Vertical',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      fitView: 'Fit the whole region',
      fullScreen: 'Full screen',
      exitFullScreen: 'Exit full screen',
      resetView: 'Reset the view',
      clearSearch: 'Clear search',

      // The host pods drawer.
      hostPodsSubtitle: 'Pods this host runs inside your region.',
      pod: 'Pod',
      when: 'When',
      club: 'Club',
      price: 'Price',
      spots: 'Spots',
      podLive: 'Live',
      podOff: 'Off',
      noPodsForHost: 'This host has no pods in your region yet.',
      searchPods: 'Search pod name or id',
      openPodHint: 'Click a pod to open its full detail.',

      // Managing the region's Club Admins.
      regionName: 'Region name',
      memberCount: '{count} Club Admin(s)',
      clubAdmin: 'Club Admin',
      clubs: 'Clubs',
      clubCount: 'Clubs',
      noClubsYet: 'No clubs assigned yet',
      noMembersYet: 'No Club Admins in this region yet.',
      searchMembers: 'Search name, email or club',
      addClubAdmin: 'Add Club Admin',
      add: 'Add',
      remove: 'Remove',
      removeFromRegion: 'Remove from region',
      removeConfirm:
        '{name} will leave this region. Their clubs, hosts and pods are untouched — only your view of them changes.',
      searchClubAdmins: 'Search Club Admins',
      candidateHint: 'Only Club Admins who are not already in a region are offered.',
      noClubAdminsFound: 'No Club Admin matches that search.',

      // The Club Admin -> Clubs -> Pods -> one pod drill-down.
      drillHint: 'Click a Club Admin to open their clubs, then a club to open its pods.',
      clubsOfSubtitle: 'The clubs this Club Admin runs in your region.',
      podsOfSubtitle: 'Every pod this club has held.',
      clubNameColumn: 'Club',
      cityColumn: 'City',
      localityColumn: 'Locality',
      podCountColumn: 'Pods',
      clubLive: 'Active',
      clubOff: 'Inactive',
      noClubsForAdmin: 'This Club Admin runs no clubs yet.',
      noPodsForClub: 'This club has no pods yet.',
      searchClubs: 'Search club name, id, city or locality',
      backToClubAdmins: 'Club Admins',
    },
  },
};
