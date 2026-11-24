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

  /** The CRM dialer marks a number just before it places the call. */
  fun markOutgoing(context: Context, number: String) {
    prefs(context).edit().putString(OUTGOING, "${System.currentTimeMillis()}|$number").apply()
  }

  /** The number the CRM dialer just called, if it was dialled in the last two minutes. */
  fun takeOutgoing(context: Context): String? {
    val raw = prefs(context).getString(OUTGOING, null) ?: return null
    prefs(context).edit().remove(OUTGOING).apply()
    val at = raw.substringBefore('|').toLongOrNull() ?: return null
    if (System.currentTimeMillis() - at > OUTGOING_WINDOW_MS) return null
    return raw.substringAfter('|').ifEmpty { null }
  }

  fun savePostCall(context: Context, json: JSONObject) {
    prefs(context).edit().putString(POST_CALL_PENDING, json.toString()).apply()
  }

  fun postCall(context: Context): String? = prefs(context).getString(POST_CALL_PENDING, null)

  fun clearPostCall(context: Context) {
    prefs(context).edit().remove(POST_CALL_PENDING).apply()
  }
}
