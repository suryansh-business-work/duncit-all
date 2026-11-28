import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { PLATFORMS } from '../copy';
import type { SocialPendingAccount, SocialPendingConnection, SocialPlatform } from '../queries';

/** The accounts the marketer ticked, by key (platform:network id). */
export interface ConnectPickerFormValues {
  keys: string[];
}

export interface ConnectPickerFormProps {
  connection: SocialPendingConnection;
  onSubmit: (keys: string[]) => Promise<void>;
  onCancel: () => void;
}

/** Everything not yet connected starts ticked: the person picked these on the network's own consent screen. */
export const defaultPickerValues = (connection: SocialPendingConnection): ConnectPickerFormValues => ({
  keys: connection.accounts.filter((account) => !account.connected).map((account) => account.key),
});

/** The found accounts by platform, in the page's platform order; platforms with none are left out. */
export function byPlatform(accounts: readonly SocialPendingAccount[]): { platform: SocialPlatform; accounts: SocialPendingAccount[] }[] {
  return PLATFORMS.map((platform) => ({ platform, accounts: accounts.filter((account) => account.platform === platform) })).filter(
    (group) => group.accounts.length > 0
  );
}

/** How many accounts a submit creates or refreshes: the ticked ones, and on a Reconnect the connected ones too. */
export const savedCount = (connection: SocialPendingConnection, keys: readonly string[]): number =>
  keys.length + (connection.reconnect ? connection.accounts.filter((account) => account.connected).length : 0);

/** At least one account must be created or refreshed; the server refuses an empty pick too. */
export const connectPickerSchema = (t: Translate, connection: SocialPendingConnection) =>
  z.object({ keys: z.array(z.string()) }).refine((values) => savedCount(connection, values.keys) > 0, {
    path: ['keys'],
    message: t('marketing.socialPicker.tickOne'),
  });
