package com.duncit.crm.telephony

import android.Manifest
import android.app.Activity
import android.app.ActivityManager
import android.app.role.RoleManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.telecom.TelecomManager
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

/**
 * Everything Settings › Calling & recording shows about this phone: which
 * permissions and special accesses the call features have, who the default
 * dialer is, whether Android may stop the app in the background, and a test of
 * the caller card. Read-only, except asking for the call-redirection role.
 */
internal object CallingDiagnostics {
  private const val ROLE_REQUEST_CODE = 4103
  private const val TEST_CARD_MS = 8_000L

  private fun granted(context: Context, permission: String) =
    ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

  /** minSdk is 29 (Android 10), so the role manager is always there. */
  private fun roles(context: Context): RoleManager? = context.getSystemService(RoleManager::class.java)

  private fun appLabel(context: Context, packageName: String): String = try {
    val pm = context.packageManager
    pm.getApplicationLabel(pm.getApplicationInfo(packageName, 0)).toString()
  } catch (_: PackageManager.NameNotFoundException) {
    packageName
  }

  fun read(context: Context): Map<String, Any> {
    val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    val activity = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val telecom = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
    val dialer = telecom.defaultDialerPackage.orEmpty()
    val roleManager = roles(context)
    return mapOf(
      "manufacturer" to Build.MANUFACTURER.orEmpty(),
      "model" to Build.MODEL.orEmpty(),
      "sdk" to Build.VERSION.SDK_INT,
      "phoneState" to granted(context, Manifest.permission.READ_PHONE_STATE),
      "callLog" to granted(context, Manifest.permission.READ_CALL_LOG),
      "overlay" to Settings.canDrawOverlays(context),
      "notifications" to NotificationManagerCompat.from(context).areNotificationsEnabled(),
      "defaultDialer" to (if (dialer.isEmpty()) "" else appLabel(context, dialer)),
      "dialerIsDuncit" to (dialer == context.packageName),
      "redirectionAvailable" to (roleManager?.isRoleAvailable(RoleManager.ROLE_CALL_REDIRECTION) == true),
      "redirectionHeld" to (roleManager?.isRoleHeld(RoleManager.ROLE_CALL_REDIRECTION) == true),
      "batteryUnrestricted" to power.isIgnoringBatteryOptimizations(context.packageName),
      "backgroundRestricted" to activity.isBackgroundRestricted,
      "callerIdOn" to CrmPrefs.callerIdEnabled(context),
      "autoLogOn" to CrmPrefs.postCallEnabled(context),
      "directoryNumbers" to (CallerDirectory.load(context)?.entries?.size ?: 0),
    )
  }

  /** Ask Android to make Duncit the call-redirecting app (outgoing caller ID). False when it cannot ask here. */
  fun requestRedirectionRole(activity: Activity?): Boolean {
    if (activity == null) return false
    val roleManager = roles(activity) ?: return false
    if (!roleManager.isRoleAvailable(RoleManager.ROLE_CALL_REDIRECTION)) return false
    if (roleManager.isRoleHeld(RoleManager.ROLE_CALL_REDIRECTION)) return true
    val request = roleManager.createRequestRoleIntent(RoleManager.ROLE_CALL_REDIRECTION)
    activity.runOnUiThread { activity.startActivityForResult(request, ROLE_REQUEST_CODE) }
    return true
  }

  /**
   * Show the caller card for the first number in the directory, as a ringing
   * CRM contact would. "overlay" or "notification" says how it showed; "empty"
   * means the directory has no numbers yet (sync first).
   */
  fun testCallerCard(context: Context): String {
    val snapshot = CallerDirectory.load(context) ?: return "empty"
    val entry = snapshot.entries.values.firstOrNull()?.firstOrNull() ?: return "empty"
    val card = CallerCard.from(CallerMatch(entry, 0), snapshot.labels)
    if (!CallerOverlay.canShow(context)) {
      CrmNotifications.showCaller(context, card, snapshot.labels)
      return "notification"
    }
    CallerOverlay.show(context, card, snapshot.labels, snapshot.theme)
    Handler(Looper.getMainLooper()).postDelayed({ CallerOverlay.hide() }, TEST_CARD_MS)
    return "overlay"
  }
}
