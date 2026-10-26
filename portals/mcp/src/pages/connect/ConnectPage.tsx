import { useSearchParams } from 'react-router';
import ConsentPanel from './ConsentPanel';
import ConnectorsPanel from './ConnectorsPanel';

/**
 * Connect. With `?request=<id>` it is the OAuth consent screen the server's
 * /authorize redirects to (the login gate carries the query through sign-in);
 * without one it lists the connector URLs and how to add them to each app.
 */
export default function ConnectPage() {
  const [params] = useSearchParams();
  const requestId = params.get('request');
  return requestId ? <ConsentPanel key={requestId} requestId={requestId} /> : <ConnectorsPanel />;
}
