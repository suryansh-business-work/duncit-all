import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { logs } from '@duncit/logs';
import { FOOD_FEEDBACK_LIMITS } from '@duncit/utils';

import { useFoodFeedbackForm } from '@/components/details/venue-food/food-feedback/useFoodFeedbackForm';
import { useTranslation } from '@/hooks/useTranslation';
import { useUploadLimits } from '@/hooks/useUploadLimits';
import {
  foodOrderNativeErrorCode,
  requestFoodFeedbackUploadPass,
  submitFoodFeedback,
} from '@/services/food-order';
import { postFileWithPass } from '@/services/imagekit-upload';

interface Options {
  orderId: string;
  /** The key the order is read with: the rating and its photos are taken with the same one. */
  accessKey: string | null;
  /** The rating went in — or was already there: the order is read again to show it. */
  onDone: () => void;
}

/** The server's answer to a second rating of the same order. */
const ALREADY_RATED = 'CONFLICT';

/**
 * Rating a served food order: the form, its photos and the send. A photo is
 * uploaded as soon as it is picked, each with its own single-use pass from the
 * order — a guest may be signed out, so the usual upload pass is not theirs to
 * ask for. The app has no toast, so each failure is said in place.
 */
export function useFoodFeedback({ orderId, accessKey, onDone }: Options) {
  const { t } = useTranslation();
  const limits = useUploadLimits();
  const form = useFoodFeedbackForm();
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setImages = (images: string[]) =>
    form.setValue('images', images, { shouldDirty: true, shouldValidate: true });

  const addPhoto = async () => {
    if (uploading || form.getValues('images').length >= FOOD_FEEDBACK_LIMITS.imagesMax) return;
    setPhotoError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoError(t('mweb.chatRoom.photoAccessIsNeededToSend'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    const file = {
      uri: asset.uri,
      name: asset.fileName ?? ['food-feedback', String(Date.now()), 'jpg'].join('.'),
      type: asset.mimeType ?? 'image/jpeg',
    };
    const tooLarge = limits.tooLarge({
      name: file.name,
      mimeType: file.type,
      size: asset.fileSize,
    });
    if (tooLarge) {
      setPhotoError(tooLarge);
      return;
    }
    setUploading(true);
    try {
      const pass = await requestFoodFeedbackUploadPass(orderId, accessKey);
      const url = await postFileWithPass(file, pass);
      // Read again: a photo may have been removed while this one was going up.
      setImages([...form.getValues('images'), url]);
    } catch (err) {
      logs.mobileApp.error('venueFood', 'uploadFeedbackPhoto', { error: err, orderId });
      setPhotoError(t('mweb.venueFood.feedback.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (url: string) =>
    setImages(form.getValues('images').filter((image) => image !== url));

  const submit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      await submitFoodFeedback({
        order_id: orderId,
        access_key: accessKey,
        rating: values.rating,
        comment: values.comment,
        images: values.images,
      });
      onDone();
    } catch (err) {
      const rated = foodOrderNativeErrorCode(err) === ALREADY_RATED;
      logs.mobileApp.error('venueFood', 'submitFeedback', { error: err, orderId });
      setError(
        t(rated ? 'mweb.venueFood.feedback.alreadyRated' : 'mweb.venueFood.feedback.submitFailed'),
      );
      // Rated from another device meanwhile: the next read shows that rating.
      if (rated) onDone();
    } finally {
      setSubmitting(false);
    }
  });

  return {
    control: form.control,
    uploading,
    photoError,
    addPhoto,
    removePhoto,
    submitting,
    error,
    submit,
  };
}

export type FoodFeedback = ReturnType<typeof useFoodFeedback>;
