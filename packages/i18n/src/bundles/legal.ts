import type { NestedCatalogue } from '../catalogue';

/**
 * The Legal console's own copy — contracts, versioned documents, published
 * policies, and the grievance desk.
 *
 * NOT here: `policyAcceptance.*` and `contentReport.*`, which this portal also
 * renders. Both are shared with mWeb, native and the websites, so they keep
 * namespaces of their own rather than being duplicated into this one.
 *
 * The generic labels (Name, Email, Phone, Status, Actions, Created, Title,
 * Description, Updated, View, Edit, Close, Cancel, Delete) come from
 * `shell.common.*` — every console lists them (rule 40).
 *
 * A contract's own text, a policy's body and what a person wrote in a grievance
 * are never keyed: that is the record, and translating it would misstate it.
 */
export const LEGAL_BUNDLE: NestedCatalogue = {
  legal: {
    docTypeSelect: {
      label: 'Document Type',
      search: 'Search document type…',
    },
    policyTypeSelect: {
      label: 'Policy Type',
      search: 'Search policy type…',
    },

    signature: {
      typeYours: 'Type your signature',
      typedPreview: 'Typed signature preview',
      uploadedPreview: 'Uploaded signature preview',
      uploadHint: 'Upload an image file.',
      tooLarge: 'That image is over 5 MB. Choose a smaller one.',
      unreadable: 'That image could not be read.',
    },

    dashboard: {
      title: 'Legal Dashboard',
      subtitle: 'An overview of your legal documents and policies by type.',
      totalDocuments: 'Total documents',
      totalPolicies: 'Total policies',
      policiesHint: 'View, manage, and publish platform policies.',
      documentsByType: 'Documents by type',
      policiesByType: 'Policies by type',
      documentType: 'Document type',
      policyType: 'Policy type',
      count: 'Count',
      emptyDocuments: 'No documents yet. Create one from the Documents section.',
      emptyPolicies: 'No policies yet. Create one from the Policies section.',
    },

    contracts: {
      title: 'Contracts',
      subtitle:
        'Manage all legal contracts in one place. Create, organize, and maintain contracts efficiently.',
      empty: 'No contracts yet. Add one to get started.',
      archiveTitle: 'Archive contract?',
      archive: 'Archive',
      archiveMessage:
        '“{title}” moves to Archived. It stays in the table and keeps its Contract ID — nothing is deleted.',
      titleRequired: 'Title is required',
      colId: 'Contract ID',
      colCounterparty: 'Counterparty',
      colLastUpdated: 'Last updated',
      counterparty: 'Counterparty',
      counterpartyHint: 'Who the contract is with',
      effectiveFrom: 'Effective from',
      effectiveTo: 'Effective to',
    },

    documents: {
      title: 'Documents',
      subtitle: 'Create, version and manage legal documents.',
      empty: 'No documents yet.',
      create: 'New Document',
      documentName: 'Document name',
      colId: 'Document ID',
      colName: 'Name',
      colType: 'Type',
      colActive: 'Active',
      colUpdatedBy: 'Updated by',
      colVersions: 'Versions',
      colLastUpdated: 'Last updated',
      saved: 'Saved',
      noContent: 'No content yet.',
      print: 'Print',
      download: 'Download',
      clone: 'Clone',
      sign: 'Sign',
      deleteTitle: 'Delete document?',
      saveFailed: 'Could not save the document.',
      titleRequired: 'Title is required.',
    },

    sign: {
      fullName: 'Full name',
      designation: 'Designation',
      initials: 'Initials',
      signingDate: 'Signing date',
      signingDateHint: 'Set by the server when you sign',
      stepPreview: 'Preview',
      stepSignature: 'Signature',
      stepDone: 'Done',
      sendTo: 'Send to',
      message: 'Message (optional)',
    },

    grievance: {
      infoTitle: 'Grievance Info',
      infoSubtitle:
        'The Grievance Officer we publish. These details appear in the app, on the website and in every grievance acknowledgement.',
      ticketsTitle: 'Grievance Tickets',
      ticketsSubtitle:
        'Every grievance raised from the app, the website and this portal — each with its own reference number.',
      empty: 'No grievances raised yet.',
      colId: 'Grievance ID',
      colSubject: 'Subject',
      colSource: 'Source',
      colReceived: 'Received',
      open: 'Open',
      closed: 'Closed',
      handledBy: 'Handled by',
      address: 'Address',
      resolutionNote: 'Resolution note',
      resolutionHint: 'Internal — what was done about this grievance.',
      // Where the grievance came from. Kept as copy rather than the raw enum,
      // because the column is read by a person, not matched by the server.
      sourceApp: 'App',
      sourceWebsite: 'Website',
      sourcePortal: 'Portal',
      sourceEmail: 'Email',
      officerNamePlaceholder: 'e.g. Priya Sharma',
    },

    policies: {
      title: 'Policies',
      subtitle: 'Website & app policies — managed in one place.',
      empty: 'No policies yet.',
      deleteTitle: 'Delete policy?',
      titleRequired: 'Title is required',
      slugRequired: 'Slug is required',
      colId: 'Policy ID',
      colSlug: 'Slug',
      colPolicyType: 'Policy type',
      colSort: 'Sort',
      slug: 'Slug',
      slugHint: 'lowercase letters, numbers and dashes',
      sortOrder: 'Sort order',
      content: 'Content',
    },
  },
};
