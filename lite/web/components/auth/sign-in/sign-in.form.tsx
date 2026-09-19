import { useState } from 'react';
import { CodeStep } from './CodeStep';
import { EmailStep } from './EmailStep';
import type { CodeSent } from './sign-in.types';

/** Email, then the code: signing in ends in `completeSignIn`, which the session provider owns. */
export function SignInForm() {
  const [sent, setSent] = useState<CodeSent | null>(null);
  if (sent) return <CodeStep sent={sent} onBack={() => setSent(null)} />;
  return <EmailStep onSent={setSent} />;
}
