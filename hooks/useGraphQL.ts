import { useState, useCallback } from 'react';
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

export interface GraphQLResponse<T> {
  data: T | null;
  errors?: any[];
}

export interface UseGraphQLReturn {
  loading: boolean;
  error: string | null;
  executeMutation: <T = any>(mutation: string, variables?: Record<string, any>) => Promise<T>;
  executeQuery: <T = any>(query: string, variables?: Record<string, any>) => Promise<T>;
}

export const useGraphQL = (): UseGraphQLReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeMutation = useCallback(async <T = any>(
    mutation: string,
    variables?: Record<string, any>
  ): Promise<T> => {
    try {
      setLoading(true);
      setError(null);

      const response = await client.graphql({
        query: mutation,
        variables,
      });

      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || 'Mutation failed';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      return response.data as T;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      console.error('Mutation error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const executeQuery = useCallback(async <T = any>(
    query: string,
    variables?: Record<string, any>
  ): Promise<T> => {
    try {
      setLoading(true);
      setError(null);

      const response = await client.graphql({
        query,
        variables,
      });

      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors[0].message || 'Query failed';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      return response.data as T;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      console.error('Query error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    executeMutation,
    executeQuery,
  };
};
