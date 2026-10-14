import type { CampaignButton } from '@modules/platform/aisensy/aisensy.gateway';
import type { AisensyTemplateButton } from '@modules/platform/aisensy/aisensy.project';

/**
 * A template's dynamic link button, and what one send fills it with.
 *
 * A call site knows the URL its message is about — it already writes it into
 * the body. It does not know whether the live template carries a CTA button,
 * where that button sits, or which fixed part of the link the template holds,
 * and it should not have to: an operator builds the template, not the code.
 *
 * So the template's button is cached on the scenario row (by Reconcile, or by
 * the send binding the campaign itself), and the send fills it only when the
 * URL it was given starts with the button's fixed part. AiSensy does not
 * document what it does with a `buttons` value for a template that has no
 * dynamic link (see `campaignPayload`), so a template without one is sent
 * exactly as before, and the link still reaches the reader in the body.
 */
export interface LinkButton {
  /** Its position among the template's CTA buttons — what AiSensy indexes by. */
  index: number;
  /** The template's link with its `{{n}}` intact, e.g. `https://mweb.duncit.com/{{6}}`. */
  url: string;
}

/** The first CTA button whose link carries a `{{n}}`, or null. */
export function linkButtonOf(buttons?: readonly AisensyTemplateButton[] | null): LinkButton | null {
  const list = buttons ?? [];
  const index = list.findIndex((button) => button.type === 'URL' && button.url_param > 0);
  return index >= 0 ? { index, url: list[index].url } : null;
}

/** The pair the scenario row caches it under — blank when the template has none. */
export const linkButtonFields = (buttons?: readonly AisensyTemplateButton[] | null) => {
  const button = linkButtonOf(buttons);
  return { template_link_url: button?.url ?? '', template_link_index: button?.index ?? -1 };
};

/** The cached pair back as a button, or null when the row holds none. */
export const cachedLinkButton = (url?: string | null, index?: number | null): LinkButton | null =>
  url && typeof index === 'number' && index >= 0 ? { index, url } : null;

/**
 * The value that fills the button for this link: the part of `link` the
 * template's own fixed text around `{{n}}` leaves open. Empty when there is no
 * button, no link, or the link does not fit it — a value that does not fit
 * would open a broken page, which is worse than no button at all.
 */
export function buttonsFor(link: string | null | undefined, button: LinkButton | null): CampaignButton[] {
  const url = (link ?? '').trim();
  if (!url || !button) return [];
  const open = button.url.indexOf('{{');
  const close = button.url.indexOf('}}', open);
  if (open < 0 || close < 0) return [];
  const head = button.url.slice(0, open);
  const tail = button.url.slice(close + 2);
  if (!url.startsWith(head) || !url.endsWith(tail) || url.length <= head.length + tail.length) return [];
  return [{ index: button.index, value: url.slice(head.length, url.length - tail.length) }];
}
