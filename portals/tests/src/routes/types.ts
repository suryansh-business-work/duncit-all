import type { ReactElement } from 'react';

/** Wraps a page in the login gate, the app shell and its page error boundary. */
export type Authed = (element: ReactElement) => ReactElement;
