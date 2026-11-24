package com.duncit.crm.telephony

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.widget.RemoteViews

/**
 * The Duncit CRM home-screen widget: one tap to the dialer (which places a
 * normal SIM call), to lead search, or to reminders. Its words and colours are
 * the labels and theme the app synced with the caller directory; it redraws
 * whenever the app writes a new one.
 */
class CrmWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, widgetIds: IntArray) {
    render(context, manager, widgetIds)
  }

  companion object {
    private fun tap(context: Context, path: String, requestCode: Int): PendingIntent {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("duncitcrm://$path"))
        .setPackage(context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    private fun parse(raw: String?): Int? = try { raw?.let { Color.parseColor(it) } } catch (_: IllegalArgumentException) { null }

    fun render(context: Context, manager: AppWidgetManager, widgetIds: IntArray) {
      val snapshot = CallerDirectory.load(context)
      val labels = snapshot?.labels.orEmpty()
      val theme = snapshot?.theme.orEmpty()
      for (id in widgetIds) {
        val views = RemoteViews(context.packageName, R.layout.crm_widget)
        views.setTextViewText(R.id.crm_widget_title, labels["widgetTitle"].orEmpty())
        views.setTextViewText(R.id.crm_widget_dial_label, labels["dialer"].orEmpty())
        views.setTextViewText(R.id.crm_widget_search_label, labels["search"].orEmpty())
        views.setTextViewText(R.id.crm_widget_reminders_label, labels["reminders"].orEmpty())
        views.setContentDescription(R.id.crm_widget_dial, labels["dialer"].orEmpty())
        views.setContentDescription(R.id.crm_widget_search, labels["search"].orEmpty())
        views.setContentDescription(R.id.crm_widget_reminders, labels["reminders"].orEmpty())
        parse(theme["surface"])?.let { views.setInt(android.R.id.background, "setBackgroundColor", it) }
        parse(theme["ink"])?.let { ink ->
          for (text in listOf(R.id.crm_widget_title, R.id.crm_widget_dial_label, R.id.crm_widget_search_label, R.id.crm_widget_reminders_label)) {
            views.setTextColor(text, ink)
          }
        }
        parse(theme["primary"])?.let { primary ->
          for (icon in listOf(R.id.crm_widget_dial_icon, R.id.crm_widget_search_icon, R.id.crm_widget_reminders_icon)) {
            views.setInt(icon, "setColorFilter", primary)
          }
        }
        views.setOnClickPendingIntent(R.id.crm_widget_dial, tap(context, "dialer", 1))
        views.setOnClickPendingIntent(R.id.crm_widget_search, tap(context, "leads", 2))
        views.setOnClickPendingIntent(R.id.crm_widget_reminders, tap(context, "reminders", 3))
        manager.updateAppWidget(id, views)
      }
    }

    /** Redraw every placed widget (after the app writes new labels or theme). */
    fun refreshAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, CrmWidgetProvider::class.java))
      if (ids.isNotEmpty()) render(context, manager, ids)
    }
  }
}
