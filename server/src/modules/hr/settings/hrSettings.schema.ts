export const hrSettingsTypeDefs = /* GraphQL */ `
  "How a salary template line becomes a monthly amount when HR applies it to an annual CTC."
  enum HrTemplateCalc {
    "Rupees per month."
    FIXED
    "Percent of the monthly CTC."
    PERCENT_OF_CTC
    "Percent of the template's first line (the basic)."
    PERCENT_OF_BASIC
    "What is left of the monthly CTC after every other earning and employer contribution."
    BALANCE
  }

  type HrTemplateLine {
    label: String!
    type: HrPayComponentType!
    calc: HrTemplateCalc!
    value: Float!
    target_linked: Boolean!
  }

  input HrTemplateLineInput {
    label: String!
    type: HrPayComponentType!
    calc: HrTemplateCalc!
    value: Float!
    target_linked: Boolean
  }

  "HR > Settings."
  type HrSettings {
    employee_code_prefix: String!
    employee_code_digits: Int!
    "The code the next hire gets when HR leaves the code empty."
    next_employee_code: String!
    default_currency: String!
    default_notice_period_days: Int!
    default_probation_months: Int!
    departments: [String!]!
    work_locations: [String!]!
    salary_template: [HrTemplateLine!]!
    updated_at: String
  }

  "Every field optional: a save changes only what it names."
  input HrSettingsInput {
    employee_code_prefix: String
    employee_code_digits: Int
    default_currency: String
    default_notice_period_days: Int
    default_probation_months: Int
    departments: [String!]
    work_locations: [String!]
    salary_template: [HrTemplateLineInput!]
  }

  extend type Query {
    "HR console: codes, departments, locations, defaults and the salary template."
    hrSettings: HrSettings!
  }

  extend type Mutation {
    "HR console: change HR settings."
    updateHrSettings(input: HrSettingsInput!): HrSettings!
  }
`;
