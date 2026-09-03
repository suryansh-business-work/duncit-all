import type { NestedCatalogue } from '../catalogue';

/**
 * Venue availability copy — the calendar, its day editor and the recurring
 * availability dialog — as a namespace of its own, not a surface's.
 *
 * `@duncit/availability-calendar` renders these sentences in the Partners and
 * Onboarding consoles AND in mWeb, and the native app renders the same
 * calendar through its own Tamagui view. A package's `t()` resolves through
 * whichever surface mounted it, so copy parked under `shell.*` printed raw
 * keys the moment mWeb opened the calendar offline — mWeb ships `mweb.*`, not
 * the shell's bundle. One namespace, shipped by all three surfaces, is the
 * only shape that renders everywhere (rules 27 + 38 + 40).
 *
 * The rules themselves (which slot is addable, what a recurring run creates)
 * live in `@duncit/slots`; the words that explain them live here.
 */
export const AVAILABILITY_BUNDLE: NestedCatalogue = {
  availability: {
    // The day drawer and its add-slot form.
    drawerTitle: 'Availability',
    addTitle: 'Add availability',
    close: 'Close',
    cancel: 'Cancel',
    delete: 'Delete',
    holidayAlert: 'This date is marked as a venue leave/holiday — slots cannot be added or booked.',
    addSlot: 'Add slot',
    adding: 'Adding…',
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
    wholeDay: 'Whole day',
    wholeVenue: 'Whole venue',
    wholeDayHint: 'Book the entire date(s) — no time selection needed.',
    startDate: 'Start date',
    startTime: 'Start time',
    endDate: 'End date',
    endTime: 'End time',
    multiDayHint: 'This creates one continuous multi-day booking (e.g. a multi-day activity or event).',
    price: 'Price (₹)',
    priceHint: 'Leave 0 for a free slot',
    notes: 'Notes (optional)',
    // The calendar grid.
    onLeave: 'Venue on leave',
    leaveTag: 'LEAVE',
    onLeaveNotBookable: 'Venue on leave — not bookable',
    weekday: {
      sun: 'Sun',
      mon: 'Mon',
      tue: 'Tue',
      wed: 'Wed',
      thu: 'Thu',
      fri: 'Fri',
      sat: 'Sat',
    },
    weekdayFull: {
      sunday: 'Sunday',
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
    },
    // The existing-slot list inside the day drawer.
    existingSlots: 'Existing slots',
    noSlotsForDate: 'No slots for this date yet.',
    free: 'Free',
    wholeDayRange: 'Whole day · {from} – {to}',
    timeRange: '{from} – {to}',
    requestedByPod: 'Requested by pod',
    bookedByPod: 'Booked by pod',
    awaitingDecision: 'Awaiting your decision — approve or decline it under Slot Requests.',
    block: 'Block',
    unblock: 'Unblock',
    createFailed: 'Could not create slot',
    updateFailed: 'Could not update slot',
    deleteFailed: 'Could not delete slot',
    deleteTitle: 'Delete this slot?',
    deleteBody: 'This permanently removes the time slot. Booked slots cannot be deleted.',
    // The add-slot form judges the draft against a live clock, so these read
    // as reasons a slot cannot be added rather than as submit failures.
    pickDates: 'Pick the start and end date.',
    pickSlotTimes: 'Pick the start and end time.',
    endDateAfterStart: 'End date must be on or after the start date.',
    sameTime: 'Start and end time cannot be the same.',
    endAfterStart: 'End must be after start.',
    startInFuture: 'Start time must be in the future.',
    maxAhead: 'Slots can only be scheduled up to {days} days ahead.',
    // The toolbar above the calendar and the legend under it.
    toolbar: {
      calendarView: 'Calendar view',
      day: 'Day',
      week: 'Week',
      month: 'Month',
      previous: 'Previous',
      next: 'Next',
      today: 'Today',
      recurring: 'Recurring availability',
    },
    legend: {
      available: 'A — Available',
      pending: 'P — Pending approval',
      booked: 'B — Booked',
      blocked: '× — Blocked',
      leave: 'Leave / Holiday',
    },
    // The recurring-availability dialog: a date range, the weekdays, the
    // daily windows, a price per space and what to do on a clash.
    recurring: {
      title: 'Recurring availability',
      subtitle: 'Create slots with custom timing, pricing and venue settings.',
      advancedSettings: 'Advanced settings',
      creating: 'Creating…',
      createSlot: 'Create 1 slot',
      createSlots: 'Create {count} slots',
      createFailed: 'Could not create slots.',
      wholeDayHint: 'Each selected day becomes one whole-day booking — no time windows needed.',
      repeatOn: 'Repeat on',
      repeatOnDays: 'Repeat on days',
      all: 'All',
      weekdays: 'Weekdays',
      weekends: 'Weekends',
      timeSlots: 'Time slots',
      start: 'Start',
      startN: 'Start #{n}',
      end: 'End',
      removeTimeSlot: 'Remove time slot {n}',
      addRange: 'Add time slot',
      venueHours: 'Venue hours {open}–{close}.',
      keepGap: 'Keep a {minutes}-min gap between slots.',
      noOverlap: 'Slots must not overlap.',
      pricingBySpace: 'Pricing by space',
      pricingBySpaceHint: 'Each space is priced separately and creates its own slots (same times, own capacity).',
      includeSpace: 'Include {space}',
      capacity: 'Capacity {capacity}',
      spacePrice: '{space} price',
      // What a recurring run does when a generated slot lands on a time the
      // space is already published for. Skip is the default; Overwrite is
      // destructive, so its warning is part of the choice, not a footnote.
      whenSlotsOverlap: 'When a slot already exists',
      overlapSkip: 'Keep the existing slot',
      overlapSkipHint: 'Slots that clash with one already published are not created.',
      overlapReplace: 'Overwrite the existing slot',
      overlapReplaceHint: 'The existing slot is deleted and the new one takes its place.',
      overlapReplaceWarning:
        'Overwriting permanently deletes the slots already published for the same space and time, together with their price and notes. Booked slots and pending booking requests are never deleted — new slots clashing with one are skipped instead.',
      // Why a run cannot be generated — one sentence per generator code.
      pickDates: 'Pick a start and end date.',
      endDateAfterStart: 'End date must be on or after the start date.',
      pickWeekday: 'Select at least one day to repeat on.',
      addTimeSlot: 'Add at least one time slot.',
      invalidTime: 'Enter a valid start and end time for every time slot.',
      endAfterStart: 'Each time slot must end after it starts.',
      beforeOpen: 'A time slot starts before the venue opens ({open}).',
      afterClose: 'A time slot ends after the venue closes ({close}).',
      overlap: 'Time slots must not overlap.',
      bufferGap: 'Keep at least a {buffer}-minute gap between time slots.',
      addSpace: 'Add at least one space with a price.',
      negativePrice: 'Price cannot be negative.',
      // The live preview bar under the form.
      preview: {
        slotsToCreate: 'Slots to be created',
        slotsCount: '{count} Slots',
        priceCap: '{price} · cap {capacity}',
        totalRevenue: 'Total revenue (est.)',
        autoSkipped: 'Auto-skipped: {list}',
        skipWeeklyOff: '{count} weekly-off',
        skipHoliday: '{count} holiday',
        skipPast: '{count} past',
        skipBeyondCap: '{count} beyond {days} days',
      },
    },
    // The four "Advanced settings" accordions inside the recurring dialog.
    rules: {
      title: 'Venue rules',
      caption: 'Buffer, booking window and advance-booking limits',
      bufferMinutes: 'Buffer between slots (min)',
      minNotice: 'Minimum booking notice (min)',
      maxAdvance: 'Maximum advance booking (days)',
      maxBookings: 'Maximum bookings per slot',
      allowInstant: 'Allow instant booking',
      allowWaitlist: 'Allow waitlist',
      approvalRequired: 'Booking approval required',
      allowMultiple: 'Allow multiple bookings',
      saved: 'Venue rules saved.',
      saving: 'Saving…',
      save: 'Save rules',
    },
    autoExtend: {
      title: 'Future availability',
      caption: 'Keep slots published automatically',
      toggle: 'Auto-extend availability',
      body: 'A daily job keeps slots published ahead using your default slot template — no need to re-open this dialog. Slots are added up to the window below (max {days} days, set under Venue rules).',
      noDefaultTemplate:
        'You don’t have a default template yet. Save one under “Save as template” and mark it default — auto-extend rolls that template forward.',
      horizon: 'Keep published ahead (days, max {days})',
      stopOn: 'Stop on (optional)',
      clear: 'Clear',
      saveFailed: 'Could not save auto-extend. Please try again.',
      saved: 'Auto-extend saved.',
      saving: 'Saving…',
      save: 'Save auto-extend',
    },
    templates: {
      title: 'Save as template',
      caption: 'Reuse this setup later in one tap',
      default: 'Default',
      use: 'Use',
      delete: 'Delete {name}',
      name: 'Template name',
      saving: 'Saving…',
      save: 'Save',
    },
    bulk: {
      title: 'Bulk actions',
      caption: 'Delete or update many upcoming slots at once',
      filterHint:
        'Filter (all optional — empty means every upcoming non-booked slot). Booked slots are never affected.',
      from: 'From',
      to: 'To',
      deleteMatching: 'Delete matching',
      disable: 'Disable',
      enable: 'Enable',
      newPrice: 'New price (₹)',
      setPrice: 'Set price',
      confirmTitle: 'Are you sure?',
      confirm: 'Confirm',
      confirmDelete: 'Delete all matching upcoming slots? This cannot be undone.',
      confirmDisable: 'Disable (block) all matching slots?',
      confirmEnable: 'Enable (unblock) all matching slots?',
      confirmReprice: 'Re-price all matching upcoming slots to ₹{price}? Existing prices are overwritten.',
      deleted: 'Deleted {count} slot(s).',
      updated: '{action}: {count} updated.',
      updatedSkipped: '{action}: {count} updated, {skipped} skipped.',
      actionDisabled: 'Disabled',
      actionEnabled: 'Enabled',
      actionRepriced: 'Re-priced',
    },
  },
};
