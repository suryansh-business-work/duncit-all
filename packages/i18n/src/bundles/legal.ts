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
      colSigning: 'Signing',
      counterparty: 'Counterparty',
      counterpartyHint: 'Who the contract is with',
      effectiveFrom: 'Effective from',
      effectiveTo: 'Effective to',
      add: 'Add Contract',
      created: 'Contract created',
      updated: 'Contract updated',
      archived: 'Contract archived',
      alreadyArchived: 'Already archived',
      search: 'Search contract ID, title or counterparty',
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
      search: 'Search document ID, name, type or description',
      // Switching a document off hides it without deleting it — and works on a
      // signed one, because a signature locks the wording, not the shelf.
      activeHint: 'Off hides this document from the app. Nothing is deleted, and a signed document can still be taken down.',
      activated: 'Document is now active',
      deactivated: 'Document is now inactive',
    },

    /**
     * The signing workflow — one set of copy for documents AND contracts,
     * because one dialog now drives both (rule 40). A word that named only one
     * of them would be wrong on the other half of the screens that render it.
     */
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

      signed: 'Signed',
      unsigned: 'Unsigned',
      untitled: 'Untitled',
      action: 'Sign',
      viewSigned: 'View the signed copy',
      locked: 'Signed — locked to edits',
      allRequired:
        'Every field is required — a signature without a name, a role and a date is not evidence of anything.',
      noInlinePdf: 'Your browser cannot display PDFs inline. Download it to read it.',
      viewerHint: 'Use the viewer’s own controls to zoom and move between pages.',
      lockedNotice: 'This is signed and locked. It can no longer be edited.',
      shareHeading: 'Send it on',
      sharePlaceholder: 'name@company.com',
      sending: 'Sending…',
      sendEmail: 'Email',
      sentTo: 'Sent to {email}',
      downloadSigned: 'Download the signed copy',
      downloadUnsigned: 'Download the draft',
      toSignature: 'Signature',
      back: 'Back',
      signing: 'Signing…',
      signAction: 'Sign it',
      signedToast: 'Signed',
      noMethods:
        'Every signing method is switched off for this platform. An admin can turn one back on from the feature flags.',
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
      colVersions: 'Wordings',
      active: 'Active (visible in app)',
      hidden: 'Hidden',
      create: 'New Policy',
      createTitle: 'New policy',
      editTitle: 'Edit · {title}',
      created: 'Policy created',
      updated: 'Policy updated',
      deleted: 'Policy deleted',
      deleteMessage: 'This permanently deletes “{title}”, its wording history and nothing else. The acceptance records stay.',
      search: 'Search policy ID, title or slug',

      // Telling everyone who already accepted that the wording changed. A tick,
      // never automatic: a typo fix in a heading is not a reason to write to
      // everybody who has ever signed up.
      notify: {
        label: 'Email everyone who has accepted this policy',
        hint: 'Sends only if the content actually changes. A title or sort-order edit sends nothing.',
        recipients: 'This would reach {people} people who have accepted it.',
        recipientsNone: 'Nobody has accepted this policy yet, so there is nobody to tell.',
        recipientsLoading: 'Counting who has accepted it…',
        summaryLabel: 'What changed (optional)',
        summaryHint: 'Shown in the email above the link. Leave it blank to send the notice on its own.',
        lastSent: 'Last sent {when} to {people} people.',
        neverSent: 'No change notice has been sent for this policy.',
        sendNow: 'Send the notice now',
        sendNowHint:
          'Sends the same email without editing anything — for when the decision to tell people comes afterwards.',
        sendTitle: 'Send the change notice?',
        sendMessage:
          'This emails everyone who has accepted “{title}” that its wording has changed. It cannot be unsent.',
        sent: 'Notice sent to {people} people.',
        sentNone: 'Nobody has accepted this policy yet, so no notice was sent.',
      },

      // Every wording a policy has had. Written before each edit is applied, so
      // the acceptance log can be read back to the exact words behind its hash.
      versions: {
        action: 'History',
        title: 'Wording history · {title}',
        subtitle:
          'Every wording this policy has had, newest first. A snapshot is taken before each edit, so an acceptance can always be read back to the words behind it.',
        empty: 'No wording history yet — this is the original.',
        versionLabel: 'Version {no}',
        current: 'In force now',
        by: 'Edited by {name}',
        unknownEditor: 'Editor not recorded',
        read: 'Read',
        contentEmpty: 'This version has no content.',
        loadFailed: 'Could not load the wording history.',
      },
    },
  },
};
