import type { NestedCatalogue } from '../catalogue';

/**
 * The Challenge Portal's own copy.
 *
 * Its leaderboard screens are NOT here — that copy is `shell.leaderboard.*`,
 * because the boards render through shared chrome. This namespace is only the
 * challenges console: the dashboard, the table and the create/edit dialog.
 *
 * The generic button words (Cancel, Save, Delete) come from `shell.common.*`
 * rather than being repeated here (rule 40).
 */
export const CHALLENGE_BUNDLE: NestedCatalogue = {
  challenge: {
    dashboard: {
      title: 'Challenges Dashboard',
      subtitle: 'An overview of challenges across the platform.',
      total: 'Total challenges',
      active: 'Active challenges',
    },

    list: {
      title: 'Challenges',
      create: 'New challenge',
      deleteTitle: 'Delete challenge?',
      // The challenge's name is substituted rather than concatenated, so a
      // language that puts the object before the verb can still say it.
      deleteBody: 'Permanently delete “{name}”. This cannot be undone.',
    },

    table: {
      colName: 'Name',
      colSuperCategory: 'Super category',
      colCategory: 'Category',
      colSubCategory: 'Sub-category',
      empty: 'No challenges yet. Create one with “New challenge”.',
      search: 'Search challenges by name…',
      editAria: 'Edit challenge',
      deleteAria: 'Delete challenge',
    },

    form: {
      titleNew: 'New challenge',
      titleEdit: 'Edit challenge',
      nameLabel: 'Challenge name',
      descriptionLabel: 'Description',
    },
  },
};
