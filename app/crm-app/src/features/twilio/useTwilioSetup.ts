import { useState } from 'react';

import {
  CrmAppCreateTwilioEntryDocument,
  CrmAppEnvAccessStatusDocument,
  CrmAppRequestEnvAccessCodeDocument,
  CrmAppTestTwilioEntryDocument,
  CrmAppTwilioEntriesDocument,
  CrmAppUpdateTwilioEntryDocument,
  CrmAppVerifyEnvAccessCodeDocument,
} from '@/graphql/twilio';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import type { Translate } from '@/i18n/fallback';
import { gqlRequest } from '@/services/graphql.client';
import { pickTwilioEntry, twilioConfigPairs, type TwilioValues } from './twilioConfig';

const NO_VARS = {};

export interface CodeChallenge {
  id: string;
  sentTo: string;
}

/**
 * The Twilio settings flow on the Tech portal's own operations: is this
 * session unlocked (the root admin's emailed code), email and check a code,
 * read the TWILIO entry, save it (update, or create the default when there is
 * none), and test it against Twilio. Every rule is the server's.
 */
export function useTwilioSetup(t: Translate) {
  const fallbackError = t('crmApp.common.loadFailed');
  const status = useGqlQuery(CrmAppEnvAccessStatusDocument, NO_VARS, { fallbackError });
  const unlocked = status.data?.envAccessStatus.unlocked ?? false;
  const entries = useGqlQuery(CrmAppTwilioEntriesDocument, NO_VARS, {
    fallbackError,
    skip: !unlocked,
  });
  const [challenge, setChallenge] = useState<CodeChallenge | null>(null);
  const entry = pickTwilioEntry(entries.data?.envEntries);

  const requestCode = async () => {
    const { requestEnvAccessCode } = await gqlRequest(CrmAppRequestEnvAccessCodeDocument);
    setChallenge({ id: requestEnvAccessCode.challenge_id, sentTo: requestEnvAccessCode.sent_to });
  };

  const verify = async (code: string) => {
    if (!challenge) return;
    await gqlRequest(CrmAppVerifyEnvAccessCodeDocument, { challengeId: challenge.id, code });
    await status.refetch();
  };

  /** Saves and returns the entry's id. */
  const save = async (values: TwilioValues): Promise<string> => {
    const config = twilioConfigPairs(values);
    if (entry) {
      await gqlRequest(CrmAppUpdateTwilioEntryDocument, { id: entry.id, input: { config } });
      await entries.refetch();
      return entry.id;
    }
    const { createEnvEntry } = await gqlRequest(CrmAppCreateTwilioEntryDocument, {
      input: {
        name: t('crmApp.twilio.title'),
        category: 'TWILIO',
        is_default: true,
        is_active: true,
        config,
      },
    });
    await entries.refetch();
    return createEnvEntry.id;
  };

  const test = async (id: string) => {
    const { testEnvEntry } = await gqlRequest(CrmAppTestTwilioEntryDocument, { id });
    return testEnvEntry;
  };

  return {
    status,
    unlocked,
    sentTo: challenge?.sentTo ?? status.data?.envAccessStatus.sent_to ?? '',
    challenge,
    entries,
    entry,
    requestCode,
    verify,
    save,
    test,
  };
}
