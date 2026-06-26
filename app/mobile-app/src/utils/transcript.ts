import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** A server transcript export: filename + plain text + base64 of the file. */
export interface Transcript {
  filename: string;
  text: string;
  content_base64?: string | null;
}

/**
 * Save a chat/ticket transcript to a cache file and open the OS share sheet so
 * the user can export it (Files, email, etc.). A `.docx` filename writes the
 * base64 binary with the Office mime; otherwise the plain text is shared as
 * `.txt`. Mirrors mWeb's .txt/.docx downloads (Bug 15).
 */
export async function shareTranscript(transcript: Transcript): Promise<void> {
  const { filename, text, content_base64: base64 } = transcript;
  const uri = `${FileSystem.cacheDirectory ?? ''}${filename}`;
  const isDocx = filename.endsWith('.docx');
  if (isDocx && base64) {
    await FileSystem.writeAsStringAsync(uri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else {
    await FileSystem.writeAsStringAsync(uri, text);
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: isDocx ? DOCX_MIME : 'text/plain',
      dialogTitle: 'Share transcript',
    });
  }
}
