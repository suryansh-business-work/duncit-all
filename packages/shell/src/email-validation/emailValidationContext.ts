import { createContext, useContext } from 'react';

/** What any screen in a console can ask of the one Validate dialog the shell hosts. */
export interface EmailValidationApi {
  /** Open the dialog and validate this address now. */
  open: (email: string) => void;
}

const EmailValidationContext = createContext<EmailValidationApi | null>(null);

export const EmailValidationContextProvider = EmailValidationContext.Provider;

/** Null outside a signed-in console — the Validate button then renders nothing. */
export function useEmailValidation(): EmailValidationApi | null {
  return useContext(EmailValidationContext);
}
