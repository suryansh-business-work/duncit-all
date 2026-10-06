import { z } from 'zod';
import type { CmsSiteCodeInput } from '@duncit/gql-types';
import type { CmsSiteDesignData } from '../../queries/sites';

const MAX_CODE = 200_000;

export const codeSchema = () =>
  z.object({
    head_html: z.string().max(MAX_CODE),
    body_end_html: z.string().max(MAX_CODE),
    custom_css: z.string().max(1_000_000),
    custom_js: z.string().max(MAX_CODE),
  });

export type CodeFormValues = z.input<ReturnType<typeof codeSchema>>;
export type CodeFormOutput = z.output<ReturnType<typeof codeSchema>>;

export const toCodeFormValues = (site: CmsSiteDesignData['cmsSite']): CodeFormValues => ({
  head_html: site?.head_html ?? '',
  body_end_html: site?.body_end_html ?? '',
  custom_css: site?.custom_css ?? '',
  custom_js: site?.custom_js ?? '',
});

export const toCodeInput = (values: CodeFormOutput): CmsSiteCodeInput => ({ ...values });
