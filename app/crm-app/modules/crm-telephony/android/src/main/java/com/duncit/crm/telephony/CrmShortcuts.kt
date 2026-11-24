package com.duncit.crm.telephony

import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.net.Uri

/**
 * Home-screen ways into the CRM dialer:
 *  - long-press shortcuts on the app icon (Dialer, Search leads, Reminders);
 *  - a pinned "Dialer" icon placed on the home screen from Settings.
 * Both are created at run time, not from a resource file, so their names are
 * the localised labels the app passes in.
 */
internal object CrmShortcuts {
  private const val DIALER_ID = "crm_dialer"

  private fun intent(context: Context, path: String) =
    Intent(Intent.ACTION_VIEW, Uri.parse("duncitcrm://$path")).setPackage(context.packageName)

  private fun shortcut(context: Context, id: String, label: String, path: String, icon: Int): ShortcutInfo =
    ShortcutInfo.Builder(context, id)
      .setShortLabel(label)
      .setLongLabel(label)
      .setIcon(Icon.createWithResource(context, icon))
      .setIntent(intent(context, path))
      .build()

  /** The long-press shortcuts, named in the reader's language. */
  fun setDynamic(context: Context, labels: Map<String, String>) {
    val manager = context.getSystemService(ShortcutManager::class.java) ?: return
    val list = listOfNotNull(
      labels["dialer"]?.let { shortcut(context, DIALER_ID, it, "dialer", R.drawable.ic_crm_call) },
      labels["search"]?.let { shortcut(context, "crm_search", it, "leads", R.drawable.ic_crm_search) },
      labels["reminders"]?.let { shortcut(context, "crm_reminders", it, "reminders", R.drawable.ic_crm_event) },
    )
    manager.dynamicShortcuts = list
  }

  fun canPin(context: Context): Boolean =
    context.getSystemService(ShortcutManager::class.java)?.isRequestPinShortcutSupported == true

  /** Ask the launcher to place the Dialer icon on the home screen. False when the launcher cannot. */
  fun pinDialer(context: Context, label: String): Boolean {
    val manager = context.getSystemService(ShortcutManager::class.java) ?: return false
    if (!manager.isRequestPinShortcutSupported) return false
    return manager.requestPinShortcut(shortcut(context, DIALER_ID, label, "dialer", R.drawable.ic_crm_call), null)
  }

  fun clear(context: Context) {
    context.getSystemService(ShortcutManager::class.java)?.removeAllDynamicShortcuts()
  }
}
