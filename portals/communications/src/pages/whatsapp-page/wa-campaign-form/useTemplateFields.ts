import { useEffect } from 'react';
import type {
  FieldValues,
  Path,
  PathValue,
  UseFormGetValues,
  UseFormSetValue,
} from 'react-hook-form';
import type { AisensyCampaign, AisensyTemplate } from '../queries';
import { dynamicButtons, type TemplateFieldValues } from './template-fields';

/**
 * Lay the send's fields out from the template it will actually go on.
 *
 * The template owns the count — of body variables and of CTA links — so the
 * operator never adds or removes one, and the server's arity gate is
 * unreachable rather than duplicated here.
 *
 * TWO THINGS THIS HAS TO GET RIGHT, and both were wrong before:
 *
 * 1. Values survive a re-lay. They are carried across BY POSITION, so switching
 *    campaign trims or pads rather than blanking what is already typed. The old
 *    campaign form re-laid whenever the row count differed from the template's,
 *    which wiped every filled row the moment anything changed the count; the
 *    test form re-laid on every count change with no carry-over at all.
 *
 * 2. It waits for the reset. `resetCount` is bumped by the dialog's own reset,
 *    and it is what triggers a re-lay on open — never `open` itself. On the
 *    render where `open` flips, the watched values still belong to the LAST
 *    send, so the template derived from them is the wrong template, and laying
 *    out from it would truncate the params a duplicated send arrived with.
 */
interface Args<T extends FieldValues> {
  /** Bumped once per dialog reset — see the note above. */
  resetCount: number;
  template: AisensyTemplate | null;
  /** The campaign picked, for the header asset it was built with in AiSensy. */
  campaign: AisensyCampaign | null;
  setValue: UseFormSetValue<T>;
  getValues: UseFormGetValues<T>;
}

export function useTemplateFields<T extends FieldValues>({
  resetCount,
  template,
  campaign,
  setValue,
  getValues,
}: Readonly<Args<T>>): void {
  const known = template !== null;
  const paramCount = template?.param_count ?? 0;
  const needsMedia = template?.needs_media === true;
  const campaignUrl = campaign?.media_url ?? '';
  const campaignFilename = campaign?.media_filename ?? '';
  // A primitive, so an AiSensy re-read that returns identical data re-creates
  // the button objects without re-laying the rows underneath the operator.
  const positionKey = dynamicButtons(template)
    .map((button) => button.position)
    .join(',');

  useEffect(() => {
    const set = (name: string, value: unknown) => {
      setValue(name as Path<T>, value as PathValue<T, Path<T>>, { shouldValidate: true });
    };
    // The asset follows the CAMPAIGN, which AiSensy can answer for even when its
    // template cannot be read. Its own asset is the prefill, so the common case
    // is one glance rather than one lookup; typing over it is the override, and
    // that survives until the campaign itself changes.
    set('media_required', needsMedia);
    set('media_url', campaignUrl);
    set('media_filename', campaignFilename);

    // Rows can only be laid out from a template. With none, leave them alone —
    // that keeps a duplicated send's own values usable.
    if (!known) return;
    const current = getValues() as unknown as TemplateFieldValues;
    set(
      'template_params',
      Array.from({ length: paramCount }, (_, index) => ({
        value: current.template_params?.[index]?.value ?? '',
      }))
    );
    const positions = positionKey ? positionKey.split(',').map(Number) : [];
    set(
      'buttons',
      positions.map((position) => ({
        index: position,
        value: current.buttons?.find((row) => row.index === position)?.value ?? '',
      }))
    );
  }, [
    resetCount,
    known,
    paramCount,
    positionKey,
    needsMedia,
    campaignUrl,
    campaignFilename,
    setValue,
    getValues,
  ]);
}
