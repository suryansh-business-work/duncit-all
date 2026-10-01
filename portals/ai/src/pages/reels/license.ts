/**
 * The Remotion licence this build runs under.
 *
 * Remotion is free for individuals and for companies of up to three people;
 * anyone larger needs a Company Licence, and the key that comes with it is what
 * the exporter reports its renders against. It is a build-time value
 * (`VITE_REMOTION_LICENSE_KEY`) rather than a setting, because a licence belongs
 * to the deployment, not to whoever is signed in.
 *
 * Unset is a legitimate state — the studio still previews and exports — but
 * Remotion then prints its licence notice in the console, which is the prompt
 * to go and get one.
 */
const configured = String(import.meta.env.VITE_REMOTION_LICENSE_KEY ?? '').trim();

export const remotionLicenseKey: string | null = configured === '' ? null : configured;
