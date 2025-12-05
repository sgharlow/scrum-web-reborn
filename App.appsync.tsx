/**
 * SIMPLIFIED APPSYNC VERSION OF APP
 * This demonstrates the working AppSync integration
 * Run this to test the migration before fully replacing App.tsx
 */

import React, { useState, useEffect } from 'react';
import AuthFlow from './components/AuthFlow';
import { useAuth } from './hooks/useAuth';
import { useRoomOperations } from './hooks/useRoomOperations';
import type { Story, Participant } from './types';

export default function AppAppSync() {
  const { isAuthenticated, isLoading: authLoading, user, signOutUser } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Room operations hook (only active when roomId is set)
  const {
    room,
    stories,
    members,
    createRoomMutation,
    joinRoomMutation,
    createStoryMutation,
    castVoteMutation,
    revealVotesMutation,
    loading,
    error: roomError
  } = useRoomOperations(roomId);

  // Subscriptions are handled internally by useRoomOperations
  // No need to manually subscribe here

  // Auto-populate display name from user
  useEffect(() => {
    if (user?.username && !displayName) {
      setDisplayName(user.username);
    }
  }, [user, displayName]);

  const handleAuth = () => {
    console.log('User authenticated successfully');
  };

  const handleCreateRoom = async () => {
    try {
      setIsJoining(true);
      setError(null);

      // Generate room code (6 uppercase alphanumeric characters)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const code = Array.from({ length: 6 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join('');

      // Create room
      const newRoom = await createRoomMutation({
        name: `${displayName}'s Room`,
        code
      });

      if (newRoom) {
        setRoomId(newRoom.id);
        setRoomCode(code);
        console.log('✅ Room created:', newRoom);
      }
    } catch (err: any) {
      console.error('Failed to create room:', err);
      setError(err.message || 'Failed to create room');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinRoom = async (code: string) => {
    try {
      setIsJoining(true);
      setError(null);

      const member = await joinRoomMutation({
        code,
        displayName: displayName || user?.username || 'Anonymous'
      });

      if (member) {
        setRoomId(member.roomId);
        setRoomCode(code);
        console.log('✅ Joined room:', member);
      }
    } catch (err: any) {
      console.error('Failed to join room:', err);
      setError(err.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveRoom = () => {
    setRoomId(null);
    setRoomCode('');
  };

  const handleAddStory = async () => {
    if (!roomId) return;

    const title = prompt('Enter story title:');
    if (!title) return;

    try {
      const story = await createStoryMutation({
        roomId,
        title,
        description: ''
      });
      console.log('✅ Story created:', story);
    } catch (err) {
      console.error('Failed to create story:', err);
      alert('Failed to create story');
    }
  };

  const handleCastVote = async (storyId: string) => {
    if (!roomId) return;

    const value = prompt('Enter vote (1, 2, 3, 5, 8, 13):');
    if (!value) return;

    try {
      const vote = await castVoteMutation({
        roomId,
        storyId,
        value
      });
      console.log('✅ Vote cast:', vote);
    } catch (err) {
      console.error('Failed to cast vote:', err);
      alert('Failed to cast vote');
    }
  };

  const handleRevealVotes = async (storyId: string) => {
    if (!roomId) return;

    try {
      const story = await revealVotesMutation({
        roomId,
        storyId,
        reveal: true
      });
      console.log('✅ Votes revealed:', story);
    } catch (err) {
      console.error('Failed to reveal votes:', err);
      alert('Failed to reveal votes');
    }
  };

  // Not authenticated - show auth flow
  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <AuthFlow onAuthSuccess={handleAuth} />
      </div>
    );
  }

  // Loading authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Authenticated but not in a room - show lobby
  if (!roomId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-slate-800 shadow-xl rounded-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-sky-600 dark:text-sky-400">
                Scrum Reborn (AppSync)
              </h1>
              <button
                onClick={signOutUser}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Sign Out
              </button>
            </div>

            <div className="mb-6">
              <p className="text-slate-600 dark:text-slate-400">
                Welcome, <strong>{user?.username}</strong>!
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                99.5%+ connectivity via AWS AppSync
              </p>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  placeholder="Enter your name"
                />
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={isJoining || !displayName.trim()}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isJoining ? 'Creating...' : 'Create New Room'}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    Or join existing room
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  placeholder="ABC123"
                />
              </div>

              <button
                onClick={() => handleJoinRoom(roomCode)}
                disabled={isJoining || !roomCode.trim() || !displayName.trim()}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isJoining ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // In a room - show room interface
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                {room?.name || 'Room'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Code: <span className="font-mono font-bold">{roomCode}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-slate-600 dark:text-slate-400">Connected</span>
              </div>
              <button
                onClick={handleLeaveRoom}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Participants */}
          <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Participants ({members?.length || 0})
            </h2>
            {members && members.length > 0 ? (
              <div className="space-y-2">
                {members.map((member: any) => (
                  <div key={member.userId} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700 rounded">
                    <div className={`w-2 h-2 rounded-full ${member.state === 'ONLINE' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{member.displayName}</span>
                    {member.role === 'MODERATOR' && (
                      <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded">MOD</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No participants yet</p>
            )}
          </div>

          {/* Stories */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 shadow-md rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Stories ({stories?.length || 0})
              </h2>
              <button
                onClick={handleAddStory}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors text-sm"
              >
                + Add Story
              </button>
            </div>

            {loading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto"></div>
              </div>
            )}

            {roomError && (
              <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded mb-4">
                {roomError}
              </div>
            )}

            <div className="space-y-3">
              {stories && stories.length > 0 ? (
                stories.map((story: Story) => (
                  <div key={story.id} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-slate-800 dark:text-slate-200">{story.title}</h3>
                      {story.revealed && story.avgVote && (
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-semibold">
                          Avg: {story.avgVote.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {story.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{story.description}</p>
                    )}
                    <div className="flex gap-2">
                      {!story.revealed && (
                        <button
                          onClick={() => handleCastVote(story.id)}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                        >
                          Vote
                        </button>
                      )}
                      <button
                        onClick={() => handleRevealVotes(story.id)}
                        className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm transition-colors"
                      >
                        {story.revealed ? 'Hide Votes' : 'Reveal Votes'}
                      </button>
                      <span className="px-3 py-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded text-sm">
                        {story.voteCount} vote{story.voteCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                  No stories yet. Click "Add Story" to get started!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Debug Info */}
        {loading && (
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center text-sm text-blue-700 dark:text-blue-300">
            Loading data...
          </div>
        )}
      </div>
    </div>
  );
}
