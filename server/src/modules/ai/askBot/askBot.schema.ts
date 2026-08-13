import gql from 'graphql-tag';

export const askBotTypeDefs = gql`
  """
  Why a bot cannot answer right now. A code rather than a sentence: the console
  renders the wording from its own localized copy (rule 38).
  """
  enum AskBotUnavailableReason {
    NOT_CONFIGURED
  }

  """
  One bot in the Ask Bot list behind the portal header's Apps drawer. Which bots
  exist and whether each can answer is the server's to say; its name, blurb and
  opening line are the console's localized copy, keyed off the bot key.
  """
  type AskBot {
    key: String!
    """
    An icon name the shell's AppIcon understands.
    """
    icon: String!
    """
    False when the bot cannot answer — an unconfigured OpenAI key, say. The row
    is still listed, so the reason is visible rather than the bot missing.
    """
    is_available: Boolean!
    unavailable_reason: AskBotUnavailableReason
  }

  """
  Somewhere the answer points to, already resolved to an address that works in
  the environment the caller is in: localhost while developing, staging on
  staging, production otherwise.
  """
  type AskBotLink {
    surface_key: String!
    surface_name: String!
    """
    The button caption, written by the bot in the language the person asked in.
    """
    label: String!
    path: String!
    """
    Empty when the surface has no address in this environment — the mobile app
    has no local web server, so there is nothing to click while developing.
    """
    url: String!
    """
    False when this console's login gate would turn the caller away. Staff
    consoles only; member surfaces are always open.
    """
    has_access: Boolean!
  }

  type AskBotReply {
    answer: String!
    links: [AskBotLink!]!
    followups: [String!]!
  }

  enum AskBotRole {
    USER
    BOT
  }

  input AskBotTurnInput {
    role: AskBotRole!
    content: String!
  }

  input AskBotChatInput {
    bot_key: String!
    message: String!
    """
    The conversation so far, oldest first, so a follow-up keeps its context.
    Trimmed server-side to the last few turns.
    """
    history: [AskBotTurnInput!]
  }

  extend type Query {
    """
    The bots offered in the Ask Bot list, in the order they should be shown.
    """
    askBots: [AskBot!]!
  }

  extend type Mutation {
    """
    Ask a bot a question. Every link in the reply is checked against the
    navigation map and resolved for the caller's own environment, so the answer
    can never point at a page that does not exist.
    """
    askBotChat(input: AskBotChatInput!): AskBotReply!
  }
`;
