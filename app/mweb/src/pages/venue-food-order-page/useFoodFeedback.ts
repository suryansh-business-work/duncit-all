import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import { FOOD_ORDER_ERROR, foodOrderErrorCode } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { postToServer } from '../../utils/imagekit';
import {
  SUBMIT_VENUE_FOOD_FEEDBACK,
  VENUE_FOOD_FEEDBACK_UPLOAD_PASS,
  type FoodOrderAccessVars,
  type SubmitVenueFoodFeedbackData,
  type SubmitVenueFoodFeedbackVars,
  type VenueFoodFeedbackUploadPassData,
} from '../VenueDetailsPage/food/queries';
import type { FoodFeedbackValues } from './food-feedback';

/**
 * Rating a served order: uploading its photos and sending the rating.
 *
 * A guest is usually signed out, so a photo cannot use the account's upload
 * pass — each one gets its own single-use pass issued against the order. The
 * rating's answer carries the order id, so the page's cached order picks the
 * feedback up without a re-read. Native twin: hooks/useFoodFeedback.
 */
export function useFoodFeedback(orderId: string, accessKey: string | null, onRated?: () => void) {
  const { t } = useTranslation();
  const [issuePass] = useMutation<VenueFoodFeedbackUploadPassData, FoodOrderAccessVars>(VENUE_FOOD_FEEDBACK_UPLOAD_PASS);
  const [send, { loading: submitting }] = useMutation<SubmitVenueFoodFeedbackData, SubmitVenueFoodFeedbackVars>(
    SUBMIT_VENUE_FOOD_FEEDBACK,
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** One photo up; its address back, or null when it could not be uploaded (said through `error`). */
  const uploadPhoto = async (file: File): Promise<string | null> => {
    setUploading(true);
    setError(null);
    try {
      const { data } = await issuePass({ variables: { orderId, accessKey } });
      const pass = data?.venueFoodFeedbackUploadPass;
      const url = pass ? await postToServer(file, pass) : null;
      if (!url) setError(t('mweb.venueFood.feedback.uploadFailed'));
      return url;
    } catch (uploadError) {
      logs.mWeb.warn('venueFood', 'uploadFeedbackPhoto', { error: uploadError, orderId });
      setError(t('mweb.venueFood.feedback.uploadFailed'));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const submit = async (values: FoodFeedbackValues) => {
    setError(null);
    try {
      await send({
        variables: {
          input: {
            order_id: orderId,
            access_key: accessKey,
            rating: values.rating,
            comment: values.comment || null,
            images: values.images,
          },
        },
      });
      onRated?.();
    } catch (submitError) {
      const code = foodOrderErrorCode(submitError);
      logs.mWeb.warn('venueFood', 'submitFeedback', { error: submitError, orderId, code });
      // Rated already — from another tab or device. The re-read shows what was said.
      const rated = code === FOOD_ORDER_ERROR.conflict;
      setError(t(rated ? 'mweb.venueFood.feedback.alreadyRated' : 'mweb.venueFood.feedback.submitFailed'));
      if (rated) onRated?.();
    }
  };

  return { uploadPhoto, uploading, submit, submitting, error, clearError: () => setError(null) };
}
