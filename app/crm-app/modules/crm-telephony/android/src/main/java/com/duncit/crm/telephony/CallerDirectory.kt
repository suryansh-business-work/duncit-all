package com.duncit.crm.telephony

import android.content.Context
import org.json.JSONObject
import java.io.File

/** One lead behind one phone number, as the app synced it from the CRM. */
internal data class DirectoryEntry(
  val key: String,
  val entityType: String,
  val leadId: String,
  val leadName: String,
  val contactName: String,
  val status: String,
  val city: String,
  val assignee: String,
)

/** What a ringing number resolved to: the newest lead, and how many more share the number. */
internal data class CallerMatch(val entry: DirectoryEntry, val others: Int)

/**
 * The offline caller ID directory, a JSON file the app writes into its private
 * storage after every sync. It also carries the app's localised labels and its
 * theme colours, because the caller card is drawn by Android code that runs
 * with the app closed — it cannot ask the JS side for either.
 *
 * Parsed once per file version: a call rings, the file is read, and the next
 * call reuses the parse unless the app has synced a new file since.
 */
internal object CallerDirectory {
  const val FILE_NAME = "crm_caller_directory.json"

  internal class Snapshot(
    val entries: Map<String, List<DirectoryEntry>>,
    val labels: Map<String, String>,
    val theme: Map<String, String>,
  )

  @Volatile private var cached: Snapshot? = null
  @Volatile private var cachedStamp = 0L

  private fun file(context: Context) = File(context.filesDir, FILE_NAME)

  /** Write atomically: a call ringing mid-write reads the old file, never half of the new one. */
  fun write(context: Context, json: String) {
    JSONObject(json) // refuse to store anything that will not parse back
    val target = file(context)
    val tmp = File(context.filesDir, "$FILE_NAME.tmp")
    tmp.writeText(json)
    if (!tmp.renameTo(target)) {
      target.writeText(json)
      tmp.delete()
    }
    cached = null
  }

  fun clear(context: Context) {
    file(context).delete()
    cached = null
  }

  fun load(context: Context): Snapshot? {
    val source = file(context)
    if (!source.exists()) return null
    val stamp = source.lastModified()
    cached?.let { if (cachedStamp == stamp) return it }
    val snapshot = parse(source.readText()) ?: return null
    cached = snapshot
    cachedStamp = stamp
    return snapshot
  }

  fun lookup(context: Context, number: String?): CallerMatch? {
    val key = PhoneKeys.key(number)
    if (key.isEmpty()) return null
    val leads = load(context)?.entries?.get(key) ?: return null
    val first = leads.firstOrNull() ?: return null
    return CallerMatch(first, leads.size - 1)
  }

  private fun strings(obj: JSONObject?): Map<String, String> {
    if (obj == null) return emptyMap()
    val out = HashMap<String, String>()
    obj.keys().forEach { name -> out[name] = obj.optString(name) }
    return out
  }

  internal fun parse(json: String): Snapshot? = try {
    val root = JSONObject(json)
    val list = root.optJSONArray("entries")
    val entries = HashMap<String, MutableList<DirectoryEntry>>()
    for (i in 0 until (list?.length() ?: 0)) {
      val row = list!!.optJSONObject(i) ?: continue
      val key = row.optString("k")
      if (key.isEmpty()) continue
      val entry = DirectoryEntry(
        key = key,
        entityType = row.optString("t"),
        leadId = row.optString("id"),
        leadName = row.optString("n"),
        contactName = row.optString("c"),
        status = row.optString("s"),
        city = row.optString("city"),
        assignee = row.optString("a"),
      )
      entries.getOrPut(key) { mutableListOf() }.add(entry)
    }
    Snapshot(entries, strings(root.optJSONObject("labels")), strings(root.optJSONObject("theme")))
  } catch (_: Exception) {
    null
  }
}
