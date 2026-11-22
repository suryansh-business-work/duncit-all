import type { NestedCatalogue } from '../catalogue';

/**
 * Monthly employee targets — the copy for BOTH ends of one flow.
 *
 * The Targets console assigns an employee their goals for a month and reviews
 * the report; the Employee console shows the goals and files the report. The
 * same goals, statuses and report are described on both surfaces, so they are
 * one namespace shipped by both portals (like `employeeExpense`): `admin.*`,
 * `form.*`, `review.*` and `settings.*` are the Targets console's, `mine.*`,
 * `reminder.*` and `submitForm.*` the employee's, and the rest is shared.
 */
export const EMPLOYEE_TARGETS_BUNDLE: NestedCatalogue = {
  employeeTargets: {
    status: {
      ASSIGNED: 'Assigned',
      SUBMITTED: 'Submitted',
      REVIEWED: 'Reviewed',
    },

    col: {
      employee: 'Employee',
      month: 'Month',
      goals: 'Goals',
      status: 'Status',
      completion: 'Completion',
      submittedAt: 'Submitted',
    },

    goals: {
      title: 'Goals',
      numbered: '{index}. {title}',
      target: 'Target: {value} {unit}',
      notes: 'Note: {notes}',
    },

    submission: {
      title: 'Progress report',
      completion: 'Completion',
      percent: '{percent}%',
      achievements: 'Achievements',
      updates: 'Updates',
      noUpdates: 'No updates shared.',
      submittedAt: 'Submitted {date} · sent {count} time(s)',
      notSubmitted: 'The employee has not reported on this month yet.',
    },

    detail: {
      title: '{name} · {month}',
      assignedBy: 'Assigned by {name} on {date}',
      assignedByName: 'Set by {name}',
    },

    review: {
      title: 'Review',
      comment: 'Comment for the employee',
      commentHint: 'Optional. The employee sees it with their report.',
      submit: 'Mark as reviewed',
      done: 'Marked as reviewed',
      reviewedBy: 'Reviewed by {name} on {date}',
      noComment: 'No comment.',
    },

    admin: {
      title: 'Employee Targets',
      subtitle:
        'Set each employee their goals for a month and follow what they report. Employees are reminded at the end of the month to submit their progress.',
      listTitle: 'Monthly targets',
      monthFilter: 'Month',
      assign: 'Assign target',
      empty: 'No targets yet. Assign one to get started.',
      search: 'Search employee, email or goal',
      rowActions: 'Actions for {name}',
      view: 'View',
      editGoals: 'Edit goals',
      reopen: 'Reopen',
      delete: 'Delete',
      deleteTitle: 'Delete this target?',
      deleteMessage: '{name}’s target for {month} will be removed from both consoles. The record is kept.',
      reopenTitle: 'Reopen this report?',
      reopenMessage: '{name} will be able to change their report for {month} again. The review is cleared.',
      assigned: 'Target assigned',
      updated: 'Goals updated',
      deleted: 'Target deleted',
      reopened: 'Report handed back to the employee',
      conflict: 'This target was changed by someone else. Reload it and try again.',
      duplicate: 'This employee already has a target for that month. Open it to change the goals.',
      locked: 'This target can no longer be changed that way. Reload it to see where it stands.',
      failed: 'That did not work. Please try again.',
    },

    form: {
      assignTitle: 'Assign a monthly target',
      editTitle: 'Edit goals',
      employee: 'Employee',
      employeeHint: 'Only active employees are listed.',
      employeeSearch: 'Type a name or email',
      employeeRequired: 'Choose an employee',
      noEmployees: 'No active employee matches',
      month: 'Month',
      monthRequired: 'Choose a month',
      goalHeading: 'Goal {index}',
      goalTitle: 'Goal',
      goalTitleRequired: 'Give the goal a title',
      goalDescription: 'Description',
      goalTarget: 'Target figure',
      goalTargetHint: 'Optional, for example 40',
      goalTargetInvalid: 'Enter a number of 0 or more, or leave it blank',
      goalUnit: 'Unit',
      addGoal: 'Add goal',
      removeGoal: 'Remove goal {index}',
      goalsMin: 'Add at least one goal',
      goalsMax: 'Add at most {max} goals',
      notes: 'Notes',
      notesHint: 'Optional context the employee sees with the goals.',
      tooLong: 'Use at most {max} characters',
      assign: 'Assign target',
      saveGoals: 'Save goals',
    },

    settings: {
      title: 'Settings',
      subtitle: 'When employees are reminded to submit their monthly target progress.',
      remindersTitle: 'Month-end reminders',
      enabled: 'Send month-end reminders',
      enabledHint: 'Once a day, in the app and by email, while a target is still unsubmitted.',
      daysBefore: 'Days before the month ends',
      daysBeforeHint: 'Reminders start this many days before the month ends (1 means only the last day).',
      grace: 'Days into the next month',
      graceHint: 'Keep reminding for this many days of the next month while still unsubmitted (0 stops at month end).',
      range: 'Enter a whole number from {min} to {max}',
      save: 'Save settings',
      saved: 'Settings saved',
      failed: 'Settings could not be saved. Please try again.',
      loading: 'Loading settings',
      loadFailed: 'Settings could not be loaded.',
      retry: 'Retry',
    },

    mine: {
      title: 'My Targets',
      subtitle: 'The goals set for you each month. Open a month to submit your progress.',
      empty: 'No monthly targets have been set for you yet.',
      search: 'Search goals',
      backToList: 'Back to My Targets',
      detailTitle: 'Target for {month}',
      dueHint: 'The month is closing — please submit your progress.',
      submitTitle: 'Submit progress',
      resubmitTitle: 'Update your report',
      lockedHint: 'This month has been reviewed and is now read-only.',
      reviewerComment: 'Comment from {name}:',
      submitted: 'Progress submitted',
      conflict: 'This month changed while you were editing. It has been reloaded — check it and submit again.',
      locked: 'This month has just been reviewed and can no longer be changed.',
      failed: 'Your progress could not be submitted. Please try again.',
      loading: 'Loading target',
      loadFailed: 'This target could not be loaded.',
      notFound: 'This target was not found.',
    },

    reminder: {
      title: 'Your monthly target needs a progress report',
      body: 'Share your completion and achievements for {months}.',
      action: 'Submit progress',
    },

    submitForm: {
      completion: 'Completion',
      completionAria: 'Completion percentage',
      completionHint: 'Drag the slider or type a whole number from 0 to 100.',
      percentInvalid: 'Enter a whole number from 0 to 100',
      achievementHeading: 'Achievement {index}',
      achievementTitle: 'Achievement',
      achievementTitleRequired: 'Give the achievement a title',
      achievementDetails: 'Details',
      addAchievement: 'Add achievement',
      removeAchievement: 'Remove achievement {index}',
      achievementsMin: 'Add at least one achievement',
      achievementsMax: 'Add at most {max} achievements',
      updates: 'Updates',
      updatesHint: 'Optional. Anything else your manager should know about the month.',
      submit: 'Submit progress',
      resubmit: 'Update report',
    },
  },
};
