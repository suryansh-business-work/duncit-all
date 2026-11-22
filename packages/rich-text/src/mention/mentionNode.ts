import { Node, mergeAttributes } from '@tiptap/react';

/** Name of the inline mention node in the editor schema. */
export const MENTION_NODE = 'mention';

const attr = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * An @mention: one inline, uneditable token. It is stored in the HTML as
 * `<span data-type="mention" data-id="…" data-label="…">@Label</span>`, which
 * is what an API reads to know who was mentioned. Always registered, so a
 * read-only document still draws the mentions it holds.
 */
export const MentionNode = Node.create({
  name: MENTION_NODE,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      id: {
        default: '',
        parseHTML: (element: HTMLElement) => element.dataset.id ?? '',
        renderHTML: (attributes: Record<string, unknown>) => ({ 'data-id': attr(attributes.id) }),
      },
      label: {
        default: '',
        parseHTML: (element: HTMLElement) => element.dataset.label ?? '',
        renderHTML: (attributes: Record<string, unknown>) => ({ 'data-label': attr(attributes.label) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="mention"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes({ 'data-type': 'mention', class: 'rich-text-mention' }, HTMLAttributes),
      `@${attr(node.attrs.label)}`,
    ];
  },

  renderText({ node }) {
    return `@${attr(node.attrs.label)}`;
  },
});
