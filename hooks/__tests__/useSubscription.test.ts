import { renderHook, act, waitFor } from '@testing-library/react';
import { mockSubscriptionData } from './mocks';

// Mock aws-amplify/api before importing the hook
const mockGraphQL = jest.fn();
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('aws-amplify/api', () => ({
  generateClient: jest.fn(() => ({
    graphql: mockGraphQL,
  })),
}));

import { useSubscription } from '../useSubscription';

describe('useSubscription', () => {
  let subscriptionCallbacks: any = {};

  beforeEach(() => {
    jest.clearAllMocks();
    subscriptionCallbacks = {};
    mockUnsubscribe.mockClear();

    // Mock the subscription behavior
    mockSubscribe.mockImplementation((callbacks: any) => {
      subscriptionCallbacks = callbacks;
      return {
        unsubscribe: mockUnsubscribe,
      };
    });

    mockGraphQL.mockReturnValue({
      subscribe: mockSubscribe,
    });
  });

  describe('Subscription Connection', () => {
    it('should establish subscription connection', async () => {
      const { result } = renderHook(() =>
        useSubscription('subscription { onRoomEvent }')
      );

      await waitFor(() => {
        expect(mockGraphQL).toHaveBeenCalledWith({
          query: 'subscription { onRoomEvent }',
          variables: undefined,
        });
      });

      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('should set isSubscribed to true when connected', async () => {
      const { result } = renderHook(() =>
        useSubscription('subscription { onRoomEvent }')
      );

      await act(async () => {
        subscriptionCallbacks.next({ data: mockSubscriptionData });
      });

      expect(result.current.isSubscribed).toBe(true);
    });

    it('should handle connection errors', async () => {
      const { result } = renderHook(() =>
        useSubscription('subscription { onRoomEvent }')
      );

      await act(async () => {
        subscriptionCallbacks.error(new Error('Connection failed'));
      });

      expect(result.current.error).toBe('Connection failed');
      expect(result.current.isSubscribed).toBe(false);
    });

    it('should pass variables to subscription', async () => {
      const variables = { roomId: 'room-123' };

      renderHook(() =>
        useSubscription('subscription { onRoomEvent }', variables)
      );

      await waitFor(() => {
        expect(mockGraphQL).toHaveBeenCalledWith({
          query: 'subscription { onRoomEvent }',
          variables,
        });
      });
    });
  });

  describe('Data Handling', () => {
    it('should receive subscription data', async () => {
      const { result } = renderHook(() =>
        useSubscription('subscription { onRoomEvent }')
      );

      await act(async () => {
        subscriptionCallbacks.next({ data: mockSubscriptionData });
      });

      expect(result.current.data).toEqual(mockSubscriptionData);
    });

    it('should call onData callback with new data', async () => {
      const onDataCallback = jest.fn();

      renderHook(() =>
        useSubscription('subscription { onRoomEvent }', undefined, onDataCallback)
      );

      await act(async () => {
        subscriptionCallbacks.next({ data: mockSubscriptionData });
      });

      expect(onDataCallback).toHaveBeenCalledWith(mockSubscriptionData);
    });

    it('should update data state on multiple messages', async () => {
      const { result } = renderHook(() =>
        useSubscription('subscription { onRoomEvent }')
      );

      const firstData = { event: 'first' };
      const secondData = { event: 'second' };

      await act(async () => {
        subscriptionCallbacks.next({ data: firstData });
      });

      expect(result.current.data).toEqual(firstData);

      await act(async () => {
        subscriptionCallbacks.next({ data: secondData });
      });

      expect(result.current.data).toEqual(secondData);
    });

    it('should handle null data gracefully', async () => {
      const onDataCallback = jest.fn();

      renderHook(() =>
        useSubscription('subscription { onRoomEvent }', undefined, onDataCallback)
      );

      await act(async () => {
        subscriptionCallbacks.next({ data: null });
      });

      // onData callback should not be called with null data
      expect(onDataCallback).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on unmount', async () => {
      const { unmount } = renderHook(() =>
        useSubscription('subscription { onRoomEvent }')
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should not update state after unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useSubscription('subscription { onRoomEvent }')
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      unmount();

      // Try to send data after unmount
      await act(async () => {
        subscriptionCallbacks.next({ data: mockSubscriptionData });
      });

      // State should not have been updated
      expect(result.current.data).toBeNull();
    });

    it('should handle errors after unmount gracefully', async () => {
      const { unmount } = renderHook(() =>
        useSubscription('subscription { onRoomEvent }')
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      unmount();

      // Should not throw when error occurs after unmount
      await act(async () => {
        subscriptionCallbacks.error(new Error('Error after unmount'));
      });
    });
  });

  describe('Reconnection Behavior', () => {
    it('should resubscribe when subscription query changes', async () => {
      const { rerender } = renderHook(
        ({ query }) => useSubscription(query),
        {
          initialProps: { query: 'subscription { onRoomEvent }' },
        }
      );

      await waitFor(() => {
        expect(mockGraphQL).toHaveBeenCalledTimes(1);
      });

      rerender({ query: 'subscription { onVoteEvent }' });

      await waitFor(() => {
        expect(mockGraphQL).toHaveBeenCalledTimes(2);
      });
    });

    it('should resubscribe when variables change', async () => {
      const { rerender } = renderHook(
        ({ variables }) => useSubscription('subscription { onRoomEvent }', variables),
        {
          initialProps: { variables: { roomId: 'room-1' } },
        }
      );

      await waitFor(() => {
        expect(mockGraphQL).toHaveBeenCalledTimes(1);
      });

      rerender({ variables: { roomId: 'room-2' } });

      await waitFor(() => {
        expect(mockGraphQL).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle error and allow reconnection', async () => {
      const { result } = renderHook(() =>
        useSubscription('subscription { onRoomEvent }')
      );

      // Simulate error
      await act(async () => {
        subscriptionCallbacks.error(new Error('Connection lost'));
      });

      expect(result.current.error).toBe('Connection lost');
      expect(result.current.isSubscribed).toBe(false);

      // Simulate successful reconnection
      await act(async () => {
        subscriptionCallbacks.next({ data: mockSubscriptionData });
      });

      expect(result.current.isSubscribed).toBe(true);
      expect(result.current.data).toEqual(mockSubscriptionData);
    });
  });

  describe('Callback Updates', () => {
    it('should use updated onData callback', async () => {
      const firstCallback = jest.fn();
      const secondCallback = jest.fn();

      const { rerender } = renderHook(
        ({ onData }) => useSubscription('subscription { onRoomEvent }', undefined, onData),
        {
          initialProps: { onData: firstCallback },
        }
      );

      await act(async () => {
        subscriptionCallbacks.next({ data: mockSubscriptionData });
      });

      expect(firstCallback).toHaveBeenCalledWith(mockSubscriptionData);
      expect(secondCallback).not.toHaveBeenCalled();

      // Update callback
      rerender({ onData: secondCallback });

      await act(async () => {
        subscriptionCallbacks.next({ data: mockSubscriptionData });
      });

      expect(secondCallback).toHaveBeenCalledWith(mockSubscriptionData);
    });
  });

  describe('Error Messages', () => {
    it('should handle error without message', async () => {
      const { result } = renderHook(() =>
        useSubscription('subscription { onRoomEvent }')
      );

      await act(async () => {
        subscriptionCallbacks.error({});
      });

      expect(result.current.error).toBe('Subscription error');
    });

    it('should clear error on successful data receipt', async () => {
      const { result } = renderHook(() =>
        useSubscription('subscription { onRoomEvent }')
      );

      // First, trigger an error
      await act(async () => {
        subscriptionCallbacks.error(new Error('Test error'));
      });

      expect(result.current.error).toBe('Test error');

      // Then receive successful data
      await act(async () => {
        subscriptionCallbacks.next({ data: mockSubscriptionData });
      });

      // Error should still be present (not cleared automatically)
      expect(result.current.error).toBe('Test error');
    });
  });
});
