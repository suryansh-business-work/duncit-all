import type { NestedCatalogue } from '../catalogue';

/**
 * Copy for the shared club form.
 *
 * Its own namespace rather than a host surface's, because the package renders
 * inside more than one build and a second copy of these sentences is exactly
 * the drift rule 40 exists to stop.
 */
export const CLUB_FORM_BUNDLE: NestedCatalogue = {
  clubForm: {
    adminsSection: {
      assignClubAdmin: 'Assign Club Admin',
      searchClubAdminUsers: 'Search Club Admin users…',
    },
    basicSection: {
      clubName: 'Club name',
      // The Category and Location cascades. mWeb and the Partners console draw
      // them with @duncit/category + @duncit/location; the native app draws the
      // same two picks with Tamagui controls, so the copy is held once here
      // rather than twice (rules 27 + 38). The level labels match the pickers'
      // own defaults so a club reads identically on every surface.
      category: 'Category',
      categoryHint:
        'Venues auto-match to this club by location + category — pick the same Super & Sub the venues sit under.',
      superCategory: 'Super Category',
      categoryLevel: 'Category',
      subCategory: 'Sub Category',
      superFirst: 'Pick a Super Category first.',
      location: 'Location',
      locationHint: 'Approved venues here in the same category auto-link to this club.',
      city: 'City',
      cityAria: 'City: {city}',
      cityPlaceholder: 'Choose a city',
      changeCity: 'Change',
      locality: 'Locality',
      anyLocality: 'Any area',
      noLocalities: 'This city has no areas yet.',
    },
    clubSections: {
      basicInformation: 'Basic Information',
      mediaAndMoments: 'Media & Moments',
      pageContentWhoWeArePerks: 'Page Content (Who We Are, Perks, FAQs…)',
      venuesAndCommunityLinks: 'Venues & Community Links',
    },
    common: {
      cancel: 'Cancel',
      clubAdmin: 'Club Admin',
      clubMoments: 'Club moments',
      description: 'Description',
      perks: 'Perks',
    },
    contentSection: {
      benefitsMembersGetAddAtLeast: 'Benefits members get — add at least one.',
      theActivitiesExperiencesTheClubRuns: 'The activities/experiences the club runs — add at least one.',
      values: 'Values',
      whatTheClubStandsForAdd: 'What the club stands for — add at least one.',
      whatWeDo: 'What We Do',
      whoWeAre: 'Who We Are',
    },
    faqListField: {
      answer: 'Answer',
    },
    linksSection: {
      autoMatchedVenues: 'Auto-matched venues',
      findingMatchingVenues: 'Finding matching venues…',
      location: 'Location',
      whatsappCommunityLink: 'WhatsApp Community link',
      whatsappGroupLink: 'WhatsApp Group link',
      whatsappAnnouncementLink: 'WhatsApp Announcement link',
      whatsappAnnouncementHint:
        'Optional — the announcements-only channel, if this club runs one separately from its group.',
    },
    // Hosts an admin links to the club by hand.
    linkedHosts: {
      title: 'Linked hosts',
      label: 'Hosts linked to this club',
      placeholder: 'Search approved hosts',
      hint: 'Optional. Leave this empty and the club page lists the hosts of its own pods instead — which is usually what you want.',
    },
    mediaField: {
      addImage: 'Add image',
    },
    mediaRow: {
      moveDown: 'Move down',
      moveUp: 'Move up',
      remove: 'Remove',
      replace: 'Replace',
    },
    mediaSection: {
      coverHeaderMediaShownOnThe: 'Cover/header media shown on the club page — at least one image is required.',
      featureImagesAndVideos: 'Feature images & videos',
      pastEventPhotos: 'Past event photos.',
    },
    preview: {
      community: 'Community',
      communityLink: 'Community link',
      groupLink: 'Group link',
      inTheClubsList: 'In the clubs list',
      memberPreview: 'Member preview',
      onTheClubPage: 'On the club page',
      ourValues: 'Our values',
      whatWeDo: 'What we do',
      whoWeAre: 'Who we are',
    },
  },
};
