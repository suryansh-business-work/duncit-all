import gql from 'graphql-tag';

export const whatsappTypeDefs = gql`
  type WhatsAppOtpRequestResult {
    ok: Boolean!
    dev_otp: String
  }

  extend type Mutation {
    requestWhatsAppOtp(phone_extension: String!, phone_number: String!): WhatsAppOtpRequestResult!
    verifyWhatsAppOtp(phone_extension: String!, phone_number: String!, otp: String!): User!
    skipWhatsAppOtp: User!
  }
`;
