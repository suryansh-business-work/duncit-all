import { useCallback, useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import type { Path, UseFormSetError } from 'react-hook-form';
import type { BlockedViolation } from '@duncit/ui';
import type { ProductListingValues } from './list-products.types';
import { buildProductModerationInput, productViolationTarget } from './list-products.map';

const MODERATE_PRODUCT_CONTENT = gql`
  mutation ModerateProductContent($input: ModerateProductContentInput!) {
    moderateProductContent(input: $input) {
      allowed
      violations {
        field
        step
        type
        message
        evidence
      }
    }
  }
`;

interface CheckArgs {
  values: ProductListingValues;
  setError: UseFormSetError<ProductListingValues>;
  onJumpToStep: (step: number) => void;
}

/** AI/rules preflight for the product form. Runs moderateProductContent before
 * submit; on violations it sets inline RHF errors, jumps to the earliest
 * offending step and surfaces the blocked-dialog list. Returns whether clean. */
export function useProductModeration(stepTitles: string[]) {
  const [moderate, { loading }] = useMutation(MODERATE_PRODUCT_CONTENT);
  const [blocked, setBlocked] = useState<BlockedViolation[]>([]);

  const check = useCallback(
    async ({ values, setError, onJumpToStep }: CheckArgs): Promise<boolean> => {
      const { data } = await moderate({ variables: { input: buildProductModerationInput(values) } });
      const result = data?.moderateProductContent;
      if (!result || result.allowed) return true;
      const items: BlockedViolation[] = result.violations.map((violation: any, index: number) => {
        const { stepIndex, path } = productViolationTarget(violation.field);
        if (path) setError(path as Path<ProductListingValues>, { type: 'moderation', message: violation.message });
        return {
          id: `${violation.field}-${index}`,
          message: violation.message,
          type: violation.type,
          stepIndex,
          stepTitle: stepTitles[stepIndex] ?? 'the form',
        };
      });
      setBlocked(items);
      onJumpToStep(Math.min(...items.map((item) => item.stepIndex)));
      return false;
    },
    [moderate, stepTitles],
  );

  return { blocked, closeBlocked: () => setBlocked([]), moderating: loading, check };
}
