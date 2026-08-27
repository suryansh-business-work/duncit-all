/**
 * Both entrypoints load and export what the docs promise.
 *
 * The root is what the native app imports, so this also guards the split: a
 * React or MUI import that slips into the framework-free half breaks the app's
 * Metro build and nothing else, which is a failure that only shows in deploy.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@duncit/media-picker', () => ({
  useImagekitBase64Upload: () => ({ upload: vi.fn(), uploading: false }),
}));

vi.mock('@duncit/ai-monitoring/mui', () => ({
  AiMonitoringChip: () => null,
}));

describe('@duncit/verification', () => {
  it('exports the framework-free surface from the root', async () => {
    const mod = await import('../src');
    for (const name of [
      'STATUS_META',
      'TONE_CHIP_COLOR',
      'TONE_HEX',
      'VERIFICATION_LABEL_KEYS',
      'isVerificationLocked',
      'isVerificationSettled',
      'rejectReasonOf',
      'uploadLabelKey',
      'MAX_DOC_BYTES',
      'DOCUMENT_ACCEPT',
      'base64ByteSize',
      'isDocumentTooLarge',
      'ADDRESS_FIELDS',
      'addressValuesFrom',
      'blankAddressValues',
      'buildAddressInput',
      'isAddressComplete',
      'makeAddressSchema',
    ]) {
      expect(mod, name).toHaveProperty(name);
    }
  });
});

describe('@duncit/verification/mui', () => {
  it('exports the cards and the operations behind them', async () => {
    const mod = await import('../src/mui');
    for (const name of [
      'VerificationCards',
      'VerificationCardShell',
      'IdentityCard',
      'AddressCard',
      'EmailCard',
      'MY_VERIFICATIONS',
      'SUBMIT_VERIFICATION',
      'SUBMIT_ADDRESS_VERIFICATION',
      'useTranslation',
      'fallbackT',
    ]) {
      expect(mod, name).toHaveProperty(name);
    }
  });
});
