/**
 * How many people a campaign, notification or audience list reaches.
 *
 * Three screens phrase the same sentence, and each had grown its own copy of
 * the singular/plural ternary inline — which is what Sonar S3358 was pointing
 * at. One helper here keeps "1 person" from drifting into "1 people" on
 * whichever screen is edited next.
 */
export function peopleCount(count: number): string {
  const noun = count === 1 ? 'person' : 'people';
  return `${count.toLocaleString()} ${noun}`;
}

/** The same phrase, with the not-yet-counted state a list preview starts in. */
export function peopleLabel(count: number | null): string {
  return count === null ? 'Counting…' : peopleCount(count);
}
