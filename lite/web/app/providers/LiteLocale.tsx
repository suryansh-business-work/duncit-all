import { useCallback, type ReactNode } from 'react';
import { useMutation } from '@apollo/client/react';
import { LocaleProvider } from '@duncit/app-settings';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { LITE_SET_MY_LOCALE, type LiteMe } from '../../../shared/graphql/documents';
import { WEB_FALLBACK } from '../../../shared/i18n';
import { useLiteSession } from '../../../shared/session';

/** The account's saved language wins over the browser's, and a switch is saved back to the account. */
export function LiteLocale({ children }: Readonly<{ children: ReactNode }>) {
  const { me, signedIn } = useLiteSession();
  const [setMyLocale] = useMutation<{ liteSetMyLocale: Pick<LiteMe, 'id' | 'locale'> }, { locale: string }>(LITE_SET_MY_LOCALE);
  const onLocaleChange = useCallback(
    (code: string) => {
      if (!signedIn) return;
      setMyLocale({ variables: { locale: code } }).catch((error: unknown) => notifyError(parseApiError(error)));
    },
    [signedIn, setMyLocale],
  );
  return (
    <LocaleProvider fallback={WEB_FALLBACK} userLocale={me?.locale ?? null} onLocaleChange={onLocaleChange}>
      {children}
    </LocaleProvider>
  );
}
