import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * Save a chat transcript to a cache file and open the OS share sheet so the
 * user can export it (Files, email, etc.). Mirrors mWeb's .txt download.
 */
export async function shareTranscript(filename: string, text: string): Promise<void> {
  const uri = `${FileSystem.cacheDirectory ?? ''}${filename}`;
  await FileSystem.writeAsStringAsync(uri, text);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'text/plain', dialogTitle: 'Share transcript' });
  }
}
