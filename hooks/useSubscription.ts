import { useEffect, useState, useCallback, useRef } from 'react';
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

export interface UseSubscriptionReturn<T> {
  data: T | null;
  error: string | null;
  isSubscribed: boolean;
}

export const useSubscription = <T = any>(
  subscription: string,
  variables?: Record<string, any>,
  onData?: (data: T) => void
): UseSubscriptionReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const onDataRef = useRef(onData);

  // Keep onData callback ref updated
  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);

  useEffect(() => {
    let isMounted = true;

    const subscribe = async () => {
      try {
        setError(null);
        
        const sub = client.graphql({
          query: subscription,
          variables,
        }).subscribe({
          next: ({ data: subscriptionData }: any) => {
            if (!isMounted) return;
            
            setData(subscriptionData);
            setIsSubscribed(true);
            
            // Call the callback if provided
            if (onDataRef.current && subscriptionData) {
              onDataRef.current(subscriptionData);
            }
          },
          error: (err: any) => {
            if (!isMounted) return;
            
            const errorMessage = err.message || 'Subscription error';
            setError(errorMessage);
            setIsSubscribed(false);
            console.error('Subscription error:', err);
          },
        });

        subscriptionRef.current = sub;
      } catch (err: any) {
        if (!isMounted) return;
        
        const errorMessage = err.message || 'Failed to subscribe';
        setError(errorMessage);
        console.error('Subscribe error:', err);
      }
    };

    subscribe();

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [subscription, JSON.stringify(variables)]);

  return {
    data,
    error,
    isSubscribed,
  };
};

// Hook for managing multiple subscriptions
export const useMultipleSubscriptions = (
  subscriptions: Array<{
    subscription: string;
    variables?: Record<string, any>;
    onData?: (data: any) => void;
  }>
) => {
  const [isAllSubscribed, setIsAllSubscribed] = useState(false);
  const subscriptionRefs = useRef<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const subs: any[] = [];

    const subscribeAll = async () => {
      try {
        for (const { subscription, variables, onData } of subscriptions) {
          const sub = client.graphql({
            query: subscription,
            variables,
          }).subscribe({
            next: ({ data: subscriptionData }: any) => {
              if (!isMounted) return;
              if (onData && subscriptionData) {
                onData(subscriptionData);
              }
            },
            error: (err: any) => {
              if (!isMounted) return;
              console.error('Subscription error:', err);
            },
          });

          subs.push(sub);
        }

        subscriptionRefs.current = subs;
        if (isMounted) {
          setIsAllSubscribed(true);
        }
      } catch (err) {
        console.error('Failed to subscribe:', err);
      }
    };

    subscribeAll();

    return () => {
      isMounted = false;
      subscriptionRefs.current.forEach(sub => {
        if (sub) {
          sub.unsubscribe();
        }
      });
      subscriptionRefs.current = [];
    };
  }, [JSON.stringify(subscriptions)]);

  return { isAllSubscribed };
};
