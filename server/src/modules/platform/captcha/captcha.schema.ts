import gql from 'graphql-tag';

export const captchaTypeDefs = gql`
  """
  One human check, minted on demand.

  The token is the whole challenge — it carries a nonce, an expiry and a hash
  of the answer, signed by the server. Nothing is stored per challenge, so the
  check still works on the status page while the database is the thing being
  reported as broken.
  """
  type CaptchaChallenge {
    "Send this back with the form, beside the answer the visitor typed."
    token: String!
    "The code drawn as an SVG data URI, ready for an <img> tag."
    image: String!
    "Seconds the token stays good for."
    expires_in: Int!
  }

  extend type Query {
    """
    PUBLIC. Every form anyone on the internet can post asks for one of these
    first, so this cannot itself require a session.
    """
    captchaChallenge: CaptchaChallenge!
  }
`;
