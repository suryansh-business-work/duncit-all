import type { ReactNode } from 'react';
import { ApolloLink, Observable } from '@apollo/client';
import { MockLink, type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';

export const emailDraft = { email: 'new.person@example.test', extension: '+91', number: '' };
export const phoneDraft = { email: '', extension: '+91', number: '9000000001' };

export const wrap = (mocks: MockedResponse[]) =>
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
        {children}
      </MockedProvider>
    );
  };

export const refusal = (message: string) => ({ errors: [new GraphQLError(message)] });

export function flagLink(phoneOtp: boolean, mocks: MockedResponse[]) {
  const mock = new MockLink(mocks);
  return new ApolloLink((operation, forward) => {
    if (operation.operationName === 'PublicFeatureFlags') {
      return new Observable((observer) => {
        observer.next({
          data: { publicFeatureFlags: [{ __typename: 'Flag', key: 'phone_otp_verification', enabled: phoneOtp }] },
        });
        observer.complete();
      });
    }
    return mock.request(operation) as never;
  });
}

