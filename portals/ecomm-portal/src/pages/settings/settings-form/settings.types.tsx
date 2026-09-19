import type { ComponentType } from 'react';
import type { Control, FieldValues } from 'react-hook-form';
import type { z } from 'zod';
import type { Translate } from '../../../lib/translate';
import type { StoreSettings } from '../queries';

export type { StoreSettings };

/** The settings tabs, in the order the strip shows them. */
export type SettingsTab = 'general' | 'checkout' | 'shipping' | 'returns' | 'autoship' | 'seo' | 'pages' | 'occasions';

/**
 * One tab of the settings page: its own schema, the slice of the settings it
 * edits, the partial `StoreSettingsInput` it saves, and the fields it draws.
 * A tab saves ONLY its own fields — the input lists nothing else.
 */
export interface SettingsTabSpec<V extends FieldValues> {
  makeSchema: (t: Translate) => z.ZodType<V, V>;
  toValues: (settings: StoreSettings) => V;
  toInput: (values: V) => Record<string, unknown>;
  Fields: ComponentType<Readonly<{ control: Control<V> }>>;
}

/** An editable list row holding one line of text (a reason). */
export interface TextRow {
  text: string;
}

export const BLANK_TEXT_ROW: TextRow = { text: '' };

export const toTextRows = (lines: readonly string[]): TextRow[] => lines.map((text) => ({ text }));

export const fromTextRows = (rows: readonly TextRow[]): string[] => rows.map((row) => row.text.trim()).filter(Boolean);
