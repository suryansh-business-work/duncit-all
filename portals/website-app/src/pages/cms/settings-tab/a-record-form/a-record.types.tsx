import { z } from 'zod';

type Translate = (key: string) => string;

/** The address only — the hostname is the row it was opened from, the TTL is kept or defaulted server-side. */
export const aRecordSchema = (t: Translate) =>
  z.object({
    ip: z.string().trim().pipe(z.ipv4(t('websiteApp.cms.dns.errIp'))),
  });

export type ARecordFormValues = z.input<ReturnType<typeof aRecordSchema>>;
export type ARecordFormOutput = z.output<ReturnType<typeof aRecordSchema>>;
