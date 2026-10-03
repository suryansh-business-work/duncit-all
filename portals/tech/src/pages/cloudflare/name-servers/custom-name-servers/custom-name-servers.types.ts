import { z } from 'zod';
import { isHostname } from '@duncit/regex';

/**
 * Hand-typed nameservers: one per line (or comma-separated), 2 to 13 of them,
 * each a hostname. The server checks all of it again — and refuses servers
 * inside the domain itself, which need glue records — this only saves a round
 * trip for the typo worth catching before GoDaddy is asked.
 */

/** A registrar takes between 2 and 13 nameservers. */
const MIN_SERVERS = 2;
const MAX_SERVERS = 13;

/** The validation copy, passed in translated — the schema renders no English. */
export interface CustomNameServersMessages {
  count: string;
  invalid: (names: string) => string;
}

/** The typed text as a de-duplicated list, lower-cased and without the root dot. */
export const parseServers = (text: string): string[] => [
  ...new Set(
    text
      .split('\n')
      .flatMap((line) => line.split(','))
      .map((entry) => entry.trim().toLowerCase())
      .map((entry) => (entry.endsWith('.') ? entry.slice(0, -1) : entry))
      .filter(Boolean),
  ),
];

export const customNameServersSchema = (messages: CustomNameServersMessages) =>
  z.object({
    servers: z.string().superRefine((text, ctx) => {
      const servers = parseServers(text);
      if (servers.length < MIN_SERVERS || servers.length > MAX_SERVERS) {
        ctx.addIssue({ code: 'custom', message: messages.count });
        return;
      }
      const invalid = servers.filter((server) => !isHostname(server));
      if (invalid.length > 0) ctx.addIssue({ code: 'custom', message: messages.invalid(invalid.join(', ')) });
    }),
  });

export type CustomNameServersForm = z.infer<ReturnType<typeof customNameServersSchema>>;

export const blankCustomNameServers: CustomNameServersForm = { servers: '' };
