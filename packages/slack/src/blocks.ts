import type { SlackBlock, SlackButtonOptions, SlackTextObject } from './types';

/** Block Kit builders — compose rich Slack messages from code without
 * hand-writing the JSON. All return plain objects (no runtime deps). */

export const mrkdwn = (text: string): SlackTextObject => ({ type: 'mrkdwn', text });

export const plainText = (text: string, emoji = true): SlackTextObject => ({
  type: 'plain_text',
  text,
  emoji,
});

const asText = (text: string | SlackTextObject): SlackTextObject =>
  typeof text === 'string' ? mrkdwn(text) : text;

export const header = (text: string): SlackBlock => ({
  type: 'header',
  text: plainText(text),
});

export const section = (text: string | SlackTextObject): SlackBlock => ({
  type: 'section',
  text: asText(text),
});

/** A two-column section built from mrkdwn field strings. */
export const fields = (values: string[]): SlackBlock => ({
  type: 'section',
  fields: values.map((value) => mrkdwn(value)),
});

export const divider = (): SlackBlock => ({ type: 'divider' });

export const context = (elements: Array<string | SlackTextObject>): SlackBlock => ({
  type: 'context',
  elements: elements.map(asText),
});

export const image = (imageUrl: string, altText: string): SlackBlock => ({
  type: 'image',
  image_url: imageUrl,
  alt_text: altText,
});

export const button = (text: string, options: SlackButtonOptions = {}): SlackBlock => {
  const element: SlackBlock = { type: 'button', text: plainText(text) };
  if (options.url) {
    element.url = options.url;
  }
  if (options.value) {
    element.value = options.value;
  }
  if (options.actionId) {
    element.action_id = options.actionId;
  }
  if (options.style) {
    element.style = options.style;
  }
  return element;
};

export const actions = (elements: SlackBlock[]): SlackBlock => ({ type: 'actions', elements });
