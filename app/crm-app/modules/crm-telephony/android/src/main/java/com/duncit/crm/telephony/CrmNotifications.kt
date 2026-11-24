package com.duncit.crm.telephony

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * The two notifications the phone side posts:
 *  - the caller card, as a heads-up, when "Display over other apps" is off;
 *  - "Call ended — add a note", which opens the app's post-call screen.
 * Both are worded by the labels the app synced; with no label there is no
 * notification (nothing English is invented here).
 */
internal object CrmNotifications {
  private const val CHANNEL = "crm_calls"
  private const val CALLER_ID = 4101
  private const val POST_CALL_ID = 4102

  private fun channel(context: Context, labels: Map<String, String>): Boolean {
    val name = labels["channelName"]
    if (name.isNullOrEmpty()) return false
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.createNotificationChannel(NotificationChannel(CHANNEL, name, NotificationManager.IMPORTANCE_HIGH))
    return true
  }

  private fun open(context: Context, uri: Uri, requestCode: Int): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, uri).setPackage(context.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  private fun post(context: Context, id: Int, builder: NotificationCompat.Builder) {
    val manager = NotificationManagerCompat.from(context)
    if (!manager.areNotificationsEnabled()) return
    try {
      manager.notify(id, builder.build())
    } catch (_: SecurityException) {
      // POST_NOTIFICATIONS revoked: the caller card simply does not show.
    }
  }

  fun showCaller(context: Context, card: CallerCard, labels: Map<String, String>) {
    if (!channel(context, labels)) return
    val body = listOf(card.subtitle, card.detail, card.assignee, card.more).filter { it.isNotBlank() }.joinToString("\n")
    val builder = NotificationCompat.Builder(context, CHANNEL)
      .setSmallIcon(R.drawable.ic_crm_call)
      .setContentTitle(card.title)
      .setContentText(card.subtitle)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setAutoCancel(true)
      .setTimeoutAfter(120_000)
      .setContentIntent(open(context, card.deepLink, CALLER_ID))
    post(context, CALLER_ID, builder)
  }

  fun showPostCall(context: Context, who: String, labels: Map<String, String>) {
    val title = labels["postCallTitle"]
    if (title.isNullOrEmpty() || !channel(context, labels)) return
    val builder = NotificationCompat.Builder(context, CHANNEL)
      .setSmallIcon(R.drawable.ic_crm_call)
      .setContentTitle(title.replace("{name}", who))
      .setContentText(labels["postCallBody"].orEmpty())
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setAutoCancel(true)
      .setContentIntent(open(context, Uri.parse("duncitcrm://post-call"), POST_CALL_ID))
    post(context, POST_CALL_ID, builder)
  }
}
