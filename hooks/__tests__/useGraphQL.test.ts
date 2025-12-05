import { renderHook, act } from '@testing-library/react';
import { mockGraphQLResponse, mockGraphQLError } from './mocks';

// Mock aws-amplify/api before importing the hook
const mockGraphQL = jest.fn();

jest.mock('aws-amplify/api', () => ({
  generateClient: jest.fn(() => ({
    graphql: mockGraphQL,
  })),
}));

import { useGraphQL } from '../useGraphQL';

describe('useGraphQL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mutation Execution', () => {
    it('should execute mutation successfully', async () => {
      mockGraphQL.mockResolvedValue(mockGraphQLResponse);

      const { result } = renderHook(() => useGraphQL());

      let response: any;
      await act(async () => {
        response = await result.current.executeMutation(
          'mutation CreateRoom { createRoom(name: "Test") { id name } }',
          { name: 'Test Room' }
        );
      });

      expect(mockGraphQL).toHaveBeenCalledWith({
        query: 'mutation CreateRoom { createRoom(name: "Test") { id name } }',
        variables: { name: 'Test Room' },
      });
      expect(response).toEqual(mockGraphQLResponse.data);
      expect(result.current.error).toBeNull();
    });

    it('should handle mutation errors', async () => {
      mockGraphQL.mockResolvedValue(mockGraphQLError);

      const { result } = renderHook(() => useGraphQL());

      await act(async () => {
        try {
          await result.current.executeMutation('mutation { test }');
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('GraphQL error occurred');
    });

    it('should set loading state during mutation', async () => {
      let resolvePromise: any;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      mockGraphQL.mockReturnValue(promise);

      const { result } = renderHook(() => useGraphQL());

      act(() => {
        result.current.executeMutation('mutation { test }');
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise(mockGraphQLResponse);
        await promise;
      });

      expect(result.current.loading).toBe(false);
    });

    it('should handle network errors during mutation', async () => {
      const networkError = new Error('Network request failed');
      mockGraphQL.mockRejectedValue(networkError);

      const { result } = renderHook(() => useGraphQL());

      await act(async () => {
        try {
          await result.current.executeMutation('mutation { test }');
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Network request failed');
    });
  });

  describe('Query Execution', () => {
    it('should execute query successfully', async () => {
      const queryResponse = {
        data: {
          getRoom: {
            id: 'room-123',
            name: 'Test Room',
          },
        },
        errors: null,
      };
      mockGraphQL.mockResolvedValue(queryResponse);

      const { result } = renderHook(() => useGraphQL());

      let response: any;
      await act(async () => {
        response = await result.current.executeQuery(
          'query GetRoom { getRoom(id: "room-123") { id name } }',
          { id: 'room-123' }
        );
      });

      expect(mockGraphQL).toHaveBeenCalledWith({
        query: 'query GetRoom { getRoom(id: "room-123") { id name } }',
        variables: { id: 'room-123' },
      });
      expect(response).toEqual(queryResponse.data);
      expect(result.current.error).toBeNull();
    });

    it('should handle query errors', async () => {
      mockGraphQL.mockResolvedValue({
        data: null,
        errors: [{ message: 'Room not found' }],
      });

      const { result } = renderHook(() => useGraphQL());

      await act(async () => {
        try {
          await result.current.executeQuery('query { getRoom }');
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Room not found');
    });

    it('should set loading state during query', async () => {
      let resolvePromise: any;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      mockGraphQL.mockReturnValue(promise);

      const { result } = renderHook(() => useGraphQL());

      act(() => {
        result.current.executeQuery('query { test }');
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise(mockGraphQLResponse);
        await promise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Error State Management', () => {
    it('should clear error on successful mutation after error', async () => {
      // First call fails
      mockGraphQL.mockResolvedValueOnce(mockGraphQLError);

      const { result } = renderHook(() => useGraphQL());

      await act(async () => {
        try {
          await result.current.executeMutation('mutation { test }');
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('GraphQL error occurred');

      // Second call succeeds
      mockGraphQL.mockResolvedValueOnce(mockGraphQLResponse);

      await act(async () => {
        await result.current.executeMutation('mutation { test }');
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle missing error message', async () => {
      mockGraphQL.mockResolvedValue({
        data: null,
        errors: [{}],
      });

      const { result } = renderHook(() => useGraphQL());

      await act(async () => {
        try {
          await result.current.executeMutation('mutation { test }');
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Mutation failed');
    });
  });

  describe('Multiple Operations', () => {
    it('should handle multiple mutations in sequence', async () => {
      mockGraphQL.mockResolvedValue(mockGraphQLResponse);

      const { result } = renderHook(() => useGraphQL());

      await act(async () => {
        await result.current.executeMutation('mutation { first }');
      });

      await act(async () => {
        await result.current.executeMutation('mutation { second }');
      });

      expect(mockGraphQL).toHaveBeenCalledTimes(2);
      expect(result.current.error).toBeNull();
    });

    it('should handle query followed by mutation', async () => {
      mockGraphQL.mockResolvedValue(mockGraphQLResponse);

      const { result } = renderHook(() => useGraphQL());

      await act(async () => {
        await result.current.executeQuery('query { test }');
      });

      await act(async () => {
        await result.current.executeMutation('mutation { test }');
      });

      expect(mockGraphQL).toHaveBeenCalledTimes(2);
    });
  });
});
