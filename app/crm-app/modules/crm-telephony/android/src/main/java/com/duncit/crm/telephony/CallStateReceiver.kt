package com.duncit.crm.telephony

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager

/**
 * Hears every call state change, with the app open or closed. The work is in
 * CallTracker; IDLE runs off the main thread because the phone writes the call
 * log a moment after the call ends, and the tracker may need to read it.
 */
class CallStateReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
    val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
    // Deprecated for new code but still how a PHONE_STATE broadcast carries the
    // number; it is present only when READ_CALL_LOG is granted.
    @Suppress("DEPRECATION")
    val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
    val app = context.applicationContext
    when (state) {
      TelephonyManager.EXTRA_STATE_RINGING -> CallTracker.onRinging(app, number)
      TelephonyManager.EXTRA_STATE_OFFHOOK -> CallTracker.onOffHook(app, number)
      TelephonyManager.EXTRA_STATE_IDLE -> {
        val pending = goAsync()
        Thread {
          try {
            CallTracker.onIdle(app)
          } finally {
            pending.finish()
          }
        }.start()
      }
    }
  }
}
