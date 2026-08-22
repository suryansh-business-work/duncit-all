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
