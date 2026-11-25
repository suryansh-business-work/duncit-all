package com.duncit.crm.telephony

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

/**
 * The JS face of the phone side: dial, read the call log, find recordings,
 * keep the offline caller directory, and place the home-screen entry points.
 * Every decision about WHICH call or file belongs to which lead is made in the
 * app's TypeScript (tested there); this module only reads and writes.
 */
class CrmTelephonyModule : Module() {
  private val context: Context
    get() = appContext.reactContext?.applicationContext ?: throw CodedException("ERR_NO_CONTEXT", "The app is not ready", null)

  private fun granted(permission: String) =
    ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

  override fun definition() = ModuleDefinition {
    Name("CrmTelephony")

    /** A normal SIM call. Without CALL_PHONE the phone's dialer opens with the number filled in. */
    Function("placeCall") { number: String ->
      val digits = number.filter { it.isDigit() || it == '+' }
      if (digits.isEmpty()) throw CodedException("ERR_NUMBER", "There is no number to call", null)
      CrmPrefs.markOutgoing(context, digits)
      val direct = granted(Manifest.permission.CALL_PHONE)
      val intent = Intent(if (direct) Intent.ACTION_CALL else Intent.ACTION_DIAL, Uri.parse("tel:$digits"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      direct
    }

    AsyncFunction("getCallLog") { sinceMs: Double, limit: Int ->
      CallLogReader.since(context, sinceMs.toLong(), limit.coerceIn(1, 500)).map {
        mapOf(
          "id" to it.id.toString(),
          "number" to it.number,
          "type" to it.type,
          "date" to it.date.toDouble(),
          "durationSeconds" to it.durationSeconds.toInt(),
          "cachedName" to it.cachedName,
        )
      }
    }

    AsyncFunction("findRecordings") { fromMs: Double, toMs: Double ->
      RecordingFinder.between(context, fromMs.toLong(), toMs.toLong()).map {
        mapOf(
          "uri" to it.uri,
          "name" to it.name,
          "sizeBytes" to it.sizeBytes.toDouble(),
          "addedAtMs" to it.addedAtMs.toDouble(),
          "durationMs" to it.durationMs.toDouble(),
          "mimeType" to it.mimeType,
          "relativePath" to it.relativePath,
        )
      }
    }

    AsyncFunction("recordingFolders") { sinceMs: Double ->
      RecordingFinder.callFolders(context, sinceMs.toLong()).map {
        mapOf("relativePath" to it.relativePath, "count" to it.count, "latestMs" to it.latestMs.toDouble())
      }
    }

    Function("diagnostics") { CallingDiagnostics.read(context) }

    Function("requestRedirectionRole") { CallingDiagnostics.requestRedirectionRole(appContext.currentActivity) }

    Function("testCallerCard") { CallingDiagnostics.testCallerCard(context) }

    AsyncFunction("copyRecordingToCache") { uri: String, fileName: String ->
      "file://" + RecordingFinder.copyToCache(context, uri, fileName)
    }

    AsyncFunction("deleteCachedRecording") { path: String ->
      RecordingFinder.deleteCached(context, path.removePrefix("file://"))
    }

    AsyncFunction("writeDirectory") { json: String ->
      CallerDirectory.write(context, json)
      val labels = CallerDirectory.load(context)?.labels.orEmpty()
      CrmShortcuts.setDynamic(context, labels.filterKeys { it == "dialer" || it == "search" || it == "reminders" })
      CrmWidgetProvider.refreshAll(context)
    }

    AsyncFunction("lookupNumber") { number: String ->
      val match = CallerDirectory.lookup(context, number) ?: return@AsyncFunction null
      mapOf(
        "entityType" to match.entry.entityType,
        "leadId" to match.entry.leadId,
        "leadName" to match.entry.leadName,
        "contactName" to match.entry.contactName,
        "others" to match.others,
      )
    }

    /** Sign-out: nothing about the CRM stays on the phone. */
    AsyncFunction("clearAll") {
      CallerDirectory.clear(context)
      CrmPrefs.clearPostCall(context)
      CrmPrefs.saveActive(context, null)
      CrmPrefs.setEnabled(context, false, false)
      CallSyncScheduler.cancel(context)
      CrmShortcuts.clear(context)
      CrmWidgetProvider.refreshAll(context)
    }

    Function("setFeatures") { callerId: Boolean, postCall: Boolean ->
      CrmPrefs.setEnabled(context, callerId, postCall)
    }

    Function("takePendingPostCall") {
      val raw = CrmPrefs.postCall(context) ?: return@Function null
      CrmPrefs.clearPostCall(context)
      val json = JSONObject(raw)
      json.keys().asSequence().associateWith { json.opt(it) }
    }

    Function("canDrawOverlays") { Settings.canDrawOverlays(context) }

    Function("openOverlaySettings") {
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("canPinShortcut") { CrmShortcuts.canPin(context) }

    Function("pinDialerShortcut") { label: String -> CrmShortcuts.pinDialer(context, label) }
  }
}
