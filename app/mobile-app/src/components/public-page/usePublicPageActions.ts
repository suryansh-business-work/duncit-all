import { useCallback, useState } from 'react';
import { Linking, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { logs } from '@duncit/logs';
import {
  publicPagePosterFileName,
  publicPageQrFileName,
  type PublicPageKind,
  type PublicPageLink,
} from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { fetchPosterBase64, qrBase64, shareBase64File } from './publicPageRequests';

/** How long a "copied" / failure line stays up. */
const NOTICE_MS = 4000;

export interface PublicPageNotice {
  text: string;
  tone: 'success' | 'danger';
}

export type PublicPageBusy = 'qr' | 'poster' | null;

/**
 * What the owner does with a published page: copy, share or open the link,
 * save the QR and download the A4 poster. The app has no toast, so the outcome
 * of each press is said in place through `notice` (as ContactsInviteBar does).
 */
export function usePublicPageActions(
  kind: PublicPageKind,
  refId: string | null,
  title: string,
  link: PublicPageLink | null,
) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState<PublicPageNotice | null>(null);
  const [busy, setBusy] = useState<PublicPageBusy>(null);

  const say = useCallback((next: PublicPageNotice) => {
    setNotice(next);
    globalThis.setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);

  const fail = useCallback(
    (action: string, error: unknown, key: string) => {
      logs.mobileApp.error('public-page', action, { error, kind });
      say({ text: key, tone: 'danger' });
    },
    [kind, say],
  );

  const copy = useCallback(async () => {
    if (!link) return;
    try {
      await Clipboard.setStringAsync(link.url);
      say({ text: t('publicPage.link.copied'), tone: 'success' });
    } catch (error) {
      fail('copy', error, t('publicPage.link.copyFailed'));
    }
  }, [fail, link, say, t]);

  const share = useCallback(async () => {
    if (!link) return;
    try {
      await Share.share({
        title,
        message: t('publicPage.link.shareMessage', { vars: { name: title, url: link.url } }),
      });
    } catch (error) {
      fail('share', error, t('mweb.common.somethingWentWrong'));
    }
  }, [fail, link, t, title]);

  const open = useCallback(async () => {
    if (!link) return;
    try {
      await Linking.openURL(link.url);
    } catch (error) {
      fail('open', error, t('mweb.common.somethingWentWrong'));
    }
  }, [fail, link, t]);

  const downloadQr = useCallback(async () => {
    if (!link) return;
    setBusy('qr');
    try {
      const saved = await shareBase64File(
        qrBase64(link.qr_data_url),
        publicPageQrFileName(title),
        'image/png',
      );
      if (!saved) fail('downloadQr', null, t('publicPage.link.qrFailed'));
    } catch (error) {
      fail('downloadQr', error, t('publicPage.link.qrFailed'));
    } finally {
      setBusy(null);
    }
  }, [fail, link, t, title]);

  const downloadPoster = useCallback(async () => {
    setBusy('poster');
    try {
      const headline =
        kind === 'VENUE'
          ? t('publicPage.poster.venueHeadline')
          : t('publicPage.poster.hostHeadline');
      const base64 = await fetchPosterBase64(kind, refId, {
        headline,
        footer: t('publicPage.poster.footer'),
      });
      const saved = await shareBase64File(
        base64,
        publicPagePosterFileName(title),
        'application/pdf',
      );
      if (!saved) fail('downloadPoster', null, t('publicPage.link.posterFailed'));
    } catch (error) {
      fail('downloadPoster', error, t('publicPage.link.posterFailed'));
    } finally {
      setBusy(null);
    }
  }, [fail, kind, refId, t, title]);

  return { copy, share, open, downloadQr, downloadPoster, notice, busy };
}
