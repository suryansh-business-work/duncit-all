package com.duncit.crm.telephony

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CallLog
import androidx.core.content.ContextCompat

/** One row of the phone's call log, as the app's call sync reads it. */
internal data class CallLogRow(
  val id: Long,
  val number: String,
  val type: Int,
  val date: Long,
  val durationSeconds: Long,
  val cachedName: String,
)

/**
 * Reads the phone's own call log. The app matches each row against the CRM
 * and drops everything else on the device — only calls with CRM contacts are
 * ever sent to the server.
 */
internal object CallLogReader {
  fun granted(context: Context) =
    ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED

  /** Calls that started after `sinceMs`, oldest first, at most `limit`. */
  fun since(context: Context, sinceMs: Long, limit: Int): List<CallLogRow> {
    if (!granted(context)) return emptyList()
    val projection = arrayOf(
      CallLog.Calls._ID,
      CallLog.Calls.NUMBER,
      CallLog.Calls.TYPE,
      CallLog.Calls.DATE,
      CallLog.Calls.DURATION,
      CallLog.Calls.CACHED_NAME,
    )
    val rows = ArrayList<CallLogRow>()
    context.contentResolver.query(
      CallLog.Calls.CONTENT_URI,
      projection,
      "${CallLog.Calls.DATE} > ?",
      arrayOf(sinceMs.toString()),
      "${CallLog.Calls.DATE} ASC",
    )?.use { cursor ->
      while (cursor.moveToNext() && rows.size < limit) {
        rows.add(
          CallLogRow(
            id = cursor.getLong(0),
            number = cursor.getString(1).orEmpty(),
            type = cursor.getInt(2),
            date = cursor.getLong(3),
            durationSeconds = cursor.getLong(4),
            cachedName = cursor.getString(5).orEmpty(),
          ),
        )
      }
    }
    return rows
  }

  /** The newest calls first, at most `limit` — for the dialer's recent CRM calls. */
  fun newest(context: Context, limit: Int): List<CallLogRow> {
    if (!granted(context)) return emptyList()
    val projection = arrayOf(
      CallLog.Calls._ID,
      CallLog.Calls.NUMBER,
      CallLog.Calls.TYPE,
      CallLog.Calls.DATE,
      CallLog.Calls.DURATION,
      CallLog.Calls.CACHED_NAME,
    )
    val rows = ArrayList<CallLogRow>()
    context.contentResolver.query(CallLog.Calls.CONTENT_URI, projection, null, null, "${CallLog.Calls.DATE} DESC")
      ?.use { cursor ->
        while (cursor.moveToNext() && rows.size < limit) {
          rows.add(
            CallLogRow(
              id = cursor.getLong(0),
              number = cursor.getString(1).orEmpty(),
              type = cursor.getInt(2),
              date = cursor.getLong(3),
              durationSeconds = cursor.getLong(4),
              cachedName = cursor.getString(5).orEmpty(),
            ),
          )
        }
      }
    return rows
  }

  /** The number of the newest call that started at or after `startedAt`, for an outgoing call Android did not name. */
  fun latestNumberSince(context: Context, startedAt: Long): String? =
    since(context, startedAt - 5_000, 50).lastOrNull()?.number?.ifEmpty { null }
}
