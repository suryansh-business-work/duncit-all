import { z } from 'zod';
import type { EnvMsg91TestInput } from '@duncit/gql-types';
import { DEFAULT_DIAL_CODE, emptyContactDraft, type ContactDraft } from '@duncit/utils';
import type { Translate } from '@duncit/forms/schemas';

/** The number box of Send OTP is the apps' own contact draft, validated the same way. */
export type SendOtpValues = ContactDraft;

export const SEND_OTP_VALUES: SendOtpValues = emptyContactDraft(DEFAULT_DIAL_CODE);

export interface RetryOtpValues {
  req_id: string;
  /** MSG91's channel code as text; '' leaves the choice to the widget. */
  retry_channel: string;
}

export interface VerifyOtpValues {
  req_id: string;
  otp: string;
}

export interface VerifyTokenValues {
  access_token: string;
}

/** MSG91's own code length range — the widget decides where in it a code falls. */
const WIDGET_OTP = /^\d{4,9}$/;

const requestId = (t: Translate) =>
  z.string().trim().min(1, t('tech.msg91.validation.requestIdRequired'));

export const makeRetryOtpSchema = (t: Translate) =>
  z.object({ req_id: requestId(t), retry_channel: z.string() });

export const makeVerifyOtpSchema = (t: Translate) =>
  z.object({
    req_id: requestId(t),
    otp: z.string().trim().regex(WIDGET_OTP, t('tech.msg91.validation.codeInvalid')),
  });

export const makeVerifyTokenSchema = (t: Translate) =>
  z.object({
    access_token: z.string().trim().min(1, t('tech.msg91.validation.tokenRequired')),
  });

/** MSG91's channel codes as `retryOtp` takes them (MSG91_RETRY_CHANNELS on the server). */
export const retryChannelOptions = (t: Translate) => [
  { value: '', label: t('tech.msg91.channelWidgetDefault') },
  { value: '11', label: t('tech.msg91.channelSms') },
  { value: '4', label: t('tech.msg91.channelVoice') },
  { value: '3', label: t('tech.msg91.channelEmail') },
  { value: '12', label: t('tech.msg91.channelWhatsapp') },
];

export const sendOtpInput = (values: SendOtpValues): EnvMsg91TestInput => ({
  action: 'SEND_OTP',
  phone_extension: values.extension.trim(),
  phone_number: values.number.trim(),
});

export const retryOtpInput = (values: RetryOtpValues): EnvMsg91TestInput => ({
  action: 'RETRY_OTP',
  req_id: values.req_id.trim(),
  retry_channel: values.retry_channel ? Number(values.retry_channel) : null,
});

export const verifyOtpInput = (values: VerifyOtpValues): EnvMsg91TestInput => ({
  action: 'VERIFY_OTP',
  req_id: values.req_id.trim(),
  otp: values.otp.trim(),
});

export const verifyTokenInput = (values: VerifyTokenValues): EnvMsg91TestInput => ({
  action: 'VERIFY_ACCESS_TOKEN',
  access_token: values.access_token.trim(),
});
