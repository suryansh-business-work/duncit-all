import {
  isEnumType,
  isInputObjectType,
  isListType,
  isNonNullType,
  isScalarType,
  type GraphQLArgument,
  type GraphQLInputField,
  type GraphQLInputType,
} from 'graphql';
import type { JSONValue } from '@modelcontextprotocol/server';
import { MAX_INPUT_SCHEMA_DEPTH, MAX_STRING_LENGTH } from '../mcp.constants';

/**
 * The JSON Schema an AI client is shown for a tool's arguments, derived from
 * the GraphQL field's own argument types — so the contract the model sees is
 * exactly the contract the resolver enforces, and cannot drift from it.
 *
 * GraphQL still coerces and validates every variable when the operation runs;
 * this schema is what lets the model get it right the first time.
 */

/**
 * Type aliases rather than interfaces: the SDK types a tool's schema as plain
 * JSON values, and only an alias carries the implicit index signature that
 * makes it assignable there.
 */
export type JsonSchema = {
  type?: string;
  description?: string;
  enum?: string[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  default?: JSONValue;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  const?: JSONValue;
};

/** A tool's whole parameter schema — always a closed object. */
export type ToolInputSchema = JsonSchema & {
  type: 'object';
  properties: Record<string, JsonSchema>;
};

const INT_RANGE = { minimum: -2_147_483_648, maximum: 2_147_483_647 };
const ID_MAX_LENGTH = 200;
/** Descriptions are cut here: a paragraph of resolver history helps no model. */
const MAX_DESCRIPTION = 400;

export function clip(text: string | null | undefined, max = MAX_DESCRIPTION): string | undefined {
  const trimmed = text?.replace(/\s+/g, ' ').trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function scalarSchema(name: string): JsonSchema {
  switch (name) {
    case 'String':
      return { type: 'string', maxLength: MAX_STRING_LENGTH };
    case 'ID':
      return { type: 'string', minLength: 1, maxLength: ID_MAX_LENGTH };
    case 'Int':
      return { type: 'integer', ...INT_RANGE };
    case 'Float':
      return { type: 'number' };
    case 'Boolean':
      return { type: 'boolean' };
    default:
      // A custom scalar (JSON, DateTime…): the resolver's own parser decides.
      return { description: `${name} value` };
  }
}

function withDescription(schema: JsonSchema, description: string | undefined): JsonSchema {
  return description ? { ...schema, description } : schema;
}

export function schemaForType(type: GraphQLInputType, depth = 0): JsonSchema {
  if (isNonNullType(type)) return schemaForType(type.ofType, depth);
  if (isListType(type)) return { type: 'array', items: schemaForType(type.ofType, depth) };
  if (isEnumType(type)) {
    return withDescription({ type: 'string', enum: type.getValues().map((v) => v.name) }, clip(type.description));
  }
  if (isScalarType(type)) return scalarSchema(type.name);
  if (!isInputObjectType(type) || depth >= MAX_INPUT_SCHEMA_DEPTH) {
    return { type: 'object', description: `${type.toString()} input` };
  }
  return objectSchema(Object.values(type.getFields()), depth + 1, clip(type.description));
}

function isRequired(input: GraphQLArgument | GraphQLInputField): boolean {
  return isNonNullType(input.type) && input.defaultValue === undefined;
}

/** A JSON-safe default (enum names and plain values are; objects built by resolvers are not). */
function jsonDefault(value: unknown): JSONValue | undefined {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value)) as JSONValue;
  } catch {
    return undefined;
  }
}

export function objectSchema(
  inputs: ReadonlyArray<GraphQLArgument | GraphQLInputField>,
  depth: number,
  description?: string
): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  for (const input of inputs) {
    let schema = withDescription(schemaForType(input.type, depth), clip(input.description));
    if (input.deprecationReason) {
      schema = { ...schema, description: `Deprecated: ${input.deprecationReason}` };
    }
    const fallback = jsonDefault(input.defaultValue);
    if (fallback !== undefined) schema = { ...schema, default: fallback };
    properties[input.name] = schema;
    if (isRequired(input)) required.push(input.name);
  }
  const schema: JsonSchema = { type: 'object', properties, additionalProperties: false };
  if (required.length) schema.required = required;
  return withDescription(schema, description);
}
