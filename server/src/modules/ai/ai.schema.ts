import gql from 'graphql-tag';

export const aiTypeDefs = gql`
  enum AiDummyEntity {
    CLUB
    POD
    SLIDER
  }

  extend type Mutation {
    """
    Generates dummy data for a Club / Pod / Slider form using OpenAI.
    Returns a JSON string that the admin client parses and merges into the form.
    """
    aiFillDummyData(entity: AiDummyEntity!, prompt: String): String!
  }
`;
