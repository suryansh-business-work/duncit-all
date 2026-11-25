package com.duncit.crm.telephony

import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.provider.MediaStore
import java.io.File

/** An audio file the phone saved, a candidate for a call's recording. */
internal data class RecordingFile(
  val uri: String,
  val name: String,
  val sizeBytes: Long,
  val addedAtMs: Long,
  val durationMs: Long,
  val mimeType: String,
  val relativePath: String,
)

/**
 * Finds the phone's own call recordings. Android 10+ does not let any
 * third-party app record call audio, so the CRM app never records: it picks up
 * the file the phone's built-in recorder saved (Samsung, Xiaomi, OnePlus,
 * Vivo… keep them in shared storage) and the app decides which file belongs to
 * which call.
 */
internal object RecordingFinder {
  fun between(context: Context, fromMs: Long, toMs: Long): List<RecordingFile> {
    val projection = arrayOf(
      MediaStore.Audio.Media._ID,
      MediaStore.Audio.Media.DISPLAY_NAME,
      MediaStore.Audio.Media.SIZE,
      MediaStore.Audio.Media.DATE_ADDED,
      MediaStore.Audio.Media.DURATION,
      MediaStore.Audio.Media.MIME_TYPE,
      MediaStore.Audio.Media.RELATIVE_PATH,
    )
    val out = ArrayList<RecordingFile>()
    val collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
    context.contentResolver.query(
      collection,
      projection,
      "${MediaStore.Audio.Media.DATE_ADDED} BETWEEN ? AND ?",
      // DATE_ADDED is in seconds.
      arrayOf((fromMs / 1000).toString(), (toMs / 1000).toString()),
      "${MediaStore.Audio.Media.DATE_ADDED} ASC",
    )?.use { cursor ->
      while (cursor.moveToNext()) {
        val id = cursor.getLong(0)
        out.add(
          RecordingFile(
            uri = ContentUris.withAppendedId(collection, id).toString(),
            name = cursor.getString(1).orEmpty(),
            sizeBytes = cursor.getLong(2),
            addedAtMs = cursor.getLong(3) * 1000,
            durationMs = cursor.getLong(4),
            mimeType = cursor.getString(5).orEmpty(),
            relativePath = cursor.getString(6).orEmpty(),
          ),
        )
      }
    }
    return out
  }

  /** A folder the phone's call recorder saves into, found by looking — no brand's path is assumed. */
  internal data class CallFolder(val relativePath: String, val count: Int, val latestMs: Long)

  /**
   * The folders holding call recordings since `sinceMs`: every audio folder or
   * file whose name mentions a call ("Recordings/Call/" on Samsung, "MIUI/sound_recorder/call_rec"
   * on Xiaomi…), newest first. Empty without the audio permission.
   */
  fun callFolders(context: Context, sinceMs: Long): List<CallFolder> {
    val byFolder = LinkedHashMap<String, MutableList<RecordingFile>>()
    for (file in between(context, sinceMs, System.currentTimeMillis())) {
      if (!"${file.relativePath} ${file.name}".contains("call", ignoreCase = true)) continue
      byFolder.getOrPut(file.relativePath) { mutableListOf() }.add(file)
    }
    return byFolder.map { (path, files) -> CallFolder(path, files.size, files.maxOf { it.addedAtMs }) }
      .sortedByDescending { it.latestMs }
  }

  /** Copy a content:// recording into the app cache so it can be uploaded; returns the file path. */
  fun copyToCache(context: Context, uri: String, fileName: String): String {
    val dir = File(context.cacheDir, "recordings").apply { mkdirs() }
    val safeName = fileName.replace(Regex("[^A-Za-z0-9._-]"), "_").take(120).ifEmpty { "recording" }
    val target = File(dir, safeName)
    context.contentResolver.openInputStream(Uri.parse(uri)).use { input ->
      requireNotNull(input) { "The recording could not be opened" }
      target.outputStream().use { output -> input.copyTo(output) }
    }
    return target.absolutePath
  }

  /** Remove an uploaded copy; only ever inside the app's own recordings cache. */
  fun deleteCached(context: Context, path: String): Boolean {
    val dir = File(context.cacheDir, "recordings").canonicalFile
    val file = File(path).canonicalFile
    return file.parentFile == dir && file.delete()
  }
}
