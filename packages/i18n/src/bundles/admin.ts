import type { NestedCatalogue } from '../catalogue';

/**
 * The Admin Panel's own copy.
 *
 * Only the strings the console renders itself live here — everything it shows
 * ABOUT the platform (a super category's name, a venue's status) is data the
 * server sends, and keying that would freeze a list an admin is meant to edit.
 *
 * The lifecycle words are deliberately NOT the `mweb.studioPods.bucket*` ones:
 * a host reads "Live now" and "Past" about their own evening, while an admin
 * filtering every pod on the platform reads the state names the rest of this
 * console uses. Same four buckets, two audiences, two sentences (rule 40 shares
 * the derivation, not the wording).
 */
export const ADMIN_BUNDLE: NestedCatalogue = {
  admin: {
    filters: {
      // Clubs and Venues are both classified under a Super Category, so one
      // label serves both pages rather than drifting into two.
      superCategory: 'Super Category',
      allSuperCategories: 'All Super Categories',
      podLifecycle: 'Status',
      podLifecycleAll: 'All Pods',
      podLifecycleUpcoming: 'Upcoming',
      podLifecycleOngoing: 'Ongoing',
      podLifecycleCompleted: 'Completed',
      podLifecycleCancelled: 'Cancelled',
    },
    users: {
      title: 'Users',
      empty: 'No users match the current filters.',
      create: 'Create User',
      colUser: 'User',
      colContact: 'Contact',
      colRole: 'Role',
      colLoginMethod: 'Login Method',
      colLastLogin: 'Last Login',
      google: 'Google',
      googleAccount: 'Google Account',
      notFound: 'User not found.',
      temporaryPassword: 'Temporary password',
      generate: 'Generate',
      dateOfBirth: 'Date of birth',
      phoneNumber: 'Phone number',
      deleteTitle: 'Delete this user?',
    },

    profile: {
      tab: 'Profile',
      bio: 'Bio',
      active: 'Active',
      inactive: 'Inactive',
      blocked: 'Blocked',
      photoUrl: 'Profile photo URL',
      photo: 'Profile photo',
      zone: 'Zone',
      assignedCity: 'Assigned City',
      assignedZones: 'Assigned Zones',
      assignedCityField: 'Assigned city (admin scope)',
      assignedZonesField: 'Assigned zones (comma-separated)',
      basicInfo: 'user basic information',
      emailVerified: 'Email verified',
      verified: 'Verified',
      city: 'City',
      state: 'State',
      pincode: 'Pincode',
      address: 'Address',
      noChanges: 'No profile changes recorded yet.',
      changeLogs: 'User Change Logs',
    },

    tabs: {
      access: 'Access',
      activity: 'Activity',
      badges: 'Badges',
      health: 'Health',
      interests: 'Interests',
      surveys: 'Surveys',
      verification: 'Verification',
      callEmailLogs: 'Call & Email Logs',
    },

    activity: {
      appVisit: 'App Visit Activity',
      overTheDay: 'Activity over the day',
      events: 'Events',
      topPages: 'Top pages',
      year: 'Year',
      deleteActivity: 'Delete activity',
      deleteDay: 'Delete day',
      allActions: 'All actions',
      allPages: 'All pages',
      action: 'Action',
      page: 'Page',
      noClickstream: 'No clickstream events recorded for this day.',
      noEventsMatch: 'No events match the selected filters.',
    },

    contact: {
      call: 'Call',
      target: 'Target',
      when: 'When',
      subject: 'Subject',
      notes: 'Notes',
      durationS: 'Duration (s)',
      durationSeconds: 'Duration seconds',
      recordingUrl: 'Recording URL',
      empty: 'No contact logs yet.',
      saved: 'Contact log saved',
      targetMissing: 'Contact target missing',
      deleteLog: 'delete contact log',
    },

    health: {
      magnitude: 'Magnitude',
      remark: 'Remark (optional)',
      range: 'Enter an adjustment between 1 and 100.',
      deleteAdjustment: 'Delete adjustment',
      deleteBody: 'This removes the adjustment and recomputes the score. This cannot be undone.',
    },

    verification: {
      identity: 'Identity',
      details: 'Details',
      review: 'Review',
      approved: 'Approved',
      rejected: 'Rejected',
      underReview: 'Under Review',
      notVerified: 'Not Verified',
      verifiedByApp: 'Verified by the App',
      rejectReason: 'Reject reason',
      empty: 'No verifications yet.',
    },

    bank: {
      payoutMethod: 'Payout method',
      accountHolder: 'Account holder name',
      accountNumber: 'Account number',
      ifsc: 'IFSC code',
      upi: 'UPI ID',
    },

    badges: {
      empty: 'No badges earned yet.',
    },

    surveys: {
      empty: 'No answers.',
      none: "This user hasn't submitted any onboarding survey yet.",
      interests: 'Signup Survey Interests',
    },

    roles: {
      title: 'Roles',
      empty: 'No roles assigned.',
      key: 'Key',
      portal: 'Portal',
      type: 'Type',
      custom: 'Custom',
      system: 'System',
      default: 'Default',
      portalAccess: 'Portal Access',
      deleteRole: 'Delete role',
      keyHint: 'Uppercase, e.g. CITY_ADMIN',
      superAdmins: 'Super Admins',
      revoke: 'Revoke',
      revokeAccess: 'Revoke admin access',
      revokeMessage: 'Revoke admin access for {name}? They will be emailed about this change.',
      searchUser: 'Search a user by name or email to make admin',
      typeMore: 'Type at least 2 characters…',
      removeCategory: 'Remove category',
    },

    approvals: {
      empty: 'No approval requests match the current filters.',
      filterByStatus: 'Filter by status',
      approveFailed: 'Failed to approve',
      denyFailed: 'Failed to deny',
      denyReason: 'Explain why this request is being denied',
      colKind: 'Kind',
      colRequestedBy: 'Requested by',
      colRequestedAt: 'Requested at',
      colReviewedAt: 'Reviewed at',
      colSourcePortal: 'Source portal',
    },

    partners: {
      title: 'Partner',
      empty: 'No partners yet.',
      partnerType: 'Partner type',
      joined: 'Joined',
    },

    captcha: {
      label: 'Captcha',
      confirm: "Confirm you're human",
      newCode: 'New code',
      refresh: 'refresh captcha',
      code: 'Code',
    },
  },
};
