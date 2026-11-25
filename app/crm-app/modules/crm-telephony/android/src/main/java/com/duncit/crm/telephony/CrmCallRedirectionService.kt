package com.duncit.crm.telephony

import android.net.Uri
import android.telecom.CallRedirectionService
import android.telecom.PhoneAccountHandle

/**
 * Learns the number of an outgoing call placed from ANY dialer — the Samsung
 * Phone app, a contact, a link — so the caller card can show during the call.
 * Android hides that number from the call-state broadcast; only the app that
 * holds the "call redirecting app" role is told it. Duncit never redirects or
 * blocks anything: every call goes through unchanged at once.
 *
 * The number is kept only until the call connects (CallTracker takes it at
 * OFFHOOK and forgets it); a number that is not in the CRM is never shown,
 * stored past that moment, or sent anywhere.
 *
 * This role is separate from "Caller ID & spam" (call screening), so it works
 * beside Truecaller and leaves Samsung Phone as the default dialer.
 */
class CrmCallRedirectionService : CallRedirectionService() {
  override fun onPlaceCall(handle: Uri, initialPhoneAccount: PhoneAccountHandle, allowInteractiveResponse: Boolean) {
    try {
      val number = handle.schemeSpecificPart.orEmpty()
      if (number.isNotEmpty()) CrmPrefs.markDialled(applicationContext, number, fromCrm = false)
    } finally {
      placeCallUnmodified()
    }
  }
}
