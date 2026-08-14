import { gql, useQuery } from '@apollo/client';
import { Button, Tooltip } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { notify } from '@duncit/dialogs';
import { copyToClipboard } from '@duncit/utils';
import { urlConfigs } from '../config/url-configs';

/**
 * Hands the operator a URL that returns the same rows as JSON, with no login
 * behind it — paste it in a browser tab, a monitor, a `curl`, a spreadsheet.
 *
 * The key is fetched rather than baked in, so rotating it in Telemetry Logs
 * Settings retires every URL copied before the rotation. What the URL carries
 * is the whole of the data behind it — stack traces, addresses, emails — so it
 * is a password, and the tooltip says so before anyone pastes it somewhere
 * public.
 */

const TELEMETRY_API_KEY = gql`
  query TelemetryApiKey {
    telemetrySettings {
      public_api_key
    }
  }
`;

/** `https://server.duncit.com` — the API origin, without the /graphql path. */
export const serverOrigin = (): string => urlConfigs.graphqlUrl.replace(/\/graphql$/, '');

interface Props {
  /** Feed path under the server origin, e.g. `/telemetry/logs.json`. */
  path: string;
  /** Filters pinned into the URL alongside the key (level, status, …). */
  params?: Readonly<Record<string, string>>;
  label?: string;
}

export default function CopyGetApiButton({ path, params, label = 'Copy GET API' }: Readonly<Props>) {
  const { data, loading } = useQuery<{ telemetrySettings: { public_api_key: string } }>(
    TELEMETRY_API_KEY,
    { fetchPolicy: 'cache-first' },
  );
  const key = data?.telemetrySettings?.public_api_key ?? '';

  const copy = async () => {
    const url = new URL(`${serverOrigin()}${path}`);
    url.searchParams.set('key', key);
    for (const [name, value] of Object.entries(params ?? {})) {
      url.searchParams.set(name, value);
    }
    const copied = await copyToClipboard(url.toString());
    notify(
      copied ? 'GET API URL copied — it needs no login, so treat it as a password.' : 'Could not copy the URL',
      copied ? 'success' : 'error',
    );
  };

  return (
    <Tooltip title="A no-login URL that returns these rows as JSON. Anyone holding it holds the data — rotate the key in Logs Settings if it leaks.">
      <span>
        <Button size="small" startIcon={<LinkIcon />} disabled={loading || !key} onClick={copy}>
          {label}
        </Button>
      </span>
    </Tooltip>
  );
}
