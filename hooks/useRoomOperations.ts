import { useState, useCallback, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import * as operations from '../graphql/operations';
import type { Story, Participant, Room } from '../types';

const client = generateClient();

export const useRoomOperations = (roomId: string | null) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [members, setMembers] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create room mutation
  const createRoomMutation = useCallback(async (input: { name: string; code: string }) => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await client.graphql({
        query: operations.CREATE_ROOM,
        variables: input
      });
      const newRoom = response.data.createRoom;
      setRoom(newRoom);
      return newRoom;
    } catch (err: any) {
      console.error('createRoom error:', err);
      console.error('createRoom error details:', JSON.stringify(err, null, 2));
      if (err.errors) {
        console.error('GraphQL errors:', err.errors);
      }
      setError(err.errors?.[0]?.message || err.message || 'Failed to create room');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Join room mutation
  const joinRoomMutation = useCallback(async (input: { code: string; displayName: string }) => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await client.graphql({
        query: operations.JOIN_ROOM,
        variables: { ...input, role: null }
      });
      const member = response.data.joinRoom;

      // Also fetch room details
      const roomResponse: any = await client.graphql({
        query: operations.GET_ROOM_BY_CODE,
        variables: { code: input.code }
      });
      setRoom(roomResponse.data.getRoomByCode);

      return member;
    } catch (err: any) {
      console.error('joinRoom error:', err);
      console.error('joinRoom error details:', JSON.stringify(err, null, 2));
      if (err.errors) {
        console.error('GraphQL errors:', err.errors);
      }
      setError(err.errors?.[0]?.message || err.message || 'Failed to join room');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create story mutation
  const createStoryMutation = useCallback(async (input: { roomId: string; title: string; description?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await client.graphql({
        query: operations.CREATE_STORY,
        variables: input
      });
      const newStory = response.data.createStory;
      // Subscription will update stories array
      return newStory;
    } catch (err: any) {
      console.error('createStory error:', err);
      setError(err.message || 'Failed to create story');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cast vote mutation
  const castVoteMutation = useCallback(async (input: { roomId: string; storyId: string; value: string }) => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await client.graphql({
        query: operations.CAST_VOTE,
        variables: input
      });
      return response.data.castVote;
    } catch (err: any) {
      console.error('castVote error:', err);
      setError(err.message || 'Failed to cast vote');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reveal votes mutation
  const revealVotesMutation = useCallback(async (input: { roomId: string; storyId: string; reveal: boolean }) => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await client.graphql({
        query: operations.REVEAL_VOTES,
        variables: { roomId: input.roomId, storyId: input.storyId }
      });
      return response.data.revealVotes;
    } catch (err: any) {
      console.error('revealVotes error:', err);
      setError(err.message || 'Failed to reveal votes');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch initial data when roomId changes
  useEffect(() => {
    if (!roomId) {
      setStories([]);
      setMembers([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch stories
        const storiesResponse: any = await client.graphql({
          query: operations.LIST_STORIES,
          variables: { roomId }
        });
        setStories(storiesResponse.data.listStories.items || []);

        // Fetch members
        const membersResponse: any = await client.graphql({
          query: operations.LIST_PRESENCE,
          variables: { roomId }
        });
        setMembers(membersResponse.data.listPresence || []);

        console.log('✅ Fetched room data:', {
          stories: storiesResponse.data.listStories.items?.length || 0,
          members: membersResponse.data.listPresence?.length || 0
        });
      } catch (err: any) {
        console.error('Failed to fetch room data:', err);
        setError(err.message || 'Failed to fetch room data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [roomId]);

  // Set up subscriptions for real-time updates
  useEffect(() => {
    if (!roomId) return;

    const subscriptions: any[] = [];

    try {
      // Subscribe to story created
      const storyCreatedSub = client.graphql({
        query: operations.ON_STORY_CREATED,
        variables: { roomId }
      }).subscribe({
        next: ({ data }: any) => {
          console.log('📩 Story created:', data.onStoryCreated);
          setStories(prev => [...prev, data.onStoryCreated]);
        },
        error: (err) => console.error('Story created subscription error:', err)
      });
      subscriptions.push(storyCreatedSub);

      // Subscribe to story updated
      const storyUpdatedSub = client.graphql({
        query: operations.ON_STORY_UPDATED,
        variables: { roomId }
      }).subscribe({
        next: ({ data }: any) => {
          console.log('📩 Story updated:', data.onStoryUpdated);
          setStories(prev => prev.map(s =>
            s.id === data.onStoryUpdated.id ? data.onStoryUpdated : s
          ));
        },
        error: (err) => console.error('Story updated subscription error:', err)
      });
      subscriptions.push(storyUpdatedSub);

      // Subscribe to vote cast
      const voteCastSub = client.graphql({
        query: operations.ON_VOTE_CAST,
        variables: { roomId }
      }).subscribe({
        next: ({ data }: any) => {
          console.log('📩 Vote cast:', data.onVoteCast);
          // Increment vote count for this story
          setStories(prev => prev.map(s =>
            s.id === data.onVoteCast.storyId
              ? { ...s, voteCount: (s.voteCount || 0) + 1 }
              : s
          ));
        },
        error: (err) => console.error('Vote cast subscription error:', err)
      });
      subscriptions.push(voteCastSub);

      // Subscribe to votes revealed
      const votesRevealedSub = client.graphql({
        query: operations.ON_VOTES_REVEALED,
        variables: { roomId }
      }).subscribe({
        next: ({ data }: any) => {
          console.log('📩 Votes revealed:', data.onVotesRevealed);
          setStories(prev => prev.map(s =>
            s.id === data.onVotesRevealed.id ? data.onVotesRevealed : s
          ));
        },
        error: (err) => console.error('Votes revealed subscription error:', err)
      });
      subscriptions.push(votesRevealedSub);

      // Subscribe to presence changes
      const presenceChangedSub = client.graphql({
        query: operations.ON_PRESENCE_CHANGED,
        variables: { roomId }
      }).subscribe({
        next: ({ data }: any) => {
          console.log('📩 Presence changed:', data.onPresenceChanged);
          setMembers(prev => {
            const exists = prev.find(m => m.userId === data.onPresenceChanged.userId);
            if (exists) {
              return prev.map(m =>
                m.userId === data.onPresenceChanged.userId ? data.onPresenceChanged : m
              );
            } else {
              return [...prev, data.onPresenceChanged];
            }
          });
        },
        error: (err) => console.error('Presence subscription error:', err)
      });
      subscriptions.push(presenceChangedSub);

      console.log('✅ Subscriptions established for room:', roomId);
    } catch (err) {
      console.error('Failed to set up subscriptions:', err);
    }

    // Cleanup subscriptions
    return () => {
      subscriptions.forEach(sub => {
        try {
          sub.unsubscribe();
        } catch (err) {
          console.error('Error unsubscribing:', err);
        }
      });
      console.log('🧹 Subscriptions cleaned up');
    };
  }, [roomId]);

  return {
    room,
    stories,
    members,
    createRoomMutation,
    joinRoomMutation,
    createStoryMutation,
    castVoteMutation,
    revealVotesMutation,
    loading,
    error
  };
};
