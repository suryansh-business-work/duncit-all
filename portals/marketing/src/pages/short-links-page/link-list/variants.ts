/**
 * Only the links that land off our own properties.
 *
 * A boolean column filters with is_true rather than a value, and it is PINNED
 * on the external list rather than offered in the toolbar: that page IS the
 * external list, and a filter a reader could clear would quietly turn it into
 * the Short Links page under a different name.
 */
const EXTERNAL_ONLY = [{ field: 'is_external', op: 'is_true' as const }];

export type LinkListVariant = 'ALL' | 'EXTERNAL';

export interface VariantConfig {
  basePath: string;
  tableId: string;
  testId: string;
  /** Which links the server is asked for. Undefined means every link. */
  extraFilters?: typeof EXTERNAL_ONLY;
  /** The destination column only earns its width where destinations differ. */
  showDestination: boolean;
  /** Validate and describe the create form's destination as a non-Duncit URL. */
  external: boolean;
  keys: {
    label: string;
    empty: string;
    create: string;
    deleteTitle: string;
    deleteMessage: string;
    deleted: string;
    couldNotDelete: string;
  };
}

/**
 * The two lists are the same table over the same rows — one scoped to the
 * links that leave Duncit. Everything that differs between them is here, as
 * data, because a second component is where the two would start disagreeing
 * about what deleting a link costs (rule 40).
 */
export const VARIANTS: Record<LinkListVariant, VariantConfig> = {
  ALL: {
    basePath: '/short-links',
    tableId: 'marketing-short-links',
    testId: 'short-links-new',
    showDestination: false,
    external: false,
    keys: {
      label: 'shell.nav.shortLinks',
      empty: 'marketing.shortLinks.noShortLinksYetCreateOne',
      create: 'marketing.shortLinks.newShortLink',
      deleteTitle: 'marketing.shortLinks.deleteThisShortLink',
      deleteMessage: 'marketing.shortLinks.deleteMessage',
      deleted: 'marketing.shortLinks.deleted',
      couldNotDelete: 'marketing.shortLinks.couldNotDelete',
    },
  },
  EXTERNAL: {
    basePath: '/external-links',
    tableId: 'marketing-external-links',
    testId: 'external-links-new',
    extraFilters: EXTERNAL_ONLY,
    showDestination: true,
    external: true,
    keys: {
      label: 'marketing.externalLinks.title',
      empty: 'marketing.externalLinks.noLinksYet',
      create: 'marketing.externalLinks.newLink',
      deleteTitle: 'marketing.externalLinks.deleteTitle',
      deleteMessage: 'marketing.externalLinks.deleteMessage',
      deleted: 'marketing.externalLinks.deleted',
      couldNotDelete: 'marketing.externalLinks.couldNotDelete',
    },
  },
};
