package com.duncit.crm.telephony

import android.net.Uri

/**
 * The words on the caller card, already localised. Every sentence comes from
 * the labels the app wrote with the directory (the server's localisation, then
 * the app's bundled fallback); a missing label leaves its line out rather than
 * showing English the reader did not choose.
 */
internal data class CallerCard(
  val title: String,
  val subtitle: String,
  val detail: String,
  val assignee: String,
  val more: String,
  val deepLink: Uri,
) {
  companion object {
    private fun fill(template: String?, vararg pairs: Pair<String, String>): String {
      if (template.isNullOrEmpty()) return ""
      var text: String = template
      for ((name, value) in pairs) text = text.replace("{$name}", value)
      return text
    }

    private fun joined(vararg parts: String) = parts.filter { it.isNotBlank() }.joinToString(" · ")

    fun from(match: CallerMatch, labels: Map<String, String>): CallerCard {
      val entry = match.entry
      val kind = labels["kind.${entry.entityType}"].orEmpty()
      return CallerCard(
        title = entry.leadName,
        subtitle = joined(entry.contactName, kind),
        detail = joined(entry.status, entry.city),
        assignee = if (entry.assignee.isBlank()) "" else fill(labels["assignedTo"], "name" to entry.assignee),
        more = if (match.others > 0) fill(labels["moreLeads"], "count" to match.others.toString()) else "",
        deepLink = leadLink(entry.entityType, entry.leadId),
      )
    }

    fun leadLink(entityType: String, leadId: String): Uri =
      Uri.Builder().scheme("duncitcrm").authority("lead").appendPath(entityType).appendPath(leadId).build()
  }
}
