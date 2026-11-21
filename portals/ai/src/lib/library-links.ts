/**
 * The URL that opens one prompt's details in the AI Library. The library page
 * reads `prompt` and opens that prompt; `selectedtab` lands the page on that
 * prompt's kind underneath (AI Features only ever links code prompts).
 */
export const libraryPromptPath = (key: string, kind: 'CODE' | 'AI' = 'CODE') =>
  `/library?selectedtab=${kind}&prompt=${encodeURIComponent(key)}`;
