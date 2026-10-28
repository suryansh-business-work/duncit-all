import { useState } from 'react';
import { CodeStep } from './CodeStep';
import { ContactStep } from './ContactStep';
import type { CodeSent } from './sign-in.types';

/** Email or phone, then the code: signing in ends in `completeSignIn`, which the session provider owns. */
export function SignInForm() {
  const [sent, setSent] = useState<CodeSent | null>(null);
  if (sent) return <CodeStep sent={sent} onBack={() => setSent(null)} />;
  return <ContactStep onSent={setSent} />;
}
