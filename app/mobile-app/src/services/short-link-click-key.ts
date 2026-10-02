/**
 * Where this device keeps the short-link click it is attributed to.
 *
 * Its own module because two sides need it: the attribution service writes
 * it, and the consent store deletes it when marketing consent is withdrawn.
 * The attribution service already imports the consent store, so the store
 * importing the key from there would be an import cycle.
 */
export const SHORT_LINK_CLICK_KEY = 'duncit.short_link_click';
