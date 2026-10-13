import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import { createLogger } from '@duncit/logs';
import {
  downloadBase64File,
  publicPageHeadlineKey,
  publicPagePosterFileName,
  publicPageQrFileName,
  publicPageTableLabelFileName,
  type PublicPageKind,
  type PublicPageLink,
} from '@duncit/utils';
import { PUBLIC_PAGE_POSTER, VENUE_TABLE_LABEL } from './queries';

export interface PublicPageNotice {
  severity: 'success' | 'error';
  message: string;
}

interface Options {
  kind: PublicPageKind;
  refId?: string | null;
  title: string;
  /** The page also shows a food menu: the scan panel then invites guests to it. */
  offersFood?: boolean;
}

const logger = createLogger('public-page');

const DATA_URL_PREFIX = /^data:[^;]+;base64,/;

/**
 * What the owner does with a published link: copy it, save the QR, and make
 * the A4 poster — and, for a venue, the table label. Every outcome is announced — a download that silently did
 * nothing reads as a broken button.
 */
export function usePublicPageActions({ kind, refId, title, offersFood = false }: Options) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [notice, setNotice] = useState<PublicPageNotice | null>(null);
  const [posterLoading, setPosterLoading] = useState(false);
  const [tableLabelLoading, setTableLabelLoading] = useState(false);
  // The poster and the table label print the same line.
  const headline = t(publicPageHeadlineKey(kind, offersFood));

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

  const tableLabelFailed = (error: unknown) => {
    logger.error('publicPage', 'downloadTableLabel', { error, kind });
    setNotice({ severity: 'error', message: t('publicPage.link.tableLabelFailed') });
  };

  /** A venue's table label: the scan panel alone, with the venue's name under it. */
  const downloadTableLabel = async () => {
    if (!refId) return;
    setTableLabelLoading(true);
    try {
      const { data } = await client.query({
        query: VENUE_TABLE_LABEL,
        variables: { venueId: refId, headline },
        fetchPolicy: 'no-cache',
      });
      const pdf = data?.myVenueTableLabelPdfBase64;
      if (pdf) downloadBase64File(pdf, publicPageTableLabelFileName(title), 'application/pdf');
      else tableLabelFailed(null);
    } catch (error) {
      tableLabelFailed(error);
    } finally {
      setTableLabelLoading(false);
    }
  };

  return {
    copyLink,
    downloadQr,
    downloadPoster,
    posterLoading,
    downloadTableLabel,
    tableLabelLoading,
    notice,
    clearNotice: () => setNotice(null),
  };
}
