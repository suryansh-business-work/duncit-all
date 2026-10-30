import type { VenueRegistrationConfig } from '../../register-venue';

/** How two spellings of one entry are compared — the server ignores case too. */
export const optionKey = (text: string): string => text.trim().toLowerCase();

/** Whether a chip's text holds what the owner typed in the search box. */
export const matchesSearch = (option: string, search: string): boolean => optionKey(option).includes(optionKey(search));

/** The entries a venue chose that the catalogue does not offer — its own, kept on this venue only. */
export function ownEntriesOf(chosen: readonly string[], catalogue: readonly string[]): string[] {
  const known = new Set(catalogue.map(optionKey));
  return chosen.filter((entry) => !known.has(optionKey(entry)));
}

/** No client-side cap: stands in until the config has answered, so the server's own limit decides. */
export const NO_OWN_OPTION_CAP = Number.MAX_SAFE_INTEGER;

export interface OwnOptionLimits {
  /** Entries of its own a venue may add to one list. */
  limit: number;
  /** Characters in one such entry. */
  maxLength: number;
}

export const ownOptionLimitsOf = (
  config: Pick<VenueRegistrationConfig, 'own_option_limit' | 'own_option_max_length'>,
): OwnOptionLimits => ({
  limit: config.own_option_limit ?? NO_OWN_OPTION_CAP,
  maxLength: config.own_option_max_length ?? NO_OWN_OPTION_CAP,
});
