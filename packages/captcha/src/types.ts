/**
 * The wire shape of one human check.
 *
 * Declared here rather than pulled from `@duncit/gql-types` so the Astro
 * marketing sites — which have no codegen and no Apollo — can consume this
 * package with nothing but a fetch.
 */
export interface CaptchaChallenge {
  /** Send back with the form, beside whatever the visitor typed. */
  token: string;
  /** The code drawn as an SVG data URI, ready for an `<img src>`. */
  image: string;
  /** Seconds the token is good for. */
  expires_in: number;
}

/** The two fields every protected mutation reads off its input. */
export interface CaptchaFields {
  captcha_token: string;
  captcha_answer: string;
}

/**
 * Why the server refused, mapped to the copy key that explains it.
 *
 * The server sends a CODE and never a sentence, because the sentence has to
 * arrive in the reader's language and the server does not know it.
 */
export type CaptchaErrorCode = 'required' | 'wrong' | 'expired';

/** Structural shape of a GraphQL error list — no graphql dependency here. */
export interface GraphqlErrorLike {
  message?: string;
  extensions?: { code?: unknown } | null;
}
