import type { NestedCatalogue } from '../catalogue';

/** Chrome rendered by the portal shell, shared by every MUI portal. */
export const SHELL_BUNDLE: NestedCatalogue = {
  mweb: {
    common: {
      language: 'Language',
      languageSaved: 'Language updated',
    },
  },
  shell: {
    /**
     * The action words every console repeats — Cancel, Save, Delete and the
     * "…ing" line each one shows while it waits.
     *
     * They live in the SHELL bundle rather than in each portal's namespace
     * because the shell ships to all of them: a portal gets these without
     * passing an `i18nFallback` at all, and one translator decision applies
     * everywhere instead of 26 rows saying "Cancel" that can each be worded
     * differently (rule 40).
     *
     * Only genuinely generic words belong here. Anything that names what is
     * being saved or deleted is that portal's copy, not this.
     */
    common: {
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      saving: 'Saving…',
      delete: 'Delete',
      deleting: 'Deleting…',
      saved: 'Saved',
      deleted: 'Deleted',
      close: 'Close',
      view: 'View',
      edit: 'Edit',
      copy: 'Copy',

      // Column headings a console repeats table after table. Only the ones
      // that carry no context of their own live here — anything that names
      // WHAT is being listed belongs to that portal.
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      status: 'Status',
      actions: 'Actions',
      created: 'Created',
      order: 'Order',
      title: 'Title',
      description: 'Description',
      updated: 'Updated',
      type: 'Type',
      // Whether a record is switched on. Generic on purpose: Legal, Products
      // and Partners all render the same two words against a boolean, and one
      // translator decision should cover every one of them (rule 40).
      active: 'Active',
      inactive: 'Inactive',
    },

    /**
     * @duncit/table's own chrome — the toolbar, the column menu, the filter
     * popover and the two default column headers its factories produce.
     *
     * It sits in the SHELL bundle rather than in a namespace of its own
     * because the table is portal-only and every portal already ships the
     * shell: one translator decision covers all seventeen consoles instead of
     * seventeen rows saying 'Export CSV' (rule 40).
     */
    table: {
      search: 'Search…',
      clearSearch: 'Clear search',
      filters: 'Filters',
      columns: 'Columns',
      resetColumns: 'Reset columns',
      exportCsv: 'Export CSV',
      refresh: 'Refresh',
      densityStandard: 'Standard density',
      densityCompact: 'Compact density',
      empty: 'No rows to display',
      selectRow: 'Select row',
      selectAllRows: 'Select every row on this page',
      // The filter popover. `any` is the unset option of a select filter;
      // `yes`/`no` are how a boolean column reads in a chip and a dropdown.
      any: 'Any',
      yes: 'Yes',
      no: 'No',
      clearAll: 'Clear all',
      apply: 'Apply',
      rangeMin: '{label} min',
      rangeMax: '{label} max',
      rangeFrom: '{label} from',
      rangeTo: '{label} to',
      opContains: 'contains',
    },

    /** The layout's own copy — read by assistive technology rather than seen,
     * which is exactly why it was still English in all 26 consoles. */
    /** The welcome dashboard every console opens on. */
    welcome: {
      greeting: 'Welcome back, {name}',
      modulesHeading: '{name} modules',
      comingSoon: 'Coming soon',
    },

    /**
     * Each console's own sentences on its login screen — the tagline under
     * the card and the promo beside it.
     *
     * Keyed by portal here rather than in 16 separate namespaces because the
     * login screen is shell chrome: a portal reaches these through
     * AppConfig.taglineKey / promoTitleKey / promoTextKey with no
     * i18nFallback of its own.
     */
    portal: {
      admin: {
        tagline: 'Operate the Duncit platform — one place.',
        promoTitle: 'One unified portal',
        promoText: 'Every team, every metric — one place. Sign in and get moving.',
      },
      adsPortal: {
        tagline: 'Plan campaigns, manage creatives and track ad performance.',
        promoTitle: 'Campaigns that convert',
        promoText: 'Plan, launch and measure ad campaigns from one console.',
      },
      ai: {
        tagline: 'Operate AI tools and model configuration.',
        promoTitle: 'Intelligence on tap',
        promoText: 'Models, prompts and AI tooling in one workspace.',
      },
      challengePortal: {
        tagline: 'Create and manage challenges across categories.',
        promoTitle: 'Challenges, organized',
        promoText: 'Build challenges scoped by super, category and sub-category — all in one place.',
      },
      crm: {
        tagline: 'Capture, qualify and convert venue and host leads.',
        promoTitle: 'Know every customer',
        promoText: 'Leads, contacts and conversations — unified. Sign in to dive in.',
      },
      developers: {
        tagline: 'API keys and venue APIs — availability, slots and bookings.',
        promoTitle: 'Build on Duncit',
        promoText: 'Generate API keys and integrate venue discovery, slot availability and slot booking into your own products.',
      },
      employee: {
        tagline: 'Your profile, requests and workplace tools.',
        promoTitle: 'Your workday, simpler',
        promoText: 'Profile, payslips and requests in one place.',
      },
      finance: {
        tagline: 'Track payouts, invoices and financial reconciliation.',
        promoTitle: 'Numbers, clarified',
        promoText: 'Payouts, invoices and reconciliation — all in one place.',
      },
      hr: {
        tagline: 'Manage people, attendance and HR operations.',
        promoTitle: 'People, organised',
        promoText: 'Directory, leave and HR operations in one console.',
      },
      legal: {
        tagline: 'Manage contracts, policies and compliance.',
        promoTitle: 'Compliance, organized',
        promoText: 'Policies, agreements and legal records — one place.',
      },
      marketing: {
        tagline: 'Plan campaigns and brand content.',
        promoTitle: 'Reach, amplified',
        promoText: 'Campaigns, notifications and audiences — one place.',
      },
      onboarding: {
        tagline: 'Manage onboarding journeys, verification and approvals.',
        promoTitle: 'Onboard with ease',
        promoText: 'Welcome, verify and activate new members and partners.',
      },
      products: {
        tagline: 'Manage the product catalog and roadmap.',
        promoTitle: 'Build what matters',
        promoText: 'Catalog, inventory and roadmap from one console.',
      },
      support: {
        tagline: 'Handle customer tickets and support conversations.',
        promoTitle: 'One unified desk',
        promoText: 'Every ticket, every conversation — one place. Sign in and get moving.',
      },
      tech: {
        tagline: 'Manage platform configuration and environment variables.',
        promoTitle: 'Ship with control',
        promoText: 'Environment, feature flags and platform config in one console.',
      },
      websiteApp: {
        tagline: 'Manage website content, pages and publishing.',
        promoTitle: 'Your site, managed',
        promoText: 'Publish content, careers and updates from one place.',
      },
    },

    chrome: {
      skipToContent: 'Skip to main content',
      primaryNav: 'primary navigation',
      openNav: 'open navigation',
      openSearch: 'open search',
      closeSearch: 'close search',
      search: 'Search',
      apps: 'Apps',
      openApps: 'open apps',
      toggleColorMode: 'toggle color mode',
      goHome: 'Go to home',
      searchMenu: 'Search menu…',
      collapseNav: 'Minimise the menu',
      expandNav: 'Expand the menu',
      expandAll: 'Expand all',
      collapseAll: 'Collapse all',
      noMenuMatch: 'No menu items match.',
      account: 'Account',
      accountMenu: 'account menu',
    },

    /** The signed-in account card on every portal welcome dashboard. */
    /** The e-mail sign-in panel on the portal login screen. */
    login: {
      emailAddress: 'e-mail address',
    },

    /** Emoji picker category headings + the chat launcher. */
    emoji: {
      reactions: 'Reactions',
      faces: 'Faces',
      work: 'Work',
    },

    account: {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      memberSince: 'Member since',
    },

    /** The shared file browser, opened from the header apps drawer. */
    fileManager: {
      title: 'File Manager',
      close: 'Close file manager',
      search: 'Search by file name',
      type: 'Type',
      sort: 'Sort',
      reload: 'Reload',
      reloadFiles: 'Reload files',
      copyLink: 'Copy link',
      prevFile: 'Previous selected file',
      nextFile: 'Next selected file',
      closeDetails: 'Close file details',
      fileName: 'File name',
      renameHint: 'Renaming purges the CDN copy so the link updates.',
      tags: 'Tags',
      tagsHint: 'Type and press Enter. Tags are searchable in ImageKit.',
      info: 'Info',
      edit: 'Edit',
      renameFailed: 'Rename failed',
      tagsFailed: 'Could not save tags',
      linkCopied: 'Link copied',
      deleted: 'Deleted {name}',
      deleteNothing: 'Nothing was deleted',
      noMatches: 'Nothing matches “{query}”.',
      emptyUploads: 'Nothing uploaded yet.',
      upload: 'Upload',
      uploading: 'Uploading…',
      infoName: 'Name',
      infoPath: 'Path',
      infoType: 'Type',
      infoSize: 'Size',
      infoDimensions: 'Dimensions',
      infoUploaded: 'Uploaded',
      infoUpdated: 'Updated',
      infoFileId: 'File ID',
      infoVersion: 'Version',
    },

    /**
     * EVERY console sidebar entry, for all 17 portals that define a nav.
     *
     * They live in the SHELL bundle because the shell is what renders the
     * sidebar — and because the alternative is 17 namespaces holding the same
     * words: "Dashboard" alone appears in 22 places, "Settings" in 7. One
     * namespace means a portal needs no i18nFallback of its own to have a
     * translated sidebar, and one translator decision applies everywhere.
     *
     * A portal points at these with AppNavItem.labelKey; the shell resolves
     * the tree once (see localizeNav) so the sidebar, the header search, the
     * breadcrumbs and the page title cannot disagree.
     */
    nav: {
      ads: 'Ads',
      adsApproval: 'Ads Approval',
      adsSettings: 'Ads Settings',
      aiCallPrompts: 'AI Call Prompts',
      aiLibrary: 'AI Library',
      aiMonitoring: 'AI Monitoring',
      allPods: 'All Pods',
      allUsers: 'All Users',
      amenitiesManagement: 'Amenities management',
      android: 'Android',
      appFaqs: 'App FAQs',
      apiKeys: 'API Keys',
      apiReference: 'API Reference',
      appBuilds: 'App Builds',
      appPopups: 'App Popups',
      approvals: 'Approvals',
      authentication: 'Authentication',
      automation: 'Automation',
      autoPods: 'Auto Pods',
      backups: 'Backups',
      badges: 'Badges',
      blog: 'Blog',
      boards: 'Boards',
      branding: 'Branding',
      brandRequest: 'Brand Request',
      brands: 'Brands',
      brandsAndProductsReview: 'Brands & Products Review',
      brandsReview: 'Brands Review',
      bugs: 'Bugs',
      businessIdentity: 'Business Identity',
      calculators: 'Calculators',
      calendar: 'Calendar',
      callbackRequests: 'Callback Requests',
      campaigns: 'Campaigns',
      cancelAndRefunds: 'Cancel & Refunds',
      cards: 'Cards',
      career: 'Career',
      catalog: 'Catalog',
      categories: 'Categories',
      challenges: 'Challenges',
      chatWithUs: 'Chat with Us',
      clubAdminMeetings: 'Club Admin Meetings',
      clubs: 'Clubs',
      coinSettings: 'Coin Settings',
      contactSubmission: 'Contact Submission',
      contracts: 'Contracts',
      coupons: 'Coupons',
      createAd: 'Create Ad',
      createAds: 'Create Ads',
      dashboard: 'Dashboard',
      data: 'Data',
      database: 'Database',
      dataClone: 'Data Clone',
      defaultDeductions: 'Default Deductions',
      docker: 'Docker',
      documents: 'Documents',
      duncitCoin: 'Duncit Coin',
      duncitExpenses: 'Duncit Expenses',
      duncitProducts: 'Duncit Products',
      duncitWarehouseLocations: 'Duncit Warehouse Locations',
      dynamicFields: 'Dynamic Fields',
      earnWithDuncit: 'Earn with Duncit',
      eCommerceBrandMeetings: 'E-Commerce Brand Meetings',
      ecommLeads: 'Ecomm Leads',
      ecommRequests: 'Ecomm Requests',
      email: 'Email',
      emails: 'Emails',
      emailTemplates: 'Email Templates',
      engagement: 'Engagement',
      environmentVariables: 'Environment Variables',
      errorLogs: 'Error Logs',
      eventSuitabilityManagement: 'Event Suitability management',
      eventTickets: 'Event Tickets',
      faqs: 'FAQs',
      faqSubmissions: 'FAQ Submissions',
      featureFlags: 'Feature Flags',
      fragments: 'Fragments',
      fulfilment: 'Fulfilment',
      giftCards: 'Gift Cards',
      grievance: 'Grievance',
      grievanceInfo: 'Grievance Info',
      grievanceTickets: 'Grievance Tickets',
      hostAdditionalRequests: 'Host Additional Requests',
      hostCancel: 'Host Cancel',
      hostInvoice: 'Host Invoice',
      hostLeads: 'Host Leads',
      hostListOrSell: 'Host, list or sell',
      hostMeetings: 'Host Meetings',
      info: 'Info',
      invoices: 'Invoices',
      ios: 'iOS',
      jobApplications: 'Job Applications',
      leaderboard: 'Leaderboard',
      leads: 'Leads',
      liveAds: 'Live Ads',
      locales: 'Locales',
      localization: 'Localization',
      locations: 'Locations',
      logs: 'Logs',
      logsSettings: 'Logs Settings',
      mailAutomation: 'Mail Automation',
      mailPreferences: 'Mail Preferences',
      maintenance: 'Maintenance',
      meetingAvailability: 'Meeting Availability',
      meetingSchedule: 'Meeting Schedule',
      membership: 'Membership',
      mobileApp: 'Mobile App',
      mwebUploadSetting: 'mWeb Upload Setting',
      myAds: 'My Ads',
      navigation: 'Navigation',
      newsletterSubmission: 'Newsletter Submission',
      newsroom: 'Newsroom',
      notifications: 'Notifications',
      onboardedClubAdmins: 'Onboarded Club Admins',
      onboardedECommerceBrands: 'Onboarded E-Commerce Brands',
      onboardedHosts: 'Onboarded Hosts',
      onboardedVenues: 'Onboarded Venues',
      onboarding: 'Onboarding',
      openai: 'OpenAI',
      orders: 'Orders',
      packageDocumentation: 'Package Documentation',
      packageUpdates: 'Package Updates',
      partnerFaqs: 'Partner FAQs',
      partners: 'Partners',
      paymentLogs: 'Payment Logs',
      paymentRelease: 'Payment Release',
      payoutCycles: 'Payout Cycles',
      plans: 'Plans',
      podExpenses: 'Pod Expenses',
      podFinance: 'Pod Finance',
      podIdeas: 'Pod Ideas',
      podMonitoringAi: 'Pod Monitoring (AI)',
      podPlans: 'Pod Plans',
      podProfit: 'Pod Profit',
      pods: 'Pods',
      podsDashboard: 'Pods Dashboard',
      podSettings: 'Pod Settings',
      podShopSlider: 'Pod Shop Slider',
      pointsLedger: 'Points Ledger',
      policies: 'Policies',
      policyAcceptanceLogs: 'Policy Acceptance Logs',
      portalAccess: 'Portal Access',
      portalAppSetting: 'Portal App Setting',
      portalsUploadSetting: 'Portals Upload Setting',
      problems: 'Problems',
      productInvoice: 'Product Invoice',
      productRequest: 'Product Request',
      productsReviews: 'Products Reviews',
      rateLimiting: 'Rate Limiting',
      referrals: 'Referrals',
      reminders: 'Reminders',
      reportByUser: 'Report By User',
      blocked: 'Blocked',
      reportedProblems: 'Reported Problems',
      roles: 'Roles',
      rules: 'Rules',
      server: 'Server',
      servicesOffered: 'Services Offered',
      settings: 'Settings',
      settingsAndRewards: 'Settings & Rewards',
      shortLinks: 'Short Links',
      slack: 'Slack',
      somethingForYou: 'Something for you',
      sosAlerts: 'SOS Alerts',
      startupDashboard: 'Startup Dashboard',
      statusReports: 'Status Reports',
      accountDeletions: 'Account Deletions',
      staticContent: 'Static Content',
      subscribers: 'Subscribers',
      support: 'Support',
      surveys: 'Surveys',
      system: 'System',
      systems: 'Systems',
      targetAudience: 'Target Audience',
      telemetry: 'Telemetry',
      templates: 'Templates',
      terminal: 'Terminal',
      tickets: 'Tickets',
      tools: 'Tools',
      transactions: 'Transactions',
      translations: 'Translations',
      uploadSettings: 'Upload Settings',
      userBackoutRefunds: 'User Backout Refunds',
      userLeads: 'User Leads',
      userManagement: 'User Management',
      venueCancel: 'Venue Cancel',
      venueInvoice: 'Venue Invoice',
      venueLeads: 'Venue Leads',
      venueMeetings: 'Venue Meetings',
      venues: 'Venues',
      verification: 'Verification',
      warehouseApproval: 'Warehouse Approval',
      welcome: 'Welcome',
      whatsapp: 'WhatsApp',
      whatsappLeadGenerator: 'WhatsApp Lead Generator',
      whatsappLeads: 'WhatsApp Leads',
      withdrawal: 'Withdrawal',
      withdrawalPayments: 'Withdrawal Payments',
      withdrawalSettings: 'Withdrawal Settings',
    },

    /** Auto Pods in the Partners portal — the same copy mWeb and native render
     * under mweb.autoPods (rule 27 keeps them identical). */
    /**
     * The config-driven pod content editor — @duncit/portal-pod-form, opened
     * by Admin and by the Partners console. The shell's namespace because both
     * ship it and neither owns it (rule 40).
     */
    podContent: {
      title: 'Edit pod',
      readOnlyHeading: 'Pod details (read-only)',
      name: 'Name',
      description: 'Description',
      images: 'Images',
      addImage: 'Add image',
      mediaAlt: 'Pod media',
      noImages: 'No images yet.',
      nameMin: 'Name must be at least 2 characters',
      descriptionRequired: 'Description is required',
    },

    /**
     * Discount codes — @duncit/coupons, rendered by the Admin console's
     * /coupons page and by Marketing's per-pod offer codes. The shell's
     * namespace because both consoles ship it and neither owns it (rule 40).
     */
    coupons: {
      title: 'Coupons',
      subtitle:
        'Global discount codes + per-pod offer codes. Discounts apply on the payment step.',
      newCta: 'New coupon',
      newTitle: 'New coupon',
      editTitle: 'Edit coupon',
      create: 'Create',
      empty: 'No coupons yet.',
      search: 'Search code or description',
      created: 'Coupon created',
      updated: 'Coupon updated',
      deleted: 'Coupon deleted',
      deleteTitle: 'Delete coupon',
      deleteMessage: 'Delete coupon "{code}"?',
      deleteFailed: 'Could not delete coupon',
      saveFailed: 'Could not save coupon',
      editAria: 'Edit coupon',
      deleteAria: 'Delete coupon',
      // Fields.
      code: 'Code',
      codeHint: '3–30 chars: A–Z, 0–9, - or _',
      description: 'Description',
      discountPct: 'Discount %',
      discountHint: 'Between 1 and 100',
      minOrder: 'Min order ₹',
      scope: 'Scope',
      scopeGlobal: 'Global (all pods)',
      scopePod: 'Pod-specific',
      pod: 'Pod',
      validFrom: 'Valid from',
      validUntil: 'Valid until',
      maxUses: 'Max total uses',
      perUserLimit: 'Per-user limit',
      active: 'Active',
      // Columns.
      colDiscount: 'Discount',
      colValidity: 'Validity',
      colUsed: 'Used',
      filterGlobal: 'Global',
      filterPod: 'Pod',
      // Validation.
      codeInvalid: 'Code must be 3-30 chars: A-Z, 0-9, - or _',
      discountNumber: 'Discount must be a number',
      discountMin: 'Minimum 1%',
      discountMax: 'Maximum 100%',
      amountNumber: 'Must be a number',
      amountMin: 'Must be 0 or greater',
      wholeNumber: 'Must be a whole number',
      atLeastOne: 'Must be at least 1',
      podRequired: 'Pick a pod for a pod-scoped coupon',
    },

    /** The Auto Pod TEMPLATE form's validation messages (@duncit/auto-pods).
     * Admin and the Partners console both open it, so the copy is the shell's
     * rather than either console's (rule 40). */
    autoPods: {
      venueTitle: 'Auto Pods for your venue',
      hostTitle: 'Auto Pods to host',
      clubTitle: 'Auto Pods for your club',
      tickVenue: 'Venue Enroll',
      tickHost: 'Host Enroll',
      tickClubAdmin: 'Club Admin Enroll',
      tickPending: 'Pending',
      tickDone: 'Enrolled',
      needsAction: 'Needs your action',
      claimedByYou: 'You enrolled',
      acceptCta: 'Accept & pick a slot',
      assignMyselfCta: 'Assign Myself',
      claimForClubCta: 'Claim for my club',
      pickVenue: 'Which venue?',
      pickSlot: 'Pick a slot',
      pickClub: 'Which club?',
      confirmAccept: 'Accept this Auto Pod?',
      // Enrolments happen in any order, so the body names "the others" rather
      // than a fixed sequence.
      confirmAcceptAnyOrder:
        'Your slot is booked for this pod straight away. It goes live once everyone else has enrolled too.',
      confirmAssign: 'Host this Auto Pod?',
      confirmAssignAnyOrder:
        'You become the host of this pod. It goes live once everyone else has enrolled too.',
      confirmClaim: 'Claim this Auto Pod?',
      confirmClaimBody: 'The pod is created under this club as soon as everyone has enrolled.',
      priceLabel: 'Ticket',
      spotsLabel: 'Spots',
      expectedEarnings: 'You could earn {amount}',
      waitingVenue: 'Waiting for a venue to accept',
      waitingHost: 'Waiting for a host',
      waitingClub: 'Waiting for a club admin',
      waitingFor: 'Waiting for {roles}',
      roleVenue: 'a venue',
      roleHost: 'a host',
      roleClub: 'a club admin',
      // The filters at the top of every queue page, and the card's city line.
      locationLabel: 'Location',
      allLocations: 'All cities',
      changeLocation: 'Change',
      categoryLabel: 'Category',
      allCategories: 'All my categories',
      noHostCategories: 'You are not an approved host in any category yet.',
      pinnedTo: 'In {city}',
      unpinned: 'Any city — the first partner to enrol sets it',
      pickLocationFirst: 'Select your city at the top first — this pod takes its city from you.',
      willPinTo: 'This pod will be set to {city}.',
      noVenueInCity: 'None of your venues is in {city}.',
      noClubInCity: 'None of your clubs is in {city}.',
      liveNow: 'Live',
      viewPod: 'View pod',
      cancelled: 'Cancelled',
      expired: 'Expired',
      claimedElsewhere: 'Someone else took this Auto Pod first.',
      dismiss: 'Cancel',
      emptyVenue: 'No Auto Pods are waiting for a venue right now.',
      emptyHost: 'No Auto Pods need a host right now.',
      emptyClub: 'No Auto Pods need a club right now.',
      noSlots: 'This venue has no free slots. Add availability first.',
      addAvailability: 'Add availability',
      loadFailed: 'Could not load Auto Pods. Please try again.',
      retry: 'Try again',
    },

    /** The two-box question every "New Pod" button asks before it opens a form. */
    podKind: {
      newPodCta: 'New Pod',
      title: 'What kind of pod?',
      subtitle: 'This decides who fills in the venue, the host and the club.',
      normalTitle: 'Normal Pod',
      normalDesc:
        'You pick the club, the venue slot and the host yourself, and the pod is scheduled the moment you save it.',
      autoTitle: 'Auto Pod',
      autoDesc:
        'You write the pod only. A venue accepts it with one of its own slots, a host assigns themselves and a club claims it — then it goes live by itself.',
      dismiss: 'Cancel',
    },

    richText: {
      editorLabel: 'Rich text editor',
      placeholder: 'Start writing…',
      toolbarLabel: 'Text formatting',
      bold: 'Bold',
      italic: 'Italic',
      underline: 'Underline',
      strike: 'Strikethrough',
      heading: 'Heading',
      bulletList: 'Bullet list',
      numberedList: 'Numbered list',
      quote: 'Quote',
      addLink: 'Add link',
      removeLink: 'Remove link',
      clearFormatting: 'Clear formatting',
      undo: 'Undo',
      redo: 'Redo',
      linkTitle: 'Add a link',
      linkLabel: 'Link URL',
      linkHint: 'Use a complete http, https, mailto or tel URL.',
      cancel: 'Cancel',
      applyLink: 'Apply link',
      improve: 'Improve with AI',
      improving: 'Improving…',
      improveError: 'AI could not improve this text. Please try again.',
    },
    profile: {
      accessRoles: 'ACCESS ROLES',
      noRoles: 'No roles assigned.',
      // NOT mweb.common.languageHint: the portal wording differs from the app's,
      // and the server stores ONE row per key — a second value for the same key
      // is unrepresentable, so whichever bundle merged last would silently
      // overwrite the other surface's copy.
      languageHint: 'Choose the language for this portal.',
      firstName: 'First name',
      lastName: 'Last name',
      languageSaveFailed: 'Could not save your language',
    },
    /** The apps drawer's Jump to Portal dialog — shell chrome, so one copy for all consoles. */
    jumpToPortal: {
      title: 'Jump to Portal',
      subtitle: 'Every Duncit console, one click away.',
      close: 'Close',
      loadError: 'Could not load the portal list. Please try again.',
      accessTitle: 'Portals you can access',
      noneAccessible: 'No consoles are open to your roles yet.',
      noAccessTitle: "Portals you don't have access to",
      noAccessHint: 'Request access and a super admin will review it from the Admin console.',
      allAccess: 'You can open every portal.',
      requestAccess: 'Request access',
      requested: 'Requested',
      requestedHint: 'Waiting for an admin decision.',
      deniedHint: 'Your last request was declined — you can ask again.',
      notRequestable: 'Granted personally by a super admin.',
      requestFailed: 'Could not send the request. Please try again.',
    },
    /** The apps drawer itself — the nine dots in every console's header. */
    appsDrawer: {
      title: 'Apps',
      search: 'Search apps',
      close: 'Close apps',
      noMatch: 'Nothing matches “{term}”.',
      fileManager: {
        name: 'File Manager',
        description: 'Everything uploaded to ImageKit — upload, search, crop, copy a link.',
      },
      staffChat: {
        name: 'Chat with a coworker',
        description: 'Message anyone with a staff console — admin, tech, finance, support and the rest.',
      },
      jumpToPortal: {
        name: 'Jump to Portal',
        description: 'Every Duncit console in one place — open yours, request access to the rest.',
      },
      askBot: {
        name: 'Ask Bot',
        description: 'Ask where anything lives across Duncit and get a link straight to it.',
      },
    },
    /** The apps drawer's Ask Bot — the bot list, and the chat behind each bot. */
    askBot: {
      title: 'Ask Bot',
      close: 'Close',
      back: 'All bots',
      listSubtitle: 'Pick a bot to talk to. More will appear here as they are built.',
      loadError: 'Could not load the bots. Please try again.',
      notConfigured: 'Not ready yet — a tech admin needs to add the OpenAI key in the Tech portal.',
      unavailable: 'Unavailable',
      placeholder: 'Ask where something is…',
      send: 'Send',
      thinking: 'Looking it up…',
      answerError: 'Could not get an answer. Please try again.',
      restart: 'Start over',
      tryAsking: 'Try asking',
      thenAsk: 'Then ask',
      noAccess: 'You cannot open this console yet',
      noAccessHint: 'Ask for it under Jump to Portal in this same drawer.',
      noLocalAddress: 'Open this one in the Duncit app — it has no local address.',
      bots: {
        navigation: {
          name: 'Navigation Knowledge Bot',
          description:
            'Knows every page in every console, in mWeb and in the app — where it is and what you can do there.',
          greeting:
            'Ask me where anything lives on Duncit. I will tell you which console or app it is in, what you can do there, and give you a link straight to it.',
          suggestion1: 'Where do I approve a venue?',
          suggestion2: 'Where can I see failed emails?',
          suggestion3: 'Where does a member change their language?',
        },
      },
    },
    /**
     * The Agent — the console assistant that creates things when asked. Lives
     * in the shell namespace because every portal renders the same launcher.
     */
    agent: {
      title: 'Agent',
      open: 'Open Agent',
      dockHint: 'Open the Agent — drag to move this tab',
      close: 'Close',
      subtitle: 'Tell me what to create and I will set it up.',
      greeting:
        'Ask me to create pods or clubs and I will pick the venue, the slot and the cover image for you.',
      placeholder: 'e.g. create 10 badminton pods',
      send: 'Send',
      thinking: 'Working on it…',
      restart: 'Start over',
      answerError: 'Could not reach the agent. Please try again.',
      notConfigured: 'Not ready yet — a tech admin needs to add the OpenAI key in the Tech portal.',
      readOnly: 'You can ask the agent questions, but your role cannot create things yet.',
      tryAsking: 'Try asking',
      suggestion1: 'Create 5 pods',
      suggestion2: 'Create 10 book club pods',
      suggestion3: 'Create 3 clubs for photography',
      resultsTitle: 'What was created',
      failedLabel: 'Not created',
      capNote: 'The agent creates up to 10 at a time. Ask again for more.',
    },
    /**
     * The strip along the bottom of every console: what is running on the left,
     * the clock and its tray on the right.
     */
    taskbar: {
      label: 'Taskbar',
      restore: 'Restore {name}',
      minimise: 'Minimise {name}',
      clockLabel: 'Date and time',
      timeZone: 'Time zone',
      timeZoneHint: 'The zone every date and time in this console is read in.',
      workspaceZone: 'Follow the workspace ({zone})',
      deviceZone: 'This device ({zone})',
      showSeconds: 'Count seconds',
    },
    /** Word-for-word identical to `mweb.slots` — see the note there. */
    slots: {
      date: 'Date',
      hint: "From the venue's availability calendar — the slot sets the pod's date & time.",
      availableSlots: 'Available slots',
      free: 'Free',
      today: 'Today',
      tomorrow: 'Tomorrow',
      loading: 'Loading available slots…',
      empty: 'No open slots right now. Try another venue or check back later.',
      emptyDay: 'No slots on this day. Pick another date.',
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      pickVenueFirst: 'Select a venue first to see its available slots.',
      currentlyBooked: 'Currently booked for this pod',
      wholeVenue: 'Whole venue',
      wholeDay: 'Whole day',
      meetingHint: 'Greyed-out slots are already booked.',
      meetingRescheduleHint:
        'Greyed-out slots are booked; your current slot is marked and can’t be re-selected.',
      current: 'current',
    },
    /**
     * The venue availability EDITOR — @duncit/availability-calendar, which the
     * partner's own calendar and the onboarding console both render. It is the
     * shell bundle rather than one portal's namespace because both surfaces
     * ship the shell and neither owns the component (rule 40).
     */
    availability: {
      overwriteAction: 'Overwrite',
      overwriteTitle: 'Overwrite the existing slot?',
      overwriteMessage:
        'The slot already published for this space and time will be permanently deleted and replaced by the new one. A booked slot, or one with a pending request, is never touched.',
      overwriteConfirm: 'Delete and overwrite',
      // The add-slot fields. `space` is the venue's capacity entry the slot is
      // sold as — a court, a hall, a table — and every venue that lists them
      // publishes each one on its own calendar row.
      space: 'Space',
      spaceHint: 'Each space is booked separately — two spaces can share the same time.',
      spaceHolds: '{label} · holds {capacity}',
      holdsCapacity: 'holds {capacity}',
      wholeDayHint: 'Book the entire date(s) — no time selection needed.',
      startDate: 'Start date',
      startTime: 'Start time',
      endDate: 'End date',
      endTime: 'End time',
      multiDayHint:
        'This creates one continuous multi-day booking (e.g. a multi-day activity or event).',
      price: 'Price (₹)',
      priceHint: 'Leave 0 for a free slot',
      notes: 'Notes (optional)',
      // The calendar grid + its day drawer.
      onLeave: 'Venue on leave',
      leaveTag: 'LEAVE',
      // The existing-slot list inside the day drawer.
      existingSlots: 'Existing slots',
      noSlotsForDate: 'No slots for this date yet.',
      free: 'Free',
      wholeDayRange: 'Whole day · {from} – {to}',
      timeRange: '{from} – {to}',
      requestedByPod: 'Requested by pod',
      bookedByPod: 'Booked by pod',
      awaitingDecision:
        'Awaiting your decision — approve or decline it under Slot Requests.',
      block: 'Block',
      unblock: 'Unblock',
      createFailed: 'Could not create slot',
      updateFailed: 'Could not update slot',
      deleteFailed: 'Could not delete slot',
      endAfterStart: 'End must be after start.',
      startInFuture: 'Start time must be in the future.',
      // The add-slot form judges the draft against a live clock, so these three
      // read as reasons a slot cannot be added rather than as submit failures.
      sameTime: 'Start and end time cannot be the same.',
      pickSlotTimes: 'Pick the start and end time.',
      maxAhead: 'Slots can only be scheduled up to {days} days ahead.',
      deleteTitle: 'Delete this slot?',
      deleteBody:
        'This permanently removes the time slot. Booked slots cannot be deleted.',
      // The "same window every day" bulk dialog.
      recurringTitle: 'Recurring availability',
      recurringHint:
        'Add the same daily time window across a date range (up to {days} days ahead).',
      recurringWholeDayHint: 'Each day becomes one whole-day slot — no time selection needed.',
      dailyStart: 'Daily start',
      dailyEnd: 'Daily end',
      recurringPriceHint: 'Applied to every slot. 0 = free.',
      addToCalendar: 'Add to calendar',
      adding: 'Adding…',
      pickDates: 'Pick the start and end date.',
      endDateAfterStart: 'End date must be on or after the start date.',
      pickTimes: 'Pick the daily start and end time.',
      dailyEndAfterStart: 'Daily end time must be after the start time.',
      noUpcomingSlots: 'That range has no upcoming slots.',
      addFailed: 'Could not add slots',
    },
    /**
     * The host's per-pod actions, rendered by @duncit/host-pod-actions.
     *
     * Word-for-word identical to `mweb.podFeedback` / `mweb.hostScan` — the
     * same dialogs run in the Partners console and in mWeb, and the two must
     * read the same (rule 27). They are written out rather than shared through
     * a const because the key-verification gate parses this file statically and
     * cannot follow a spread; the server stores one row per key path, so the
     * two namespaces cannot collapse into one.
     */
    podFeedback: {
      feedbackLink: 'Feedback link',
      shareLink: 'Share feedback link',
      copyLink: 'Copy feedback link',
      shareMessage: 'How was “{title}”? Tell us in a minute:',
      linkCopied: 'Feedback link copied',
      copyFailed: 'Could not copy the link. Copy it from the feedback page instead.',
    },
    /**
     * A pod's own photos and videos. Word-for-word identical to
     * `mweb.podMedia` — the Partners console opens mWeb's page for the upload
     * itself, but the menu line, the share card and the Complete dialog's Pod
     * Media section are rendered by the portal and need the copy here.
     */
    podMedia: {
      uploadPodMedia: 'Upload Pod Media',
      back: 'Back',
      hostIntro:
        'Add the photos and videos from this pod. Whatever you and your guests add here is what the Complete Pod screen shows.',
      guestIntro: 'Add your photos and videos from this pod so the host and everyone who came can see them.',
      addMedia: 'Add photos or videos',
      uploading: 'Saving to this pod…',
      empty: 'Nothing has been added to this pod yet.',
      itemsHeading: '{count} on this pod',
      byHost: 'Host',
      byGuest: 'Guest',
      uploadedBy: 'Added by {name}',
      remove: 'Remove',
      removed: 'Removed',
      added: '{count} added',
      notInvited:
        'Only the host and the people whose attendance was marked can add media to this pod. Ask the host to mark you present.',
      cancelled: 'This pod was cancelled, so nothing more can be added to it.',
      shareLink: 'Share upload link',
      copyLink: 'Copy upload link',
      linkCopied: 'Upload link copied',
      shareHeading: 'Ask your guests for their photos',
      shareBody:
        'Send this link to the people who came. It opens this same page for anyone you marked present.',
      shareMessage: 'Add your photos from “{title}” here:',
      retry: 'Try again',
      loadFailed: 'That pod could not be opened. Check the link and try again.',
    },
    /**
     * Only the menu label lives here. The card behind it is an mWeb/native
     * surface (rule 40 — the pair shares logic, never UI), so the portals
     * resolve the label and never render the rest of `mweb.podClubAdmin`.
     */
    podClubAdmin: {
      menuItem: 'Pod Club Admin',
    },
    /**
     * Same shape as `podClubAdmin` above — only the menu label lives here. The
     * slot-request page itself is an mWeb/native surface, so a portal resolves
     * the label and simply omits the item when it has no such route.
     */
    podPending: {
      menuItem: 'Slot Request Status',
    },
    /** The per-pod "AI Monitoring" pill on the Admin + Partners pods tables —
     * one copy here because the same pill opens the same activity dialog in
     * both consoles. */
    podMonitoring: {
      aiMonitoring: 'AI Monitoring',
    },
    // The attendance page (Host Studio > Your Pods > three dots > See Marked
    // Attendance, and the Club Admin's Mark Attendance section). Attendance is
    // what the host is PAID on, which is why the earnings note is not a
    // footnote here — an unmarked attendee is an unpaid seat.
    attendance: {
      pageTitle: 'Mark Attendance',
      menuItem: 'See Marked Attendance',
      summary: '{marked} of {total} attendees marked',
      seatsSummary: '{marked} of {total} seats marked',
      markedHeading: 'Attendance marked',
      unmarkedHeading: 'Not marked yet',
      emptyRoster: 'Nobody has booked this pod yet.',
      allMarked: 'Everyone on this pod is marked. Nothing left to do.',
      markButton: 'Mark Attendance',
      marking: 'Marking…',
      markedChip: 'Marked',
      notMarkedChip: 'Not marked',
      seats: 'Admits {count}',
      companionsNeeded: 'Add the other {count} on this booking at the door first.',
      markedBy: 'Marked by {name}',
      markedAt: 'Marked {when}',
      verifiedPhone: 'Verified {phone}',
      methodScan: 'Ticket scanned',
      methodManual: 'Marked by host',
      methodClubAdmin: 'Marked by Club Admin',
      methodAdmin: 'Marked by Duncit',
      methodVirtualJoin: 'Joined the meeting',
      scanCta: 'Scan Attendee Event Tickets',
      earningsTitle: 'Marking attendance is how you get paid',
      earningsBody:
        'Your earnings are calculated only from the attendees you mark. If someone came but is never marked, their seat is left out of your payout.',
      earningsBodyVirtual:
        'This pod is online, so there is no door to scan at. A member is marked present the moment they open the meeting link from the pod page during the pod — anyone who never opens it is left out of your payout unless you mark them by hand.',
      lockedCompletedTitle: 'Attendance is closed for this pod',
      lockedCompletedBody:
        'This pod is completed and its payout is already split, so attendance can no longer be changed. If somebody is missing, contact your Club Admin below.',
      lockedCancelledTitle: 'This pod was cancelled',
      lockedCancelledBody:
        'A cancelled pod has no attendance to record. Contact your Club Admin below if you think this is wrong.',
      clubAdminTitle: 'Need help? Contact your Club Admin',
      clubAdminBody:
        'They can mark an attendee present after the fact — have the booking details ready.',
      clubAdminNone: 'This pod has no Club Admin assigned yet. Reach out to Duncit support.',
      contactEmail: 'Email',
      contactPhone: 'Call',
      contactWhatsapp: 'WhatsApp',
      retry: 'Try again',
      back: 'Back',
      // Verifying the person before a by-hand mark. The code is not actually
      // delivered yet, so the server hands back a test code and this copy tells
      // the host to type it — the flow is real, only the transport is not.
      otpTitle: 'Verify the attendee',
      otpBody:
        'Send {name} a one-time code and enter it here. Their name and number are verified before attendance can be marked.',
      otpName: 'Attendee name',
      otpExtension: 'Country code',
      otpPhone: 'Phone number',
      otpMediumLabel: 'Send the code by',
      otpMediumWhatsapp: 'WhatsApp',
      otpMediumSms: 'SMS',
      otpMediumRequired: 'Choose at least one way to send the code.',
      otpNameRequired: 'Enter the attendee name',
      otpExtensionInvalid: 'Enter a country code',
      otpPhoneInvalid: 'Enter a phone number — digits only, 6 to 15',
      otpSend: 'Send code',
      otpSending: 'Sending…',
      otpResend: 'Send again',
      otpCode: 'One-time code',
      otpCodeInvalid: 'Enter the 6-digit code',
      otpVerify: 'Verify',
      otpVerifying: 'Verifying…',
      otpVerified: 'Verified — you can mark this attendance now.',
      otpTestCode: 'Codes are not being delivered yet. Enter the test code {code}.',
      otpCancel: 'Cancel',
      // The Club Admin's override. It exists for when proof cannot be produced,
      // so the warning is the only thing standing between it and a wrong payout.
      forceTitle: 'Force mark attendance',
      forceWarning:
        'You are marking this person present without a ticket scan. Check their details or ask for valid proof first — a wrong mark changes what the host is paid.',
      forceConfirm: 'Yes, mark present',
      forceCancel: 'Cancel',
    },
    hostScan: {
      personOnTicket: 'person on this ticket',
      peopleOnTicket: 'people on this ticket',
      companionsTitle: 'Who else is coming in?',
      companionsBody: 'This ticket admits {seats}. Add the other {count} to mark attendance.',
      companionName: 'Name',
      companionPhone: 'Phone',
      companionsSubmit: 'Mark attendance',
      companionsIncomplete: 'Fill in every name and phone number.',
      companionsHeading: 'Person {index}',
      fieldRequired: 'Required',
      nameInvalid: 'Enter the name',
      phoneInvalid: 'Enter a phone number — digits only, 6 to 15',
      attendanceMarked: 'Attendance marked',
      attendanceMarkedOne: '{name} is checked in.',
      attendanceMarkedGroup: '{name} and {count} more are checked in.',
      alreadyMarked: 'Already checked in',
      notMarkedYet: 'Not checked in yet',
      checkedInList: 'Checked in on this ticket',
      confirmDone: 'Done',
    },
    // Word-for-word identical to `mweb.hostPodEdit` above — one console and one
    // app render the same dialog, and rule 27 forbids the two drifting.
    /**
     * The host's pod dialogs — @duncit/host-pod-actions. The menu on a pod row
     * and the four dialogs it opens (scan, complete, edit, cancel), plus the
     * edit-and-resubmit flow for a venue-declined pod.
     */
    hostPodActions: {
      menuTooltip: 'Pod actions',
      menuAria: 'Actions for {title}',
      scanTickets: 'Scan attendee event tickets',
      completePod: 'Complete pod',
      editPod: 'Edit pod',
      cancelPod: 'Cancel pod',
      close: 'Close',
      cancel: 'Cancel',
      saving: 'Saving…',
      saveChanges: 'Save changes',
      fieldTitle: 'Title',
      fieldDescription: 'Description',
      fieldMedia: 'Media',
      titleTooShort: 'Title is too short',
      titleTooLong: 'Title is too long',
      descriptionTooShort: 'Add a longer description',
      imageRequired: 'Add at least one image URL',
      resubmitTitle: 'Edit & resubmit pod',
      resubmitHint:
        'Select a different venue or choose a different time slot — your booking request is sent to the venue again when you resubmit. Your pod is kept, no new pod is created.',
      resubmitting: 'Resubmitting…',
      resubmitCta: 'Resubmit request',
      venue: 'Venue',
      venueHint: 'Pick the venue to request',
      completeHint:
        'This pod’s photos and videos are the ones added on the Upload Pod Media page — yours and your guests’. Your payout is credited to your wallet as soon as the pod is completed.',
      venueBillAmount: 'Venue Bill Amount',
      venueBillRequired: 'Enter the venue bill amount',
      podMedia: 'Pod Media',
      completing: 'Completing…',
      cancelIntro: 'You are cancelling {title}. This cannot be undone.',
      cancelNoOthers: 'No one else has joined this pod — it will be cancelled immediately.',
      // Count-driven copy: the translator picks .one or .other from `count`.
      cancelOthers: {
        one: '{count} other attendee joined this pod.',
        other: '{count} other attendees joined this pod.',
      },
      cancelRefund: {
        one: 'Cancelling initiates a refund of {amount} across {count} payment (logged in the Finance portal). All attendees will be emailed.',
        other: 'Cancelling initiates a refund of {amount} across {count} payments (logged in the Finance portal). All attendees will be emailed.',
      },
      cancelEmailOnly: 'All attendees will be emailed about the cancellation.',
      reason: 'Reason',
      reasonRequired: 'Select a reason',
      // The reason dropdown. The VALUE stored on the pod stays the English
      // the server's own list uses; only the wording shown is translated.
      cancelReasons: {
        eventCancelled: 'Event cancelled',
        venueUnavailable: 'Venue unavailable',
        lowAttendance: 'Low attendance',
        rescheduling: 'Rescheduling',
        other: 'Other',
      },
      note: 'Note',
      noteHint: 'Shared with attendees in the cancellation email.',
      noteTooLong: 'Keep the note under 500 characters',
      noteRequired: 'Please describe the reason',
      keepPod: 'Keep pod',
      cancelling: 'Cancelling…',
      initiateRefunds: 'Initiate refunds & cancel',
      pasteTicketCode: 'Or paste the ticket code',
      scanFrameHint: 'Hold the attendee’s ticket QR inside the frame.',
      checkCode: 'Check',
    },
    /**
     * The onboarding-meeting dialogs in @duncit/earn — reschedule and cancel,
     * rendered on mWeb's /earn page and in the Partners console.
     */
    earnMeeting: {
      cancelTitle: 'Cancel this meeting?',
      cancelBody:
        'Your onboarding meeting will be cancelled and the slot freed. You can book a new one anytime.',
      cancelReasonLabel: 'Reason for cancelling',
      cancelReasonHint: 'Tell our onboarding team why you’re cancelling.',
      keepMeeting: 'Keep meeting',
      cancelling: 'Cancelling…',
      cancelCta: 'Cancel meeting',
      cancelFailed: 'Could not cancel — please try again.',
      rescheduleTitle: 'Reschedule your onboarding meeting',
      currentlyBooked: 'Currently booked for {when}. You can reschedule once.',
      noSlots: 'No slots are open right now — please check back soon.',
      movingFromTo: 'Moving from {from} to {to}.',
      rescheduleReasonLabel: 'Reason for rescheduling',
      rescheduleReasonHint: 'Tell our onboarding team why you’re moving the meeting.',
      close: 'Close',
      moving: 'Moving…',
      moveCta: 'Move to this slot',
      pickSlot: 'Please pick an available slot.',
      rescheduleFailed: 'Could not reschedule — please try again.',
      reasonRequired: 'Please tell us a reason.',
      reasonTooLong: 'Keep the reason under 500 characters.',
      // Word-for-word the shared chip's label; this namespace carries its own
      // row because @duncit/earn takes no dependency on @duncit/ai-monitoring.
      aiMonitoring: 'AI Monitoring',
    },
    hostPodEdit: {
      contentCheck: 'Content check',
      // Flexible pod count — the spots control inside the Edit Pod dialog.
      spotsVenueHint:
        'The space this pod booked holds {capacity} people. {taken} seats are already taken.',
      spotsFreeHint: 'At least {min} spots. {taken} seats are already taken.',
      spotsIncreaseOnly:
        'A live pod’s spots can only be increased — ask your Club Admin to reduce them.',
    },
    /**
     * The total-spots control, shared with mWeb's Create-a-Pod through
     * @duncit/ui. Word-for-word identical to `mweb.createPod` — one component
     * renders both, and rule 27 forbids the two drifting.
     */
    createPod: {
      totalSpots: 'Total spots',
      spotsHint: 'Number of available tickets.',
      spotsFixedHint: 'Set by the venue space you picked.',
      decreaseSpots: 'Decrease spots',
      increaseSpots: 'Increase spots',
    },
    /**
     * Staff chat — the panel every console renders in its header.
     *
     * Under `shell` rather than a surface of its own because it IS shell
     * chrome: seventeen portals show the same panel, and a key per portal
     * would be seventeen rows an admin has to translate identically.
     */
    chat: {
      panel: {
        title: 'Coworkers',
        close: 'Close chat',
        closeBusy: 'Close chat — the recording keeps saving in the background',
        open: 'Chat with a coworker',
        minimiseLabel: 'Minimise the chat panel',
      },
      list: {
        searchPlaceholder: 'Search coworkers',
        team: 'Team',
        everyone: 'Everyone',
        everyoneElse: 'Everyone else',
        matching: 'Matching coworkers',
        nobody: 'Nobody matches that.',
        you: 'You: ',
        about: 'About {name}',
        console: 'Console',
        consoles: 'Consoles',
        noConsole: 'No staff console assigned.',
        localTime: '{time} local',
      },
      header: {
        back: 'Back to coworkers',
        audioCall: 'Audio call',
        videoCall: 'Video call',
        startAudio: 'Start audio call',
        startVideo: 'Start video call',
        search: 'Search this conversation',
        searchHint: 'Search this conversation (Ctrl+K)',
        offline: 'offline',
        lastSeen: 'last seen {when}',
      },
      thread: {
        sayHello: 'Say hello.',
        earlier: 'Earlier messages',
        loading: 'Loading…',
        today: 'Today',
        yesterday: 'Yesterday',
        unread: 'New',
        pinned: 'Pinned',
        jumpToLatest: 'Jump to latest',
        newMessages: '{count} new messages — jump to latest',
        typing: '{name} is typing…',
        edited: 'edited',
      },
      composer: {
        placeholder: 'Write a message',
        attach: 'Attach a file',
        emoji: 'Emoji',
        insertEmoji: 'Insert emoji',
        more: 'More',
        moreOptions: 'More options',
        send: 'Send',
        sendMessage: 'Send message',
        recordVoice: 'Record a voice note',
        dropToAttach: 'Drop to attach',
        replyingTo: 'Replying to {name}',
        cancelReply: 'Cancel reply',
      searchPlace: 'Search a place',
      sendLocation: 'Send my location',
        attachment: 'Attachment',
      },
      actions: {
        more: 'More',
        messageActions: 'Message actions',
        reply: 'Reply',
        copyText: 'Copy text',
        select: 'Select messages',
        forward: 'Forward',
        pin: 'Pin',
        unpin: 'Unpin',
        edit: 'Edit',
        editHistory: 'Edit history',
        deleteForMe: 'Delete for me',
        deleteForEveryone: 'Delete for everyone',
        copyCode: 'Copy code',
        moreReactions: 'More reactions',
      },
      status: {
        sending: 'Sending',
        sent: 'Sent',
        delivered: 'Delivered',
        read: 'Read',
        failed: 'Failed to send',
        retry: 'Not sent — tap to retry',
      },
      // Two registers for one failure: a sentence for the person who hit it,
      // and the whole throw for whoever has to fix it.
      failure: {
        showDetails: 'Show details',
        hideDetails: 'Hide details',
        copy: 'Copy',
        copied: 'Copied',
        unknown: 'Something went wrong',
        uploadFailed: 'That file could not be uploaded',
      },
      // Your own availability, and the same words used to describe a coworker's.
      // One set of names for both, so the dot in the header and the menu that
      // sets it can never disagree about what "Away" means.
      presence: {
        online: 'Online',
        onlineHint: 'At your desk',
        away: 'Away',
        awayHint: 'Connected, not looking',
        busy: 'Busy',
        busyHint: 'Please do not disturb',
        appearOffline: 'Appear offline',
        appearOfflineHint: 'Still connected, shown as away',
      },
      selection: {
        count: '{count} selected',
        clear: 'Clear selection',
        copy: 'Copy',
        hide: 'Hide',
        deleteForEveryone: 'Delete for everyone',
      },
      search: {
        label: 'Search this conversation',
        run: 'Run the search',
        close: 'Close search',
        anyone: 'Anyone',
        fromYou: 'From you',
        fromPerson: 'From {name}',
        files: 'Files',
        links: 'Links',
        after: 'After',
        before: 'Before',
        nothing: 'Nothing matched.',
        older: 'Older than the messages loaded — open Earlier messages first',
      },
      call: {
        // What went wrong, in our words. A message thrown by the browser is
        // shown verbatim instead — it names the device, and translating it
        // would mean guessing at text we did not write.
        noMediaDevices:
          'This browser will not open the microphone or camera here. Calls need a secure (https) connection.',
        deviceGone:
          'The microphone or camera you had chosen is not available here, so this call is using the default one.',
        selfCall: 'That call would be to your own account, so there is nobody to reach.',
        startFailed: 'Could not start the call',
        answerFailed: 'Could not answer',
        switchFailed: 'Could not switch device',
        shareFailed: 'Could not share the screen',
        shareNeedsVideo: 'Start a video call first — screen sharing replaces the camera.',
        connectionLost: 'The connection dropped. Neither side could reach the other.',
        audio: 'Audio',
        video: 'Video',
        ringing: 'Ringing…',
        incoming: 'is calling',
        connected: 'Connected',
        sharingScreen: ' · sharing your screen',
        coworker: 'Coworker',
        withName: 'Call with {name}',
        videoWithName: 'Video with {name}',
        calling: 'Calling…',
        incomingCall: 'Incoming call',
        onACall: 'On a call',
        answer: 'Answer',
        decline: 'Decline',
        cancel: 'Cancel',
        hangUp: 'Hang up',
        mute: 'Mute',
        unmute: 'Unmute',
        muteMic: 'Mute microphone',
        unmuteMic: 'Unmute microphone',
        cameraOn: 'Turn camera on',
        cameraOff: 'Turn camera off',
        fullscreen: 'Full screen',
        fullscreenVideo: 'Full screen video',
        share: 'Share your screen',
        stopShare: 'Stop sharing',
        stopShareLabel: 'Stop sharing your screen',
        record: 'Record this call',
        stopRecord: 'Stop recording',
        stopRecordLabel: 'Stop recording this call',
        settings: 'Audio & video settings',
        settingsLabel: 'Audio and video settings',
        incomingAudio: '{name} — incoming audio',
        quality: 'Connection quality',
        endTitle: 'End this call?',
        endMessage:
          'Closing this window hangs up on {name}. Any recording still uploading will finish.',
        endConfirm: 'End call',
      },
      callRow: {
        outgoingAudio: 'Outgoing audio call',
        outgoingVideo: 'Outgoing video call',
        incomingAudio: 'Incoming audio call',
        incomingVideo: 'Incoming video call',
        missed: 'Missed',
        declined: 'Declined',
        cancelled: 'Cancelled',
        recording: 'Recording',
        download: 'Download the recording',
        play: 'Play the recording',
      },
      recorder: {
        recording: 'Recording {clock} — both sides',
        uploading: 'Uploading the recording…',
        converting: 'Converting to MP4…',
        saved: 'Recording saved as MP4',
        download: 'Download',
        sendToChat: 'Send to chat',
        dismiss: 'Dismiss',
        dismissLabel: 'Dismiss the recording',
        failed: 'The recording could not be saved.',
        close: 'Close',
        closeRecording: 'Close the recording',
      },
      devices: {
        title: 'Audio & video',
        microphone: 'Microphone',
        camera: 'Camera',
        systemDefault: 'System default',
        device: 'Device {index}',
        inputLevel: 'Input level',
        saySomething: 'Say something — the bar should move.',
        pressTest: 'Press Test to try these.',
        test: 'Test',
        stopTest: 'Stop test',
        done: 'Done',
      },
      voice: {
        discard: 'Discard',
        discardLabel: 'Discard voice note',
        send: 'Send',
        sendLabel: 'Send voice note',
        play: 'Play the voice note',
        pause: 'Pause the voice note',
        speed: 'Playback speed {rate} times',
      },
      history: {
        title: 'Edit history',
        current: 'Current',
        earlier: 'Earlier',
        none: 'No earlier version was recorded.',
        close: 'Close',
      },
      settings: {
        title: 'Chat settings',
        view: 'View',
        compact: 'Compact',
        comfortable: 'Comfortable',
        bubbles: 'Your bubbles',
        textSize: 'Message text size',
        timesIn: 'Times shown in',
        enterSends: 'Enter sends',
        enterHint: 'Shift+Enter starts a new line.',
        ctrlEnterHint: 'Ctrl+Enter sends; Enter starts a new line.',
        colourPrimary: 'Blue bubbles',
        colourSecondary: 'Purple bubbles',
        colourSuccess: 'Green bubbles',
        colourInfo: 'Teal bubbles',
        zoneDevice: 'This device',
        zoneIndia: 'India',
        zoneUtc: 'UTC',
        zoneLondon: 'London',
        zoneNewYork: 'New York',
      },
      menu: {
        more: 'More',
        download: 'Download this conversation',
        settings: 'Chat settings',
        clear: 'Clear all messages',
        clearTitle: 'Clear this conversation?',
        clearMessage:
          'Every message between you and {name} is deleted, for both of you. Calls and their recordings stay. This cannot be undone.',
        clearConfirm: 'Clear messages',
      },
      location: {
        label: 'Place or address',
        search: 'Search',
        searching: 'Looking…',
        useMyLocation: 'Use my location',
        preview: 'Map of {name}',
        send: 'Send this place',
        cancel: 'Cancel',
        pickOne: 'Search for a place, then send the one you meant.',
        noKey: 'The map preview needs a Google Maps key in the Tech portal. You can still send the place.',
      },
      window: {
        minimise: 'Minimise',
        minimiseLabel: 'Minimise this window',
        maximise: 'Maximise',
        maximiseLabel: 'Maximise this window',
        restore: 'Restore',
        restoreLabel: 'Restore this window',
        close: 'Close',
        closeLabel: 'Close this window',
        minimised: 'Still running — this window is minimised.',
      },
      attachment: {
        download: 'Download',
        downloadNamed: 'Download {name}',
        open: 'Open {name}',
        closePreview: 'Close preview',
      },
    },
    /**
     * The draggable dashboard grid (@duncit/dashboard). Every console's
     * dashboard renders through it, so the toolbar copy is shell chrome — one
     * set of keys rather than seventeen.
     */
    dashboard: {
      customise: 'Customise layout',
      customiseHint: 'Drag widgets by their handle, or drag a corner to resize.',
      editing: 'Editing layout',
      dragHandle: 'Drag to move this widget',
      save: 'Save layout',
      saving: 'Saving…',
      // Success is silent by design: the grid leaves edit mode, which is the
      // confirmation. Only failures get copy, and they render inline above the
      // grid rather than as a toast — a third of the consoles mount no
      // NotifyHost, so a toast there would say nothing at all.
      saveFailed: 'Could not save your layout. Please try again.',
      cancel: 'Cancel',
      reset: 'Reset to default',
      resetTitle: 'Reset this dashboard?',
      resetBody: 'Your saved arrangement is deleted and the default layout comes back. This affects only you.',
      resetConfirm: 'Reset layout',
      resetFailed: 'Could not reset your layout. Please try again.',
      loadFailed: 'Could not load your saved layout — showing the default arrangement.',
    },
  },
  /**
   * Admin portal copy — same reasoning as `tech` below: it rides in THIS
   * bundle because mountPortal already layers SHELL_FALLBACK_FLAT into every
   * portal, so the Admin console needs no extra dependency for its pages.
   */
  admin: {
    /** Admin > Auto Pods — writing the offer and watching the three enrolments. */
    autoPods: {
      title: 'Auto Pods',
      subtitle:
        'Pods the marketplace completes: a venue, a host and a club admin each enrol, in any order.',
      newCta: 'New Auto Pod',
      // The full-page editor (the same accordion form an ordinary pod uses).
      newTitle: 'New Auto Pod',
      editTitle: 'Edit Auto Pod',
      eyebrow: 'Admin · Auto Pods',
      backToList: 'Back to Auto Pods',
      // The Club Admin's copy of the editor lives under their club's pods.
      clubEyebrow: 'Club Admin · {club}',
      backToClubPods: 'Back to pods',
      colAutoPodNo: 'Auto Pod',
      colTitle: 'Title',
      colCategory: 'Category',
      colLocation: 'City',
      anyCity: 'Any city',
      colPrice: 'Ticket',
      colSpots: 'Spots',
      colEnrolments: 'Enrolments',
      colStage: 'Stage',
      colVenue: 'Venue',
      colHost: 'Host',
      colClub: 'Club',
      colCreatedAt: 'Created',
      colActions: 'Actions',
      // Any role may enrol first, so OPEN is "nobody yet" rather than "for venue".
      stageOpenAnyOrder: 'Open — nobody enrolled yet',
      stageClaimingAnyOrder: 'Enrolling',
      stageMaterializing: 'Creating pod…',
      stageLive: 'Live',
      stageCancelled: 'Cancelled',
      stageExpired: 'Expired',
      edit: 'Edit',
      editLiveHint: 'This Auto Pod is live — edit the pod itself.',
      cancel: 'Cancel Auto Pod',
      cancelTitle: 'Cancel this Auto Pod?',
      cancelMessage:
        'Everyone who enrolled is told, and the venue gets its slot back. This cannot be undone.',
      cancelReason: 'Reason (optional)',
      cancelled: 'Auto Pod cancelled.',
      delete: 'Delete Auto Pod',
      deleteTitle: 'Delete this Auto Pod?',
      deleteMessage:
        'The record is removed for good. If partners have enrolled they are told, and the venue gets its slot back.',
      deleteLiveHint: 'This Auto Pod is live — delete the pod itself.',
      deleted: 'Auto Pod deleted.',
      viewPod: 'Open pod',
      noVenueHostHint:
        'You do not pick a venue, a host or a club — the first of each to enrol takes it, in any order. The first to enrol also sets the city.',
      clubHint:
        'You do not pick a venue or a host — the first of each to enrol takes it. This Auto Pod is already claimed for {club}, so no other club can take it, and it is pinned to the club’s city.',
      clubCategoryMissing:
        'This club has no category yet. Set one under Edit Club Details before opening an Auto Pod.',
      openedAnyOrder: 'Auto Pod opened — venues, hosts and club admins can now enrol.',
      updated: 'Auto Pod updated.',
      saveFailed: 'Could not save: {reason}',
      empty: 'No Auto Pods match the current filters.',
    },

    /** Admin > Portal Access — the Jump to Portal request inbox. */
    portalAccess: {
      title: 'Portal Access',
      subtitle: 'Jump to Portal requests — who asked for which console, and when.',
      filterStatus: 'Filter by status',
      statusPending: 'Pending',
      statusApproved: 'Approved',
      statusDenied: 'Denied',
      statusAll: 'All',
      colRequester: 'Requested by',
      colPortal: 'Portal',
      colRequestedAt: 'Requested at',
      colReviewedAt: 'Reviewed at',
      colStatus: 'Status',
      colActions: 'Actions',
      approve: 'Approve',
      deny: 'Deny',
      approveTitle: 'Approve portal access',
      approveMessage:
        'Grant {name} access to the {portal} portal? Their account gets the portal role and they are emailed.',
      denyTitle: 'Deny portal access',
      denyMessage: 'Deny {name} access to the {portal} portal? They are emailed about the decision.',
      approved: 'Access approved — role granted and the requester emailed.',
      denied: 'Request denied — the requester was emailed.',
      failed: 'The action failed. Please try again.',
      empty: 'No portal access requests match the current filters.',
      searchPlaceholder: 'Search by requester name or email',
    },
    // Which consoles offer the header's chat and apps buttons. One row per
    // entry in the server's portal registry, so a portal added there shows up
    // here without a code change.
    portalApp: {
      title: 'Portal App Settings',
      subtitle:
        'Choose which consoles offer “Chat with a coworker” and the Apps drawer in their header.',
      hint: 'A change applies the next time that console is opened or reloaded. Turning chat off also removes it from the Apps drawer.',
      colPortal: 'Portal',
      colLink: 'Link',
      colChat: 'Chat with a coworker',
      colApps: 'App',
      typePortal: 'Portal',
      typeWebsite: 'Website',
      typeApp: 'App',
      // Websites and the member apps have no console header, so the switches
      // say so instead of pretending to control something.
      notApplicable: 'No console header',
      empty: 'No portals registered.',
      searchPlaceholder: 'Search by name or key',
      on: 'On',
      off: 'Off',
      savedChat: 'Chat {state} for {portal}',
      savedApps: 'App {state} for {portal}',
    },
    leaderboard: {
      boardsTitle: 'Leaderboard Boards',
      boardsSubtitle:
        'Live rankings per board. Points are awarded automatically on successful joins, completed pods and product sales.',
      statTotalPoints: 'Total points',
      statAwards: 'Awards written',
      statParticipants: 'Participants',
      periodMonth: 'This month',
      periodYear: 'This year',
      periodAll: 'All time',
      catUser: 'Users',
      catHost: 'Hosts',
      catClubAdmin: 'Club Admins',
      catVenue: 'Venues',
      catBrand: 'Brands',
      colRank: 'Rank',
      colUser: 'User',
      colPoints: 'Points',
      colDate: 'Date',
      colAction: 'Action',
      colSource: 'Source',
      colPod: 'Pod',
      boardEmpty: 'No points on this board yet.',
      boardError: 'The board could not be loaded.',
      ledgerTitle: 'Points Ledger',
      ledgerSubtitle: 'Every points award, newest first — the insert-only source of truth.',
      settingsTitle: 'Leaderboard Settings',
      settingsSubtitle: 'How many points each action earns, and what finishing well pays.',
      pointsCardTitle: 'Points per action',
      pointsCardSubtitle: 'Set 0 to switch an action off. Changes apply to future awards only.',
      pointsJoin: 'Points per successful join (Users board)',
      pointsHost: 'Points per completed pod (Hosts board)',
      pointsClubPod: 'Points per completed club pod (Club Admins board)',
      pointsVenuePod: 'Points per pod completed at a venue (Venues board)',
      pointsProductSale: 'Points per product sale (Brands board)',
      save: 'Save',
      saving: 'Saving…',
      saved: 'Leaderboard settings saved',
      rewardsCardTitle: 'Rewards',
      rewardsCardSubtitle:
        'Promise a prize for finishing a month or a year inside a rank range. The apps show active rewards on every board.',
      rewardCategory: 'Board',
      rewardPeriod: 'Window',
      rewardMonthly: 'End of month',
      rewardYearly: 'End of year',
      rewardRankFrom: 'Rank from',
      rewardRankTo: 'Rank to',
      rewardTitle: 'Reward',
      rewardDescription: 'Description',
      rewardActive: 'Active',
      addReward: 'Add reward',
      removeReward: 'Remove reward',
      rewardsEmpty: 'No rewards yet. Add the first one.',
      loadError: 'Leaderboard settings could not be loaded.',
    },
  },
  /**
   * Tech portal copy. It rides in THIS bundle rather than a `tech.ts` of its
   * own because mountPortal already layers SHELL_FALLBACK_FLAT into every
   * portal — a separate namespace file would mean a new @duncit/i18n
   * dependency (and lockfile churn) on the Tech portal for one page.
   */
  tech: {
    dataClone: {
      title: 'Data Clone',
      subtitle:
        'Copy the production database into staging. The copy runs on the server, so this page can be closed while it works.',
      source: 'Source (production)',
      target: 'Target (staging)',
      notConfigured: 'A clone cannot start yet.',
      start: 'Start clone',
      starting: 'Starting…',
      confirmTitle: 'Replace the staging data?',
      confirmMessage:
        'Every collection is dropped in {target} and refilled from {source}. Staging data that is not in production is lost. This cannot be undone.',
      confirmAction: 'Clone now',
      cancel: 'Cancel',
      statusRunning: 'Cloning',
      statusSucceeded: 'Finished',
      statusFailed: 'Failed',
      copying: 'Copying {name}',
      collectionsProgress: '{done} of {total} collections',
      documentsCopied: 'Documents copied',
      dataCopied: 'Data copied',
      startedAt: 'Started {when}',
      finishedAt: 'Finished {when}',
      startedBy: 'Started by {who}',
      collections: 'Collections',
      empty: 'No clone has run on this server yet.',
      excludedTitle: 'Never cloned ({total})',
      excludedHint:
        'Credentials, live one-time codes, device push tokens and logs are skipped, so staging can never act as production or reach real users. These collections keep whatever staging already has.',
      rowPending: 'Waiting',
      rowCopying: 'Copying',
      rowDone: 'Done',
      rowFailed: 'Failed',
      leaveTitle: 'A clone is still running',
      leaveMessage:
        'The clone keeps running on the server, so leaving does not stop it — you just stop seeing its progress. Do not restart or redeploy the server until it finishes, or staging is left with half-copied data.',
      leaveStay: 'Stay on this page',
      leaveAnyway: 'Leave anyway',
      settings: 'Settings',
      settingsTitle: 'Clone connections',
      settingsHint:
        'A clone reads from production and rewrites staging, so both databases are connected here first. Nothing can start until each one has been reached with the exact connection string saved for it.',
      close: 'Close',
      roleProduction: 'Production — the database that is read',
      roleStaging: 'Staging — the database that is replaced',
      connected: 'Connected',
      notConnected: 'Not connected',
      uriLabel: 'Connection string',
      uriHint: 'The Atlas SRV string for this cluster, credentials included.',
      uriHintSaved: 'Saved: {uri}. Leave blank to keep it.',
      uriRequired: 'Paste the connection string for this database.',
      uriFormat: 'A connection string starts with mongodb:// or mongodb+srv://.',
      showUri: 'Show connection string',
      hideUri: 'Hide connection string',
      databaseLabel: 'Database name',
      databaseHint: 'The database on that cluster — production and staging must differ.',
      databaseRequired: 'Name the database this connection points at.',
      connect: 'Save & connect',
      connecting: 'Connecting…',
      connectFailed: 'The connection could not be saved.',
      retest: 'Check again',
      lastChecked: 'Last checked {when} — {count} collections found',
      neverChecked: 'Not checked yet.',
    },
    slack: {
      title: 'Slack',
      subtitle: 'Read a channel and reply to it, without leaving the portal.',
      notConfigured:
        'Add a Slack bot token in Environment Variables → Slack to connect a workspace.',
      noChannels: 'No channels the bot can see yet — invite it to a channel.',
      searchChannels: 'Search channels',
      noChannelMatch: 'No channel matches that search.',
      notMember: 'Not joined',
      pickChannel: 'Pick a channel to read it.',
      noMessages: 'Nothing has been posted here yet.',
      channelMeta: '{id} · {members} members',
      notInChannelTitle: 'The bot is not in this channel',
      inviteBot:
        'Slack will not release #{channel}’s messages to a bot that is not a member. Add it here, or run /invite @your-bot in the channel.',
      invitePrivate:
        '#{channel} is private, and no API can add a bot to a private channel. Someone already in it has to run /invite @your-bot there.',
      joinChannel: 'Add the bot',
      joining: 'Adding…',
      permissionsTitle: 'Bot permissions',
      permissionsTeam: 'Connected to the {team} workspace.',
      permissionsUnknown:
        'Slack did not report this token’s scopes, so none of them can be confirmed here. The token may still be working normally.',
      permissionsHowTo:
        'Scopes are fixed when the app is installed. Add one under OAuth & Permissions → Bot Token Scopes, then reinstall the app and paste the new xoxb- token into Environment Variables → Slack.',
      openSlackApps: 'Open Slack apps',
      scopeDocs: 'What these scopes mean',
      scopeOptional: 'Optional',
      copyId: 'Copy channel ID',
      copiedId: 'Channel ID copied.',
      openInSlack: 'Open in Slack',
      bot: 'bot',
      replies: '{count} replies — open the thread in Slack',
      composerPlaceholder: 'Message the channel — Enter sends, Shift+Enter for a new line',
      send: 'Send',
      blockKitToggle: 'Block Kit payload',
      blockKitLabel: 'Block Kit blocks (JSON array)',
    },
    appBuilds: {
      androidTitle: 'Android Builds',
      androidSubtitle:
        'Every APK the android-build workflow made from a merge to main — download it, see the commits it shipped, and whether Slack heard about it.',
      iosTitle: 'iOS Builds',
      iosSubtitle:
        'Every IPA the ios-build workflow made from a merge to main — download it, see the commits it shipped, and whether Slack heard about it.',
      colWhen: 'When',
      colStatus: 'Status',
      colVersion: 'Version',
      colFile: 'File',
      colCommit: 'Commit',
      colChanges: 'Changes',
      colSize: 'Size',
      colDuration: 'Took',
      colBranch: 'Branch',
      colReportedBy: 'Reported by',
      colSlack: 'Slack',
      colLinks: 'Links',
      colEnv: 'Environment',
      colTriggeredBy: 'Started by',
      colRequested: 'Asked for',
      slackPosted: 'Posted',
      slackSkipped: 'Skipped',
      statusQueued: 'Queued',
      statusRunning: 'Building',
      statusSuccess: 'Success',
      statusFailed: 'Failed',
      statusStale:
        'This build never reported an outcome — the runner was most likely cancelled or killed, or GitHub never scheduled one. Open the run to see what happened.',
      statusElapsed: 'Running for {minutes} min',
      progressTitle: 'Progress',
      stageTook: '{minutes} min',
      progressEnded: 'The runner stopped reporting here.',
      runLinkPending:
        'GitHub has not scheduled a runner yet — the link to the run appears as soon as it starts.',
      triggerAction: 'Create build',
      triggering: 'Starting…',
      triggerTitle: 'Create a build',
      triggerSubtitle: 'Build the app now, instead of waiting for the next merge to main.',
      triggered: 'Build {build} queued. It appears in the table as soon as a runner picks it up.',
      triggerPush: 'Merge to main',
      triggerPortal: 'Tech portal',
      triggerTargets: 'Dispatched to {repository}. The build records itself in {server}.',
      envLabel: 'Server and database',
      envProduction: 'Production',
      envStaging: 'Staging',
      envProductionHint:
        'The app will talk to the production server and the live database — the same build a merge to main produces.',
      envStagingHint:
        'The app will talk to the staging server and the staging database. This is compiled in and cannot be changed after installing, so do not hand this build to a real user.',
      artifactsLabel: 'What to build',
      artifactsRequired: 'Pick at least one artifact to build.',
      playStoreLabel: 'Submit AAB to Google Play',
      playStoreHint:
        'After signing, submit this release to the Google Play internal testing track. This does not publish it to production.',
      playStoreRequiresAab: 'Google Play submission requires the AAB artifact.',
      playStoreRequiresProduction: 'Google Play submission requires a production build.',
      playStoreInternal: 'Google Play internal testing',
      refLabel: 'Branch',
      refHint: 'The branch to build from. It must already contain the build workflow.',
      refFormat: 'That is not a valid branch or tag name.',
      cancel: 'Cancel',
      githubNotConfigured:
        'No GitHub token is configured, so the portal cannot start a build. Add an access token, owner and repository in Environment Variables → GitHub.',
      artifactsTitle: 'Artifacts',
      downloadKind: 'Download {kind}',
      viewRun: 'View run',
      close: 'Close',
      empty: 'No builds yet — they appear here after the next merge to main.',
      searchPlaceholder: 'Search build no, version, file, commit or branch',
      commitsTitle: 'Commits ({total})',
      noCommits: 'No commit details were recorded for this build.',
      settingsTitle: 'App Build Settings',
      settingsSubtitle:
        'Which Slack channels a finished build announces itself in — one for Android, one for iOS. The bot must be a member of each channel.',
      androidChannel: 'Android builds channel',
      iosChannel: 'iOS builds channel',
      channelHint: 'Pick a channel or paste its ID (e.g. C0123ABCD). Leave empty to post nothing.',
      channelFormat: 'A Slack channel ID looks like C0123ABCD.',
      channelUnknown:
        'No channel with this ID is visible to the bot. The ID is still saved — invite the bot to the channel and the next build will announce itself there.',
      save: 'Save',
      saving: 'Saving…',
      saved: 'Build channels saved.',
      slackNotConfigured:
        'Slack is not connected. Add a bot token in Environment Variables → Slack first — builds are still recorded, they just cannot be announced.',
      ciTitle: 'CI credentials',
      ciSubtitle:
        'The build workflows sign in with a token to record what they built. Generate it here, then keep it in GitHub — a workflow cannot read this database until it has authenticated, so that one secret has to live there.',
      ciNeverReported:
        'No build has ever been reported. Until the GitHub secret below is set, the android-build and ios-build workflows fail at their last step.',
      ciLastReported: 'CI last reported on {when}, as {account}.',
      ciIssue: 'Generate CI token',
      ciIssuing: 'Generating…',
      ciTokenIssued:
        'Token generated for {account}. It carries your roles, so revoking your access revokes it.',
      ciSecretName: 'GitHub secret name',
      ciSecretValue: 'GitHub secret value',
      ciTokenOnce:
        'Shown once — it is not stored here. Add it under Settings → Secrets and variables → Actions on the repo. Lost it? Generate another; both keep working.',
      ciCopyName: 'Copy the secret name',
      ciCopyValue: 'Copy the token',
      ciCopied: 'Copied.',
      ciCopyFailed: 'Could not reach the clipboard — select the text and copy it manually.',
      deleteAction: 'Delete',
      deleteTitle: 'Delete this build?',
      deleteMessage:
        '{build} and its stored file are removed for good. The download link stops working immediately.',
      deleted: 'Build deleted.',
      noArtifact: 'The build succeeded but its file was not stored.',
    },
    mailAutomation: {
      title: 'Mail Automation',
      subtitle:
        'Connect a Gmail mailbox so it answers itself. Tech owns the connection; Support writes what it says and which queue it opens.',
      notConfigured:
        'Google OAuth is not configured. Add a Client ID and Client Secret in Environment Variables → Google OAuth, then come back.',
      // Three separate steps in the Google Cloud console, and they are easy to
      // mistake for one. Adding the Gmail scopes to the consent screen does NOT
      // enable the Gmail API — consent then succeeds and the connection fails
      // afterwards with a 403, which is a confusing way to learn this.
      scopeHint:
        'On the Google Cloud project: enable the Gmail API, give this OAuth client the Gmail read and send scopes, and register {redirect} as an authorised redirect URI.',
      connect: 'Connect Gmail',
      connecting: 'Opening Google…',
      connected: '{email} is connected.',
      connectFailed: 'Could not connect the mailbox: {reason}',
      cancelled: 'Connection cancelled — nothing was changed.',
      empty: 'No mailbox is connected yet. Connect one to start automating replies.',
      disconnect: 'Disconnect',
      disconnectTitle: 'Disconnect {email}?',
      disconnectMessage:
        'The mailbox stops being read and stops replying. Tickets it already opened stay exactly as they are, and its rule is forgotten — reconnecting starts from the default message.',
      disconnected: '{email} disconnected',
      alreadyConnected:
        '{email} was already connected. Its Google access has been refreshed and the reply rule Support wrote for it was left exactly as it was — nothing was reset.',
      grantLost: 'The Google grant is gone. Reconnect this mailbox.',
      paused: 'Paused by Support',
      running: 'Running',
      neverPolled: 'Not checked yet',
      aiOn: 'AI writes the reply',
      aiOff: 'Sends the message as written',
      ruleHint: 'The reply message and the queue are set in the Support portal.',
    },
  },
  support: {
    mailAutomation: {
      title: 'Mail Automation',
      subtitle:
        'What a connected mailbox replies with, and which queue an email opens. Tech connects the mailbox; everything below is yours.',
      empty:
        'No mailbox is connected yet. Ask Tech to connect one under Tech → Mail Automation.',
      stepMailbox: 'Mailbox',
      stepMessage: 'Reply message',
      stepTicket: 'Ticket & action time',
      mailboxHint:
        'Pick the mailbox this rule belongs to. Connecting and disconnecting happens in the Tech portal.',
      mailboxNotConnected: 'This mailbox has lost its Google grant — Tech needs to reconnect it.',
      automationActive: 'Automation running',
      automationPaused: 'Automation paused — mail is read but nothing is answered',
      messageLabel: 'What every first message gets back',
      messageHint:
        'Use {tokens} anywhere in the text. {ticketToken} is required — it is the reference the sender quotes back to you.',
      messageRequired: 'Write the reply message',
      messageNeedsTicket: 'Include {ticketToken} so the sender gets their reference',
      aiLabel: 'Let AI write the actual reply',
      aiHint:
        'OpenAI rewrites your message so it answers the email in front of it. Every fact and promise you wrote is kept, and the reference number is checked before it sends. With this off, your message goes exactly as written.',
      preview: 'Preview the reply',
      previewTitle: 'What the sender receives',
      previewByAi: 'Written by AI from your message',
      previewByTemplate: 'Your message, as written',
      previewFailed: 'Could not build a preview: {reason}',
      ticketLabel: 'What an email opens',
      ticketSupport: 'Support ticket',
      ticketSupportHint: 'The ordinary conversation queue, answered by an agent.',
      ticketGrievance: 'Grievance ticket',
      ticketGrievanceHint: 'A legal filing with a redressal clock. Goes to the legal queue.',
      ticketReport: 'Report a problem',
      ticketReportHint: 'Triaged like an in-app bug report, with the sender as the reporter.',
      slaLabel: 'How long the team has to act on the ticket',
      slaMin: 'Minimum hours',
      slaMax: 'Maximum hours',
      slaHint:
        'The acknowledgement itself goes out within a couple of minutes — this is how long the reply promises the TEAM will take to act on the ticket. Worded as “{label}”. Default is 24 to 48 hours.',
      slaOrder: 'Minimum cannot be more than maximum',
      slaRange: 'Between 1 and 720 hours',
      threadRule:
        'Only the FIRST message of a conversation opens a ticket and gets a reply. Anything that comes back on the same thread is left for a human.',
      recentTitle: 'Recently answered',
      recentEmpty: 'Nothing answered yet.',
      recentReplied: 'Replied {when}',
      recentFailed: 'Ticket opened, reply failed: {reason}',
      recentPending: 'Picked up but not answered — it retries on the next check.',
      // Column labels. Defined once under `support` and read by the Tech table
      // too — the two tables show the same concepts to different audiences, and
      // the same precedent already applies to the ticket-type names above.
      colMailbox: 'Mailbox',
      colState: 'State',
      colOpens: 'Opens',
      colRepliesIn: 'Acts within',
      colWriter: 'Reply written by',
      colLastChecked: 'Last checked',
      colConnected: 'Connected',
      colFrom: 'From',
      colSubject: 'Subject',
      colTicket: 'Ticket',
      colStatus: 'Status',
      colReceived: 'Received',
      searchMailbox: 'Search mailbox',
      configure: 'Configure',
      editTitle: 'Rule for {email}',
      close: 'Close',
      save: 'Save',
      saving: 'Saving…',
      saved: 'Rule saved',
      saveFailed: 'Could not save: {reason}',
      back: 'Back',
      next: 'Next',
    },
    ticketDetail: {
      // The details panel is a right-hand column on a desktop, where there is
      // room for it beside the conversation. A narrow screen has no such room,
      // so it folds away rather than eating the height the thread needs.
      detailsShow: 'Show ticket details',
      detailsHide: 'Hide ticket details',
    },
  },
};
