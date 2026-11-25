package com.duncit.crm.telephony

/**
 * How two phone numbers are compared: their last ten digits, and only when at
 * least seven are present. The same rule as the server's duplicatePhoneKey and
 * the app's phoneKey, so "+91 98765 43210", "098765 43210" and "9876543210"
 * are one number everywhere.
 */
internal object PhoneKeys {
  private const val MIN_DIGITS = 7
  private const val KEY_LENGTH = 10

  fun key(raw: String?): String {
    val digits = raw?.filter { it.isDigit() } ?: return ""
    val key = if (digits.length > KEY_LENGTH) digits.takeLast(KEY_LENGTH) else digits
    return if (key.length >= MIN_DIGITS) key else ""
  }
}
