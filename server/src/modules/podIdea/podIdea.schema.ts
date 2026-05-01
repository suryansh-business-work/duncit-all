export const podIdeaTypeDefs = /* GraphQL */ `
  enum PodIdeaStatus {
    PENDING
    APPROVED
    REJECTED
  }

  type PodIdeaComment {
    id: ID!
    author_id: ID!
    author: User
    text: String!
    created_at: String!
  }

  type PodIdea {
    id: ID!
    author_id: ID!
    author: User
    title: String!
    description: String!
    likes: [ID!]!
    likes_count: Int!
    liked_by_me: Boolean!
    shares_count: Int!
    comments: [PodIdeaComment!]!
    comments_count: Int!
    status: PodIdeaStatus!
    created_at: String!
    updated_at: String!
  }

  input PodIdeaFilterInput {
    status: PodIdeaStatus
    author_id: ID
    search: String
  }

  input CreatePodIdeaInput {
    title: String!
    description: String!
  }

  input UpdatePodIdeaInput {
    title: String
    description: String
  }

  extend type Query {
    podIdeas(filter: PodIdeaFilterInput): [PodIdea!]!
    podIdea(pod_idea_doc_id: ID!): PodIdea
    myPodIdeas: [PodIdea!]!
  }

  extend type Mutation {
    createPodIdea(input: CreatePodIdeaInput!): PodIdea!
    updatePodIdea(pod_idea_doc_id: ID!, input: UpdatePodIdeaInput!): PodIdea!
    deletePodIdea(pod_idea_doc_id: ID!): Boolean!
    togglePodIdeaLike(pod_idea_doc_id: ID!): PodIdea!
    addPodIdeaComment(pod_idea_doc_id: ID!, text: String!): PodIdea!
    deletePodIdeaComment(pod_idea_doc_id: ID!, comment_id: ID!): PodIdea!
    sharePodIdea(pod_idea_doc_id: ID!): PodIdea!
    setPodIdeaStatus(pod_idea_doc_id: ID!, status: PodIdeaStatus!): PodIdea!
  }
`;
