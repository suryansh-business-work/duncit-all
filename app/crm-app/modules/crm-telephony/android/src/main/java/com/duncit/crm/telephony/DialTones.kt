package com.duncit.crm.telephony

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import android.provider.Settings

/**
 * The dial pad's key tones — the same DTMF beeps the phone's own dialer plays
 * — and only when the person keeps "Dialling pad tones" on in the phone's
 * Sound settings, exactly as Samsung Phone does. Played on the DTMF stream, so
 * the phone's volume and silent/vibrate mode apply.
 */
internal object DialTones {
  private const val TONE_MS = 120
  private const val VOLUME = 80

  private val TONES = mapOf(
    '0' to ToneGenerator.TONE_DTMF_0, '1' to ToneGenerator.TONE_DTMF_1,
    '2' to ToneGenerator.TONE_DTMF_2, '3' to ToneGenerator.TONE_DTMF_3,
    '4' to ToneGenerator.TONE_DTMF_4, '5' to ToneGenerator.TONE_DTMF_5,
    '6' to ToneGenerator.TONE_DTMF_6, '7' to ToneGenerator.TONE_DTMF_7,
    '8' to ToneGenerator.TONE_DTMF_8, '9' to ToneGenerator.TONE_DTMF_9,
    '*' to ToneGenerator.TONE_DTMF_S, '#' to ToneGenerator.TONE_DTMF_P,
    '+' to ToneGenerator.TONE_DTMF_0,
  )

  @Volatile private var generator: ToneGenerator? = null

  private fun generator(): ToneGenerator? =
    generator ?: try {
      ToneGenerator(AudioManager.STREAM_DTMF, VOLUME).also { generator = it }
    } catch (_: RuntimeException) {
      // The audio system refused a tone generator (rare, under audio pressure): stay silent.
      null
    }

  /** The phone's own "Dialling pad tones" switch; on unless the person turned it off. */
  private fun enabled(context: Context) =
    Settings.System.getInt(context.contentResolver, Settings.System.DTMF_TONE_WHEN_DIALING, 1) == 1

  /** True when a tone played; false for an unknown key, tones switched off, or no audio. */
  fun play(context: Context, key: String): Boolean {
    val tone = key.firstOrNull()?.let { TONES[it] } ?: return false
    if (!enabled(context)) return false
    return generator()?.startTone(tone, TONE_MS) == true
  }

  fun release() {
    generator?.release()
    generator = null
  }
}
