/** The translator the queue's columns and cells are handed by the table. */
export type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;
