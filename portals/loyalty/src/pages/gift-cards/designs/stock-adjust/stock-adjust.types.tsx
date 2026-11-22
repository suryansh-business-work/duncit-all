import { z } from 'zod';
import { DIGITS } from '@duncit/regex';
import type { Translator } from '@duncit/app-settings';

/** The server's ceilings: one adjustment and the reason it carries. */
export const STOCK_LIMITS = { maxChange: 100_000, reasonMax: 300 } as const;

export type StockDirection = 'ADD' | 'REMOVE';

export interface StockAdjustValues {
  direction: StockDirection;
  quantity: string;
  reason: string;
}

export interface StockAdjustFormProps {
  open: boolean;
  designName: string;
  currentStock: number;
  busy: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  /** The signed change (+ add, − remove) and why. */
  onSubmit: (delta: number, reason: string) => Promise<void> | void;
}

export const BLANK_STOCK_ADJUST: StockAdjustValues = { direction: 'ADD', quantity: '', reason: '' };

/** Removing more cards than are in stock is refused here, as the server would. */
export const makeStockAdjustSchema = (t: Translator['t'], currentStock: number) =>
  z
    .object({
      direction: z.enum(['ADD', 'REMOVE']),
      quantity: z
        .string()
        .trim()
        .regex(DIGITS, t('loyalty.designs.stockQuantityInvalid', { vars: { max: STOCK_LIMITS.maxChange } }))
        .refine((v) => Number(v) >= 1 && Number(v) <= STOCK_LIMITS.maxChange, {
          message: t('loyalty.designs.stockQuantityInvalid', { vars: { max: STOCK_LIMITS.maxChange } }),
        }),
      reason: z
        .string()
        .trim()
        .min(1, t('loyalty.designs.stockReasonRequired'))
        .max(STOCK_LIMITS.reasonMax, t('loyalty.designs.stockReasonMax', { vars: { max: STOCK_LIMITS.reasonMax } })),
    })
    .refine((v) => v.direction === 'ADD' || Number(v.quantity) <= currentStock, {
      path: ['quantity'],
      message: t('loyalty.designs.stockRemoveTooMany', { vars: { n: currentStock } }),
    });

/** Schema-valid values → the signed change the mutation takes. */
export const toStockDelta = (values: StockAdjustValues): number =>
  (values.direction === 'REMOVE' ? -1 : 1) * Number.parseInt(values.quantity, 10);
