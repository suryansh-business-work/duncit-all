/**
 * The `{{ var }}` names a template body uses, and the write that puts a shipped
 * body on a stored row. Its own module so the boot upgrade, the per-template
 * reset and the one-time design pass (`emailTemplate.design`) share ONE copy
 * without importing the service that calls them.
 */

/** Walk the MJML source and extract every {{ var }} reference. */
export function detectVariables(mjml: string): string[] {
  const set = new Set<string>();
  const re = /{{\s*(\w+)\s*}}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mjml))) set.add(m[1]);
  return [...set];
}

/**
 * The update that puts a shipped body on a stored row — the body, plus every
 * variable it uses that the row does not list yet (the editor's Variables
 * panel reads that list). `extra` joins the `$set`, e.g. a shipped subject.
 */
export function shippedBodyUpdate(
  mjml: string,
  listed: readonly { key: string }[] = [],
  extra: Record<string, unknown> = {}
) {
  const known = new Set(listed.map((variable) => variable.key));
  const added = detectVariables(mjml)
    .filter((key) => !known.has(key))
    .map((key) => ({ key }));
  return {
    $set: { mjml, ...extra },
    ...(added.length ? { $push: { variables: { $each: added } } } : {}),
  };
}
