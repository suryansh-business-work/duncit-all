package com.duncit.crm.telephony

import android.content.Context
import org.json.JSONObject

/**
 * One call from ring (or dial) to hang-up.
 *
 *  - RINGING: an incoming CRM contact shows its caller card at once, from the
 *    offline directory — no network, no app process needed.
 *  - OFFHOOK: answered (incoming) or dialled (outgoing). An outgoing call is
 *    known by the number the CRM dialer marked just before dialling, or that
 *    the call-redirection service saw for any other dialer (Samsung Phone).
 *  - IDLE: the card goes away, and a call with a CRM contact leaves a
 *    "call ended — add a note" notification plus a pending post-call record
 *    the app opens on its next start, and schedules the call sync.
 *
 * Nothing about a call with a number that is not in the CRM is kept or shown:
 * an employee's personal calls never reach the app.
 */
internal object CallTracker {
  /** The phone writes its call log a moment after hang-up. */
  private const val CALL_LOG_SETTLE_MS = 1500L

  fun onRinging(context: Context, number: String?) {
    // Android sends RINGING twice when READ_CALL_LOG is granted: first without
    // the number, then with it. Only the second can be matched.
    if (number.isNullOrBlank()) return
    CrmPrefs.saveActive(context, CrmPrefs.ActiveCall(number, "INBOUND", System.currentTimeMillis(), false, false))
    if (CrmPrefs.callerIdEnabled(context)) showCaller(context, number)
  }

  fun onOffHook(context: Context, number: String?) {
    val active = CrmPrefs.active(context)
    if (active != null && active.direction == "INBOUND") {
      if (!active.answered) CrmPrefs.saveActive(context, active.copy(answered = true))
      return
    }
    if (active != null) return
    // Named by the CRM dialer, or by the call-redirection service for any other dialer.
    val dialled = CrmPrefs.takeOutgoing(context)
    val dialledNumber = dialled?.number ?: number.orEmpty()
    CrmPrefs.saveActive(
      context,
      CrmPrefs.ActiveCall(dialledNumber, "OUTBOUND", System.currentTimeMillis(), true, dialled?.fromCrm == true),
    )
    if (dialledNumber.isNotEmpty() && CrmPrefs.callerIdEnabled(context)) showCaller(context, dialledNumber)
  }

  fun onIdle(context: Context) {
    CallerOverlay.hide()
    val active = CrmPrefs.active(context) ?: return
    CrmPrefs.saveActive(context, null)
    val endedAt = System.currentTimeMillis()
    var number = active.number
    if (number.isEmpty()) {
      Thread.sleep(CALL_LOG_SETTLE_MS)
      number = CallLogReader.latestNumberSince(context, active.startedAt).orEmpty()
    }
    val match = CallerDirectory.lookup(context, number)
    // A number the CRM dialer called still gets its post-call screen even when
    // the offline directory has not caught up with a lead made minutes ago.
    if (match == null && !active.fromCrm) return
    if (!CrmPrefs.postCallEnabled(context)) return
    val record = JSONObject()
      .put("number", number)
      .put("direction", active.direction)
      .put("answered", active.answered)
      .put("startedAt", active.startedAt)
      .put("endedAt", endedAt)
    if (match != null) {
      record.put("entityType", match.entry.entityType)
        .put("leadId", match.entry.leadId)
        .put("leadName", match.entry.leadName)
        .put("contactName", match.entry.contactName)
    }
    CrmPrefs.savePostCall(context, record)
    // Log it now, app open or closed, instead of waiting for the next app open.
    CallSyncScheduler.afterCall(context)
    val labels = CallerDirectory.load(context)?.labels.orEmpty()
    CrmNotifications.showPostCall(context, match?.entry?.leadName ?: number, labels)
  }

  private fun showCaller(context: Context, number: String) {
    val match = CallerDirectory.lookup(context, number) ?: return
    val snapshot = CallerDirectory.load(context) ?: return
    val card = CallerCard.from(match, snapshot.labels)
    if (CallerOverlay.canShow(context)) {
      CallerOverlay.show(context, card, snapshot.labels, snapshot.theme)
    } else {
      CrmNotifications.showCaller(context, card, snapshot.labels)
    }
  }
}
