import { useMemo, useState, type ReactNode } from 'react';
import { TableEmailActionProvider, type TableEmailAction } from '@duncit/table';
import { EmailValidateButton } from './EmailValidateButton';
import { EmailValidationDialog } from './EmailValidationDialog';
import { EmailValidationContextProvider, type EmailValidationApi } from './emailValidationContext';

export interface EmailValidationProviderProps {
  /** No signed-in person, or no portal key to log against — no Validate buttons anywhere. */
  enabled: boolean;
  /** This console's portal key (`appConfig.key`). */
  portal: string;
  children: ReactNode;
}

/** Every grid's email cell gets the same button; it reads the dialog from context. */
const renderTableAction: TableEmailAction = (email) => <EmailValidateButton email={email} />;

/**
 * Email validation for a whole console: one dialog, opened from any Validate
 * button — the ones every grid puts beside its email column, and any a page
 * places itself with `EmailValidateButton`.
 */
export function EmailValidationProvider({ enabled, portal, children }: Readonly<EmailValidationProviderProps>) {
  const [email, setEmail] = useState<string | null>(null);
  const api = useMemo<EmailValidationApi | null>(() => (enabled && portal ? { open: setEmail } : null), [enabled, portal]);

  return (
    <EmailValidationContextProvider value={api}>
      <TableEmailActionProvider value={api ? renderTableAction : null}>
        {children}
        {api ? <EmailValidationDialog email={email} portal={portal} onClose={() => setEmail(null)} /> : null}
      </TableEmailActionProvider>
    </EmailValidationContextProvider>
  );
}
