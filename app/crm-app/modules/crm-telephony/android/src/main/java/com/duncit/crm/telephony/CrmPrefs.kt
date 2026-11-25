package com.duncit.crm.telephony

import android.content.Context
import org.json.JSONObject

/**
 * The few facts the call receiver keeps between broadcasts. Android delivers
 * RINGING, OFFHOOK and IDLE as separate broadcasts, possibly to separate
 * processes, so the call in progress lives in SharedPreferences, not memory.
 */
internal object CrmPrefs {
  private const val NAME = "crm_telephony"
  private const val CALLER_ID = "caller_id_enabled"
  private const val POST_CALL = "post_call_enabled"
  private const val ACTIVE = "active_call"
  private const val OUTGOING = "pending_outgoing"
  private const val POST_CALL_PENDING = "pending_post_call"

  /** A CRM-dialled number counts for this long while Android connects the call. */
  private const val OUTGOING_WINDOW_MS = 2 * 60 * 1000L

  private fun prefs(context: Context) = context.getSharedPreferences(NAME, Context.MODE_PRIVATE)

  fun setEnabled(context: Context, callerId: Boolean, postCall: Boolean) {
    prefs(context).edit().putBoolean(CALLER_ID, callerId).putBoolean(POST_CALL, postCall).apply()
  }

  fun callerIdEnabled(context: Context) = prefs(context).getBoolean(CALLER_ID, false)
  fun postCallEnabled(context: Context) = prefs(context).getBoolean(POST_CALL, false)

  data class ActiveCall(val number: String, val direction: String, val startedAt: Long, val answered: Boolean, val fromCrm: Boolean)

  fun saveActive(context: Context, call: ActiveCall?) {
    val editor = prefs(context).edit()
    if (call == null) {
      editor.remove(ACTIVE)
    } else {
      val json = JSONObject()
        .put("number", call.number)
        .put("direction", call.direction)
        .put("startedAt", call.startedAt)
        .put("answered", call.answered)
        .put("fromCrm", call.fromCrm)
      editor.putString(ACTIVE, json.toString())
    }
    editor.apply()
  }

  fun active(context: Context): ActiveCall? {
    val raw = prefs(context).getString(ACTIVE, null) ?: return null
    return try {
      val json = JSONObject(raw)
      ActiveCall(
        json.optString("number"),
        json.optString("direction"),
        json.optLong("startedAt"),
        json.optBoolean("answered"),
        json.optBoolean("fromCrm"),
      )
    } catch (_: Exception) {
      null
    }
  }

  /** A number about to be called, and whether the CRM dialer placed it. */
  data class Dialled(val number: String, val fromCrm: Boolean)

  /** The CRM dialer marks a number just before it places the call. */
  fun markOutgoing(context: Context, number: String) = markDialled(context, number, fromCrm = true)

  /**
   * Remember the number of a call being placed. The CRM dialer marks it first;
   * the call-redirection service then sees the same call from Android a moment
   * later and must not erase that it came from the CRM.
   */
  fun markDialled(context: Context, number: String, fromCrm: Boolean) {
    val current = peekOutgoing(context)
    if (!fromCrm && current != null && current.fromCrm && PhoneKeys.key(current.number) == PhoneKeys.key(number)) return
    val flag = if (fromCrm) "1" else "0"
    prefs(context).edit().putString(OUTGOING, "${System.currentTimeMillis()}|$flag|$number").apply()
  }

  /** The number just dialled, if it was dialled in the last two minutes; reading it forgets it. */
  fun takeOutgoing(context: Context): Dialled? {
    val dialled = peekOutgoing(context)
    prefs(context).edit().remove(OUTGOING).apply()
    return dialled
  }

  private fun peekOutgoing(context: Context): Dialled? {
    val raw = prefs(context).getString(OUTGOING, null) ?: return null
    val parts = raw.split('|', limit = 3)
    val at = parts.firstOrNull()?.toLongOrNull() ?: return null
    if (System.currentTimeMillis() - at > OUTGOING_WINDOW_MS) return null
    // "time|number" was written by an app version before the redirection service: always the CRM dialer.
    val dialled = if (parts.size == 3) Dialled(parts[2], parts[1] == "1") else Dialled(parts.getOrElse(1) { "" }, true)
    return dialled.takeIf { it.number.isNotEmpty() }
  }

  fun savePostCall(context: Context, json: JSONObject) {
    prefs(context).edit().putString(POST_CALL_PENDING, json.toString()).apply()
  }

  fun postCall(context: Context): String? = prefs(context).getString(POST_CALL_PENDING, null)

  fun clearPostCall(context: Context) {
    prefs(context).edit().remove(POST_CALL_PENDING).apply()
  }
}
