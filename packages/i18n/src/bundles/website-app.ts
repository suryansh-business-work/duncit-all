import type { NestedCatalogue } from '../catalogue';

/**
 * The Website console's own copy — what the team editing duncit.com reads:
 * the content entries, the site navigation, and the four submission inboxes
 * (contact, FAQ, job applications, newsletter).
 *
 * The generic column headings (Name, Email, Status, Actions, Created, Order)
 * come from `shell.common.*` rather than being repeated here — they carry no
 * context of their own, and every console lists them (rule 40).
 *
 * What people actually submitted stays untouched: a question, a subject line,
 * a résumé link. That is their words, not ours.
 */
export const WEBSITE_APP_BUNDLE: NestedCatalogue = {
  websiteApp: {
    dashboard: {
      subtitle: 'A live overview of the content and submissions across duncit.com.',
      career: 'Career',
      newsroom: 'Newsroom',
      blog: 'Blog',
      newsletter: 'Newsletter',
      contact: 'Contact',
      hintPosts: 'Published & draft posts',
      hintEntries: 'Published & draft entries',
      hintArticles: 'Published & draft articles',
      hintActive: '{count} active',
      hintNew: '{count} new',
    },

    contact: {
      empty: 'No submissions.',
      colSubject: 'Subject',
      noSubject: '(no subject)',
      colReceived: 'Received',
    },

    content: {
      empty: 'No entries yet.',
      colEntry: 'Entry',
      colCategory: 'Category',
      colPublished: 'Published',
      deleteTitle: 'Delete entry',
      deleteMessage: 'Delete “{title}”?',
    },

    form: {
      title: 'Title',
      sortOrder: 'Sort order',
      slug: 'Slug',
      category: 'Category / Team',
      publishedAt: 'Published at',
      summary: 'Summary',
      body: 'Body',
      image: 'Image',
      ctaLabel: 'CTA label',
      ctaUrl: 'CTA URL',
      published: 'Published',
    },

    jobs: {
      empty: 'No applications.',
      colRole: 'Role',
      colReceived: 'Received',
      resume: 'Resume',
      portfolio: 'Portfolio',
      note: 'Note',
    },

    navigation: {
      empty: 'No links for this site yet.',
      deleteTitle: 'Delete this link?',
      colArea: 'Area',
      colGroup: 'Group',
      colLabel: 'Label',
      groupHeading: 'Group / column heading',
      label: 'Label',
      url: 'URL',
      sortOrder: 'Sort order',
      active: 'Active',
    },

    reels: {
      title: 'Reel Slider',
      subtitle:
        'Reels play muted and looping in a 3D slider under the footer of each home page. Edits reach the site within a minute.',
      add: 'Add reel',
      empty: 'No reels for this site yet.',
      colReel: 'Reel',
      colTitle: 'Title',
      colSize: 'Size',
      visible: 'Showing',
      hidden: 'Hidden',
      preview: 'Preview of {title}',
      untitled: 'Untitled reel',
      deleteTitle: 'Delete this reel?',
      deleteText: '"{title}" will disappear from the slider.',
      dialogAdd: 'Add reel',
      dialogEdit: 'Edit reel',
      fieldTitle: 'Title',
      fieldTitleHint: 'Shown on the reel. Optional, up to 80 characters.',
      fieldDescription: 'Description',
      fieldDescriptionHint: 'One or two lines under the title. Optional, up to 240 characters.',
      fieldVideo: 'Reel video',
      fieldSortOrder: 'Sort order',
      fieldSortOrderHint: 'Lower plays first',
      fieldActive: 'Show on the website',
      choose: 'Choose video',
      replace: 'Replace video',
      uploading: 'Uploading… {pct}%',
      uploaded: 'Video uploaded ({size} MB)',
      sizeHint: 'A vertical video, up to {max} MB.',
      tooLarge: 'This video is {size} MB. The limit is {max} MB.',
      notVideo: 'Choose a video file.',
      uploadFailed: 'The upload did not go through. Try again.',
      saveFailed: 'The reel could not be saved. Try again.',
      deleteFailed: 'The reel could not be deleted. Try again.',
      errVideo: 'Upload a reel first',
      errTitleMax: 'Up to 80 characters',
      errDescriptionMax: 'Up to 240 characters',
      errSortOrder: 'Use a whole number, 0 or more',
      settings: {
        title: 'Reel Slider Settings',
        subtitle: 'Limits shared by the reel sliders on every Duncit website.',
        maxReelMb: 'Max reel size (MB)',
        maxReelMbHint: 'Checked in the browser before an upload starts. {min} to {max} MB.',
        maxReels: 'Max reels per website',
        maxReelsHint: 'How many reels one slider shows. {min} to {max}.',
        errRange: 'Enter a whole number from {min} to {max}',
        saved: 'Reel Slider settings saved.',
        saveFailed: 'The settings could not be saved. Try again.',
        loadFailed: 'The settings could not be loaded.',
      },
    },

    newsletter: {
      empty: 'No subscribers yet.',
      colSource: 'Source',
      colSubscribed: 'Subscribed',
      colUnsubscribed: 'Unsubscribed',
      statTotal: 'Total',
      statActive: 'Active',
    },
  },
};
