package com.duncit.crm.telephony

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView

/**
 * The caller card drawn over the phone's own call screen ("Display over other
 * apps"). Built in code rather than XML because every colour and word comes
 * from the directory file the app wrote — the theme tokens and the localised
 * labels — and a layout file could hold neither.
 *
 * One card at a time; it closes on hang-up, on its Close button, or when the
 * person opens the lead in the app.
 */
internal object CallerOverlay {
  private val main = Handler(Looper.getMainLooper())
  private var shown: View? = null
  private var manager: WindowManager? = null

  fun canShow(context: Context) = Settings.canDrawOverlays(context)

  private fun Context.dp(value: Int) =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

  private fun color(theme: Map<String, String>, key: String, fallbackKey: String? = null): Int? {
    val raw = theme[key] ?: fallbackKey?.let { theme[it] } ?: return null
    return try { Color.parseColor(raw) } catch (_: IllegalArgumentException) { null }
  }

  fun show(context: Context, card: CallerCard, labels: Map<String, String>, theme: Map<String, String>) {
    main.post {
      hideNow()
      val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
      val view = build(context, card, labels, theme)
      val params = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
        PixelFormat.TRANSLUCENT,
      ).apply {
        gravity = Gravity.TOP
        y = context.dp(96)
      }
      try {
        wm.addView(view, params)
        shown = view
        manager = wm
      } catch (_: RuntimeException) {
        // Overlay permission revoked between the check and the add: the
        // notification path is the fallback, so show that instead.
        CrmNotifications.showCaller(context, card, labels)
      }
    }
  }

  fun hide() {
    main.post { hideNow() }
  }

  private fun hideNow() {
    val view = shown ?: return
    try { manager?.removeView(view) } catch (_: RuntimeException) { /* already gone with its window */ }
    shown = null
  }

  private fun line(context: Context, text: String, sizeSp: Float, color: Int?, bold: Boolean = false) =
    TextView(context).apply {
      this.text = text
      setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
      color?.let { setTextColor(it) }
      if (bold) typeface = Typeface.DEFAULT_BOLD
      visibility = if (text.isBlank()) View.GONE else View.VISIBLE
    }

  private fun action(context: Context, label: String, fill: Int?, ink: Int?, onTap: () -> Unit) =
    TextView(context).apply {
      text = label
      gravity = Gravity.CENTER
      typeface = Typeface.DEFAULT_BOLD
      minHeight = context.dp(44)
      setPadding(context.dp(16), context.dp(10), context.dp(16), context.dp(10))
      ink?.let { setTextColor(it) }
      background = GradientDrawable().apply {
        cornerRadius = context.dp(22).toFloat()
        fill?.let { setColor(it) }
      }
      contentDescription = label
      isClickable = true
      setOnClickListener { onTap() }
    }

  private fun build(context: Context, card: CallerCard, labels: Map<String, String>, theme: Map<String, String>): View {
    val ink = color(theme, "ink")
    val muted = color(theme, "muted", "ink")
    val root = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(context.dp(16), context.dp(14), context.dp(16), context.dp(14))
      elevation = context.dp(8).toFloat()
      background = GradientDrawable().apply {
        cornerRadius = context.dp(16).toFloat()
        color(theme, "surface")?.let { setColor(it) }
        color(theme, "primary")?.let { setStroke(context.dp(2), it) }
      }
      val margin = context.dp(12)
      layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        .apply { setMargins(margin, 0, margin, 0) }
    }
    root.addView(line(context, labels["cardHeading"].orEmpty(), 12f, color(theme, "primary"), bold = true))
    root.addView(line(context, card.title, 18f, ink, bold = true))
    root.addView(line(context, card.subtitle, 14f, ink))
    root.addView(line(context, card.detail, 14f, muted))
    root.addView(line(context, card.assignee, 14f, muted))
    root.addView(line(context, card.more, 13f, muted))
    val actions = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.END
      setPadding(0, context.dp(10), 0, 0)
    }
    actions.addView(action(context, labels["close"].orEmpty(), color(theme, "soft"), ink) { hideNow() })
    actions.addView(View(context), LinearLayout.LayoutParams(context.dp(8), 1))
    actions.addView(action(context, labels["openLead"].orEmpty(), color(theme, "primary"), color(theme, "onPrimary")) {
      hideNow()
      val open = Intent(Intent.ACTION_VIEW, card.deepLink)
        .setPackage(context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(open)
    })
    root.addView(actions)
    // The window itself is transparent; the margin around the card comes from this wrapper.
    return LinearLayout(context).apply { addView(root) }
  }
}
