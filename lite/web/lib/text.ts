/** Plain text with blank-line breaks, as the paragraphs it was typed as. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

/** The two letters an avatar shows when there is no picture. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Lines or commas typed into one box, as the list the API wants. */
export function splitOptions(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((option) => option.trim())
    .filter(Boolean);
}
