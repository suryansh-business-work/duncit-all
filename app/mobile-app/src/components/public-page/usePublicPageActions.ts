import { useCallback, useState } from 'react';
import { Linking, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { logs } from '@duncit/logs';
import {
  publicPageHeadlineKey,
  publicPagePosterFileName,
  publicPageQrFileName,
  publicPageTableLabelFileName,
  type PublicPageKind,
  type PublicPageLink,
} from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import {
  fetchPosterBase64,
  fetchTableLabelBase64,
  qrBase64,
  shareBase64File,
} from './publicPageRequests';

/** How long a "copied" / failure line stays up. */
const NOTICE_MS = 4000;

export interface PublicPageNotice {
  text: string;
  tone: 'success' | 'danger';
}

export type PublicPageBusy = 'qr' | 'poster' | 'label' | null;

/**
 * What the owner does with a published page: copy, share or open the link,
 * save the QR and download the A4 poster — and, for a venue, the small label
 * for its tables. The app has no toast, so the outcome
 * of each press is said in place through `notice` (as ContactsInviteBar does).
 */
export function usePublicPageActions(
  kind: PublicPageKind,
  refId: string | null,
  title: string,
  link: PublicPageLink | null,
  /** The venue serves food: the poster and the table label invite guests to its menu too. */
  offersFood = false,
) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState<PublicPageNotice | null>(null);
  const [busy, setBusy] = useState<PublicPageBusy>(null);
  // One line for the poster and the table label, so the two always print the same.
  const headline = t(publicPageHeadlineKey(kind, offersFood));

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
  }, [fail, headline, kind, refId, t, title]);

  const downloadTableLabel = useCallback(async () => {
    // Only a venue has tables to put a label on.
    if (kind !== 'VENUE' || !refId) return;
    setBusy('label');
    try {
      const base64 = await fetchTableLabelBase64(refId, headline);
      const saved = await shareBase64File(
        base64,
        publicPageTableLabelFileName(title),
        'application/pdf',
      );
      if (!saved) fail('downloadTableLabel', null, t('publicPage.link.tableLabelFailed'));
    } catch (error) {
      fail('downloadTableLabel', error, t('publicPage.link.tableLabelFailed'));
    } finally {
      setBusy(null);
    }
  }, [fail, headline, kind, refId, t, title]);

  return { copy, share, open, downloadQr, downloadPoster, downloadTableLabel, notice, busy };
}
