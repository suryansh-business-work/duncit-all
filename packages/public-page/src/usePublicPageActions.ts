import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import { createLogger } from '@duncit/logs';
import {
  downloadBase64File,
  publicPagePosterFileName,
  publicPageQrFileName,
  type PublicPageKind,
  type PublicPageLink,
} from '@duncit/utils';
import { PUBLIC_PAGE_POSTER } from './queries';

export interface PublicPageNotice {
  severity: 'success' | 'error';
  message: string;
}

interface Options {
  kind: PublicPageKind;
  refId?: string | null;
  title: string;
}

const logger = createLogger('public-page');

const DATA_URL_PREFIX = /^data:[^;]+;base64,/;

/**
 * What the owner does with a published link: copy it, save the QR, and make
 * the A4 poster. Every outcome is announced — a download that silently did
 * nothing reads as a broken button.
 */
export function usePublicPageActions({ kind, refId, title }: Options) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [notice, setNotice] = useState<PublicPageNotice | null>(null);
  const [posterLoading, setPosterLoading] = useState(false);

  const copyLink = async (link: PublicPageLink) => {
    try {
      await globalThis.navigator.clipboard.writeText(link.url);
      setNotice({ severity: 'success', message: t('publicPage.link.copied') });
    } catch (error) {
      logger.error('publicPage', 'copyLink', { error, kind });
      setNotice({ severity: 'error', message: t('publicPage.link.copyFailed') });
    }
  };

  const downloadQr = (link: PublicPageLink) => {
    try {
      const base64 = link.qr_data_url.replace(DATA_URL_PREFIX, '');
      downloadBase64File(base64, publicPageQrFileName(title), 'image/png');
    } catch (error) {
      logger.error('publicPage', 'downloadQr', { error, kind });
      setNotice({ severity: 'error', message: t('publicPage.link.qrFailed') });
    }
  };

  const posterFailed = (error: unknown) => {
    logger.error('publicPage', 'downloadPoster', { error, kind });
    setNotice({ severity: 'error', message: t('publicPage.link.posterFailed') });
  };

  const downloadPoster = async () => {
    setPosterLoading(true);
    try {
      const headline =
        kind === 'VENUE' ? t('publicPage.poster.venueHeadline') : t('publicPage.poster.hostHeadline');
      const { data } = await client.query({
        query: PUBLIC_PAGE_POSTER,
        variables: {
          kind,
          refId: refId ?? null,
          copy: { headline, footer: t('publicPage.poster.footer') },
        },
        fetchPolicy: 'no-cache',
      });
      const pdf = data?.myPublicPagePosterPdfBase64;
      if (pdf) downloadBase64File(pdf, publicPagePosterFileName(title), 'application/pdf');
      else posterFailed(null);
    } catch (error) {
      posterFailed(error);
    } finally {
      setPosterLoading(false);
    }
  };

  return {
    copyLink,
    downloadQr,
    downloadPoster,
    posterLoading,
    notice,
    clearNotice: () => setNotice(null),
  };
}
