import type { NestedCatalogue } from '../catalogue';

/**
 * The shared ad-request form's copy — @duncit/ad-request-form, rendered by the
 * Ads portal's Create Ad page and by the Partners console's "Run ad" dialog.
 *
 * A namespace of its own rather than `ads.*` (the Ads portal's) because the
 * Partners console ships it too and does not carry that bundle; the package
 * layers this one over whatever the host surface mounted (rule 40).
 *
 * The ad's OWN content — its title, its description — is never here: an
 * advertiser wrote those.
 */
export const AD_REQUEST_BUNDLE: NestedCatalogue = {
  adRequest: {
    form: {
      submit: 'Submit Ad Request',
      title: 'Ad Title',
      titleHint: '3–120 characters',
      description: 'Ad Description',
      descriptionHint: 'What the ad promotes (10–1000 characters)',
      type: 'Ad Type',
      typeHint: 'Changing the type clears the uploaded media',
      position: 'Ad Position',
      positionHint: 'Auto shows the ad across every placement',
      startDate: 'Ad Start Date',
      startDateHint: 'Today or later',
      duration: 'Ad Duration: {days} ({from} – {to})',
      redirectUrl: 'Redirect URL',
      redirectUrlHint: 'Optional — where the ad opens; must be an http(s) link',
      targetAudience: 'Target Audience',
      targetAudienceHint: 'Optional — describe who the ad should reach',
    },
    /** The creative upload field. */
    media: {
      label: 'Ad Media',
      previewAlt: 'Ad media preview',
      uploadImage: 'Upload image',
      uploadVideo: 'Upload video',
      replaceImage: 'Replace image',
      replaceVideo: 'Replace video',
      chooseImage: 'Choose ad image',
      chooseVideo: 'Choose ad video',
      hintImage: 'Upload the ad image',
      hintVideo: 'Upload the ad video (up to 100MB)',
    },
    /** The live estimate beside the form. */
    estimate: {
      title: 'Estimated Cost',
      perDay: '{position} · per day',
      duration: 'Duration',
      total: 'Total estimate',
      footnote:
        'The final cost is confirmed by the Marketing team when your request is approved.',
    },
    /**
     * Day counts in the words a person would use. The slider marks and the
     * sentence above them derive their wording from the number, so a 90-day
     * window reads "3 months" without anyone editing a constant.
     */
    days: {
      one: '{count} day',
      other: '{count} days',
    },
    weeks: {
      one: '{count} week',
      other: '{count} weeks',
    },
    months: {
      one: '{count} month',
      other: '{count} months',
    },
    /** Validation. */
    errors: {
      typeRequired: 'Ad type is required',
      mediaRequired: 'Upload the ad media',
      positionRequired: 'Ad position is required',
      startRequired: 'Ad start date is required',
      startInvalid: 'Ad start date must be a valid date',
      startPast: 'Ad start date must be today or later',
      durationNumber: 'Ad duration must be a number of days',
      durationWhole: 'Ad duration must be whole days',
      durationMin: 'Ad duration must be at least 1 day',
      durationMax: 'Ad duration can be at most {max}',
      redirectInvalid: 'Redirect URL must be a valid http(s) link',
    },
    /** Domain vocabulary — placements, creative types and review states. */
    type: {
      image: 'Image',
      video: 'Video',
    },
    position: {
      auto: 'Auto (all placements)',
      homeBottom: 'Home Bottom',
      sidebar: 'Sidebar',
      exploreScroll: 'Explore Scroll',
      status: 'Status',
      venueList: 'Venue List',
      clubList: 'Club List',
      podList: 'Pod List',
      podDetails: 'Pod Details',
    },
    status: {
      pending: 'Pending',
      approved: 'Approved',
      live: 'Live',
      rejected: 'Rejected',
      expired: 'Expired',
    },
  },
};
