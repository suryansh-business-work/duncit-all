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
