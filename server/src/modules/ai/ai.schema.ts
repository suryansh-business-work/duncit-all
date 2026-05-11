import gql from 'graphql-tag';

export const aiTypeDefs = gql`
  enum AiDummyEntity {
    CLUB
    POD
    SLIDER
    INVENTORY_PRODUCT
  }

  input AiProductDescribeInput {
    product_name: String!
    brand_name: String
    product_type: String
    short_description: String
    tags: [String!]
    tone: String
  }

  extend type Mutation {
    """
    Generates dummy data for a Club / Pod / Slider / Inventory Product form using OpenAI.
    Returns a JSON string that the admin client parses and merges into the form.
    """
    aiFillDummyData(entity: AiDummyEntity!, prompt: String): String!

    """
    Writes a marketing-friendly description for an inventory product given its name and
    optional brand/type/tags context. Returns a single JSON string with
    { short_description, description }.
    """
    aiDescribeInventoryProduct(input: AiProductDescribeInput!): String!
  }
`;
