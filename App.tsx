import React, { useState, useMemo, useEffect, useRef, useContext, useReducer, useCallback } from 'react';
import type { Story, VoteValue, RoomMode, Participant, AppState, Action, ConnectionStatus } from './types';
import ParticipantList from './components/ParticipantList';
import PlanningView from './components/StoryLane';
import RetroMode from './components/RetroMode';
import AuthFlow from './components/AuthFlow';
import { useAuth } from './hooks/useAuth';
import { PlusIcon, TrashIcon, HeartIcon, PlayIcon, PauseIcon, ResetIcon, SunIcon, MoonIcon, ClipboardIcon, LinkIcon, UnlinkIcon, CrownIcon, XMarkIcon, RefreshIcon } from './components/Icons';
import { AVATAR_OPTIONS, ICEBREAKER_QUESTIONS } from './constants';
import { appReducer, initialState } from './state';
import { generateClient } from 'aws-amplify/api';
import * as operations from './graphql/operations';

const client = generateClient();

// Helper function to get a consistent avatar based on user ID
const getAvatarForUser = (userId: string): string => {
    // Create a simple hash from the user ID to get a consistent index
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        const char = userId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    const index = Math.abs(hash) % AVATAR_OPTIONS.length;
    return AVATAR_OPTIONS[index];
};

// --- CONTEXT ---
const CollaborationContext = React.createContext<{
    state: AppState;
    dispatch: React.Dispatch<Action>;
    currentUser: Participant;
    refreshData: () => Promise<void>;
    connectionStatus: ConnectionStatus;
    reconnect: () => void;
    // Backend-synced action functions
    addStory: (title: string, description?: string) => Promise<void>;
    updateStory: (storyId: string, title: string) => Promise<void>;
    deleteStory: (storyId: string) => Promise<void>;
    selectStory: (storyId: string | null) => Promise<void>;
    addRetroNote: (category: 'well' | 'improve' | 'actions', text: string) => Promise<void>;
    voteRetroNote: (noteId: string, delta: number) => Promise<void>;
    setRoomMode: (mode: RoomMode) => Promise<void>;
    startVoting: () => Promise<void>;
    revealVotes: (storyId: string) => Promise<void>;
    castVote: (storyId: string, value: string) => Promise<void>;
    resetVoting: () => Promise<void>;
    roomId: string;
} | null>(null);

export const useCollaborationContext = () => {
    const context = useContext(CollaborationContext);
    if (!context) throw new Error("useCollaborationContext must be used within a CollaborationProvider");
    return context;
};

// --- UTILS ---
const adjectives = ['Agile', 'Brave', 'Clever', 'Devoted', 'Eager', 'Fearless', 'Great', 'Happy', 'Intrepid', 'Jolly', 'Keen', 'Lucky'];
const nouns = ['Aardvark', 'Badger', 'Cheetah', 'Dolphin', 'Eagle', 'Falcon', 'Gibbon', 'Heron', 'Ibex', 'Jaguar', 'Koala', 'Lemur'];
const generateRandomName = () => `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;

// Generate human-readable room code for AppSync rooms
const codeAdjectives = ['Swift', 'Red', 'Blue', 'Green', 'Solar', 'Lunar', 'Cosmic', 'Magic'];
const codeNouns = ['River', 'Mountain', 'Forest', 'Star', 'Planet', 'Comet', 'Galaxy', 'Nebula'];
const generateRandomRoomCode = () => {
    const adj = codeAdjectives[Math.floor(Math.random() * codeAdjectives.length)];
    const noun = codeNouns[Math.floor(Math.random() * codeNouns.length)];
    const num = Math.floor(100 + Math.random() * 900);
    return `${adj.toUpperCase()}-${noun.toUpperCase()}-${num}`;
};

// --- THEME TOGGLE ---
const ThemeToggle: React.FC = () => {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
    useEffect(() => {
        const root = window.document.documentElement;
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (theme === 'dark' || (theme === 'system' && systemTheme === 'dark')) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');

    return (
        <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors" aria-label="Toggle theme">
            <SunIcon className="w-6 h-6 text-slate-800 dark:hidden" />
            <MoonIcon className="w-6 h-6 text-slate-200 hidden dark:inline" />
        </button>
    );
};

// --- LOBBY COMPONENT ---
const Lobby: React.FC<{
    onJoinRoom: (name: string, code: string, avatar: string) => Promise<void>,
    isJoining: boolean,
    joinError: string | null,
    onSignOut?: () => void,
    userDisplayName?: string,
    userEmail?: string
}> = ({ onJoinRoom, isJoining, joinError, onSignOut, userDisplayName, userEmail }) => {
  // Use display name from signup, fall back to email prefix, then random name
  const getDefaultName = () => {
    if (userDisplayName) return userDisplayName;
    if (userEmail) return userEmail.split('@')[0];
    return generateRandomName();
  };

  const [code, setCode] = useState('');
  // Load avatar from localStorage for persistence, fall back to first option
  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    const saved = localStorage.getItem('selectedAvatar');
    return saved && AVATAR_OPTIONS.includes(saved) ? saved : AVATAR_OPTIONS[0];
  });

  // Save avatar to localStorage when changed
  const handleAvatarSelect = (avatar: string) => {
    setSelectedAvatar(avatar);
    localStorage.setItem('selectedAvatar', avatar);
  };

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        setCode(hash);
    }
  }, []);

  const displayName = getDefaultName();

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const roomCode = code.trim() || generateRandomRoomCode();
      onJoinRoom(displayName, roomCode.toUpperCase(), selectedAvatar);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl rounded-xl p-8 space-y-6">
        <div className="text-center">
          <div className="flex justify-between items-center mb-2">
            <div className="flex-1"></div>
            <h1 className="text-3xl font-bold text-sky-600 dark:text-sky-400">Scrum Facilitator</h1>
            <div className="flex-1 flex justify-end">
              {onSignOut && (
                <button onClick={onSignOut} className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
                  Sign Out
                </button>
              )}
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Instant agile ceremonies.</p>
        </div>

        {/* Show user info */}
        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 text-center">
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{displayName}</p>
          {userEmail && <p className="text-sm text-slate-500 dark:text-slate-400">{userEmail}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Choose your Avatar</label>
          <div className="flex justify-center gap-3 flex-wrap">{AVATAR_OPTIONS.map(avatar => (<button key={avatar} onClick={() => handleAvatarSelect(avatar)} className={`p-1 rounded-full transition-all ${selectedAvatar === avatar ? 'ring-2 ring-offset-2 ring-sky-500 dark:ring-offset-slate-800' : ''}`}><img src={avatar} alt="avatar" className="w-12 h-12 rounded-full" /></button>))}</div>
        </div>
        {joinError && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-md animate-slide-in" role="alert">
                <strong className="font-bold">Connection Failed: </strong>
                <span className="block sm:inline">{joinError}</span>
            </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter Room Code (or leave blank to create)" className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500 text-lg" disabled={isJoining} maxLength={20} />
            <button type="submit" disabled={isJoining} className="w-full px-6 py-4 bg-sky-600 text-white font-bold text-lg rounded-md hover:bg-sky-700 disabled:bg-slate-400 transition-colors">
                {isJoining ? 'Connecting...' : 'Create / Join Room'}
            </button>
        </form>
      </div>
    </div>
  );
};

// --- TIMER COMPONENT ---
const Timer: React.FC = () => {
    const { state, dispatch, currentUser } = useCollaborationContext();
    const { timer } = state;
    const isFacilitator = currentUser.id === state.facilitatorId;

    const [displayTime, setDisplayTime] = useState(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const soundPlayedRef = useRef(false);

    const playSound = () => {
        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser");
                return;
            }
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
             ctx.resume();
        }
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 1);
    };

    useEffect(() => {
        let interval: number | null = null;

        if (timer.isRunning && timer.startTime) {
            soundPlayedRef.current = false;
            const update = () => {
                const elapsed = (Date.now() - timer.startTime!) / 1000;
                const remaining = Math.max(0, timer.duration - elapsed);
                setDisplayTime(remaining);

                if (remaining === 0 && !soundPlayedRef.current) {
                    playSound();
                    soundPlayedRef.current = true;
                    if (isFacilitator) {
                        dispatch({ type: 'TOGGLE_PAUSE_TIMER' });
                    }
                }
            };
            update();
            interval = window.setInterval(update, 1000);
        } else {
            setDisplayTime(timer.duration);
        }

        return () => {
            if (interval) clearInterval(interval);
        };

    }, [timer.isRunning, timer.startTime, timer.duration, isFacilitator]);

    const handleStart = (minutes: number) => {
        if (!isFacilitator) return;
        dispatch({ type: 'START_TIMER', payload: { duration: minutes * 60 } });
    };

    const handleTogglePause = () => {
        if (!isFacilitator) return;
        dispatch({ type: 'TOGGLE_PAUSE_TIMER' });
    };

    const handleReset = () => {
        if (!isFacilitator) return;
        dispatch({ type: 'RESET_TIMER' });
    };

    const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
    const TimeButton: React.FC<{ minutes: number }> = ({ minutes }) => (<button onClick={() => handleStart(minutes)} disabled={!isFacilitator} className="text-xs px-2 py-1 bg-slate-300 dark:bg-slate-600 rounded hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{minutes}m</button>);

    const hasStarted = timer.duration > 0;

    return (<div className="flex items-center gap-2 p-1 rounded-lg bg-slate-200/50 dark:bg-slate-800"><div className="font-mono text-lg font-bold w-20 text-center">{formatTime(displayTime)}</div><div className="flex items-center gap-2">{!hasStarted ? (<><TimeButton minutes={5} /><TimeButton minutes={10} /><TimeButton minutes={15} /></>) : (<><button onClick={handleTogglePause} disabled={!isFacilitator} className="p-1.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">{timer.isRunning ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}</button><button onClick={handleReset} disabled={!isFacilitator} className="p-1.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"><ResetIcon className="w-5 h-5" /></button></>)}</div></div>);
}

// --- PROVIDER & MAIN ROOM COMPONENT ---
const CollaborationProvider: React.FC<{
    children: React.ReactNode;
    roomCode: string;
    roomId: string;
    currentUser: Participant;
    facilitatorId: string;
}> = ({ children, roomCode, roomId, currentUser, facilitatorId }) => {
    const [state, localDispatch] = useReducer(appReducer, {
        ...initialState,
        roomCode,
        facilitatorId,
        participants: [currentUser],
        icebreaker: ICEBREAKER_QUESTIONS[Math.floor(Math.random() * ICEBREAKER_QUESTIONS.length)],
    });

    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
    const stateRef = useRef(state);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const isFacilitator = currentUser.id === facilitatorId;

    // Broadcast action wrapper - in AppSync, mutations handle broadcasting
    const dispatch = useCallback((action: Action) => {
        // Apply locally first for immediate UI feedback
        localDispatch(action);

        // Note: Future enhancement - could add optimistic UI updates here
        // For now, local-only (will add AppSync sync in next step)
        console.log('Action dispatched:', action.type);
    }, []);

    // Backend-synced functions that call mutations (triggering subscriptions for all clients)
    const addStory = useCallback(async (title: string, description?: string) => {
        try {
            console.log('📤 Creating story via AppSync:', title);
            await client.graphql({
                query: operations.CREATE_STORY,
                variables: { roomId, title, description: description || '' }
            });
            // Don't dispatch locally - the subscription will handle it
        } catch (err) {
            console.error('Failed to create story:', err);
            throw err;
        }
    }, [roomId]);

    const addRetroNote = useCallback(async (category: 'well' | 'improve' | 'actions', text: string) => {
        try {
            // Map frontend column IDs to backend enum values
            const categoryMap: Record<string, string> = {
                'well': 'WENT_WELL',
                'improve': 'TO_IMPROVE',
                'actions': 'ACTION_ITEMS'
            };
            const backendCategory = categoryMap[category];
            console.log('📤 Adding retro note via AppSync:', { category: backendCategory, text });
            await client.graphql({
                query: operations.ADD_RETRO_NOTE,
                variables: { roomId, category: backendCategory, text }
            });
            // Don't dispatch locally - the subscription will handle it
        } catch (err) {
            console.error('Failed to add retro note:', err);
            throw err;
        }
    }, [roomId]);

    const voteRetroNote = useCallback(async (noteId: string, delta: number) => {
        try {
            console.log('📤 Voting retro note via AppSync:', { noteId, delta });
            await client.graphql({
                query: operations.VOTE_RETRO_NOTE,
                variables: { roomId, noteId, delta }
            });
            // Don't dispatch locally - the subscription will handle it
        } catch (err) {
            console.error('Failed to vote retro note:', err);
            throw err;
        }
    }, [roomId]);

    const setRoomMode = useCallback(async (mode: RoomMode) => {
        // Dispatch locally for immediate UI feedback
        localDispatch({ type: 'SET_MODE', payload: mode });

        try {
            // Map frontend mode to backend stage enum
            const stageMap: Record<RoomMode, string> = {
                'planning': 'PLANNING',
                'retro': 'RETRO'
            };
            const stage = stageMap[mode];
            console.log('📤 Setting room stage via AppSync:', stage);
            await client.graphql({
                query: operations.SET_ROOM_STAGE,
                variables: { roomId, stage }
            });
            // Subscription will sync other clients
        } catch (err) {
            console.error('Failed to set room stage:', err);
            // Already dispatched locally, just log error
        }
    }, [roomId]);

    const startVoting = useCallback(async () => {
        // Get current story ID from state ref for the most up-to-date value
        const currentStoryId = stateRef.current.currentStoryId;

        // Dispatch locally for immediate UI feedback
        localDispatch({ type: 'START_VOTING' });

        try {
            console.log('📤 Starting voting via AppSync (setting stage to VOTING, currentStoryId:', currentStoryId, ')');
            await client.graphql({
                query: operations.SET_ROOM_STAGE,
                variables: { roomId, stage: 'VOTING', currentStoryId }
            });
            // Subscription will sync other clients with both voting state AND current story
        } catch (err) {
            console.error('Failed to start voting:', err);
            // Already dispatched locally, just log error
        }
    }, [roomId]);

    const revealVotes = useCallback(async (storyId: string) => {
        // Dispatch locally for immediate UI feedback
        localDispatch({ type: 'REVEAL_VOTES' });

        try {
            console.log('📤 Revealing votes via AppSync:', storyId);
            await client.graphql({
                query: operations.REVEAL_VOTES,
                variables: { roomId, storyId }
            });
            // Subscription will sync other clients
        } catch (err) {
            console.error('Failed to reveal votes:', err);
            // Already dispatched locally, just log error
        }
    }, [roomId]);

    const castVote = useCallback(async (storyId: string, value: string) => {
        // Dispatch locally for immediate UI feedback
        localDispatch({ type: 'CAST_VOTE', payload: { participantId: currentUser.id, value } });

        try {
            console.log('📤 Casting vote via AppSync:', { storyId, value });
            await client.graphql({
                query: operations.CAST_VOTE,
                variables: { roomId, storyId, value }
            });
            // Subscription will sync other clients
        } catch (err) {
            console.error('Failed to cast vote:', err);
            // Already dispatched locally, just log error
        }
    }, [roomId, currentUser.id]);

    const updateStory = useCallback(async (storyId: string, title: string) => {
        try {
            console.log('📤 Updating story via AppSync:', { storyId, title });
            await client.graphql({
                query: operations.UPDATE_STORY,
                variables: { roomId, storyId, title }
            });
            // Subscription will handle the update
        } catch (err) {
            console.error('Failed to update story:', err);
            // Fallback to local
            localDispatch({ type: 'UPDATE_STORY', payload: { id: storyId, title } });
        }
    }, [roomId]);

    const deleteStory = useCallback(async (storyId: string) => {
        try {
            console.log('📤 Deleting story via AppSync:', storyId);
            await client.graphql({
                query: operations.DELETE_STORY,
                variables: { roomId, storyId }
            });
            // Also dispatch locally for immediate feedback
            localDispatch({ type: 'DELETE_STORY', payload: storyId });
        } catch (err) {
            console.error('Failed to delete story:', err);
            // Fallback to local
            localDispatch({ type: 'DELETE_STORY', payload: storyId });
        }
    }, [roomId]);

    const selectStory = useCallback(async (storyId: string | null) => {
        // Select story locally (no subscription for currentStoryId)
        console.log('📤 Selecting story:', storyId);
        localDispatch({ type: 'SET_CURRENT_STORY', payload: storyId });
        // Broadcast via stage change to PLANNING (subscription will reset voting on all clients)
        try {
            await client.graphql({
                query: operations.SET_ROOM_STAGE,
                variables: { roomId, stage: 'PLANNING' }
            });
        } catch (err) {
            console.error('Failed to broadcast story selection:', err);
            // Fallback: reset voting locally if broadcast fails
            localDispatch({ type: 'RESET_VOTING' });
        }
    }, [roomId]);

    const resetVoting = useCallback(async () => {
        // Dispatch locally for immediate UI feedback
        localDispatch({ type: 'RESET_VOTING' });

        try {
            console.log('📤 Resetting voting via AppSync (setting stage to PLANNING)');
            await client.graphql({
                query: operations.SET_ROOM_STAGE,
                variables: { roomId, stage: 'PLANNING' }
            });
            // Subscription will sync other clients
        } catch (err) {
            console.error('Failed to reset voting:', err);
            // Already dispatched locally, just log error
        }
    }, [roomId]);

    const refreshData = useCallback(async () => {
        console.log('Refreshing room data from AppSync...');
        setConnectionStatus('connecting');

        try {
            // Fetch all data in parallel for faster initial load
            const [roomRes, storiesRes, membersRes] = await Promise.all([
                client.graphql({
                    query: operations.GET_ROOM_BY_CODE,
                    variables: { code: roomCode }
                }).catch((err: any) => {
                    console.log('Room query error:', err.message);
                    return null;
                }),
                client.graphql({
                    query: operations.LIST_STORIES,
                    variables: { roomId }
                }).catch((err: any) => {
                    console.log('Stories query error:', err.message);
                    return null;
                }),
                client.graphql({
                    query: operations.LIST_PRESENCE,
                    variables: { roomId }
                }).catch((err: any) => {
                    console.log('Presence query error:', err.message);
                    return null;
                })
            ]);

            // Process room state
            if (roomRes) {
                const room = (roomRes.data as any)?.getRoomByCode;
                if (room) {
                    console.log('Synced room stage:', room.stage);
                    // Sync voting state based on room stage
                    if (room.stage === 'VOTING') {
                        localDispatch({ type: 'START_VOTING' });
                    } else if (room.stage === 'PLANNING') {
                        localDispatch({ type: 'RESET_VOTING' });
                    } else if (room.stage === 'RETRO') {
                        localDispatch({ type: 'SET_MODE', payload: 'retro' });
                    }
                }
            }

            // Process stories
            if (storiesRes) {
                const stories = (storiesRes.data as any)?.listStories?.items || [];
                console.log('Synced stories:', stories.length);

                stories.forEach((story: any) => {
                    localDispatch({
                        type: 'ADD_STORY',
                        payload: {
                            id: story.id,
                            title: story.title,
                            description: story.description || '',
                            estimate: story.avgVote ? (Number.isInteger(story.avgVote) ? story.avgVote.toString() : story.avgVote.toFixed(1)) : undefined
                        }
                    });
                    if (story.revealed && story.avgVote) {
                        localDispatch({
                            type: 'SET_ESTIMATE',
                            payload: { storyId: story.id, estimate: Number.isInteger(story.avgVote) ? story.avgVote.toString() : story.avgVote.toFixed(1) }
                        });
                    }
                });
            }

            // Process presence/members
            if (membersRes) {
                const members = (membersRes.data as any)?.listPresence || [];
                console.log('Synced members:', members.length);

                members.forEach((member: any) => {
                    if (member.state === 'ONLINE') {
                        localDispatch({
                            type: 'ADD_PARTICIPANT',
                            payload: {
                                id: member.userId,
                                name: member.displayName,
                                avatar: getAvatarForUser(member.userId)
                            }
                        });
                    }
                });
            }

            setConnectionStatus('connected');
        } catch (err: any) {
            console.error('Failed to refresh data:', err);
            console.error('Error details:', {
                message: err?.message,
                errors: err?.errors,
                name: err?.name
            });
            // Don't disconnect on refresh errors - subscriptions still work
            setConnectionStatus('connected');
        }
    }, [roomId, roomCode]);

    const reconnect = useCallback(async () => {
        await refreshData();
    }, [refreshData]);

    // Fetch initial room data when component mounts
    useEffect(() => {
        console.log('🔄 Initial data fetch for room:', roomId);
        refreshData();
    }, [roomId, refreshData]);

    // Set up AppSync subscriptions for real-time updates
    useEffect(() => {
        const subscriptions: any[] = [];

        // Subscribe to presence changes (members joining/leaving)
        const presenceSub = client.graphql({
            query: operations.ON_PRESENCE_CHANGED,
            variables: { roomId }
        }).subscribe({
            next: ({ data }: any) => {
                const member = data.onPresenceChanged;
                console.log('📩 Presence changed:', member);

                if (member.state === 'ONLINE') {
                    localDispatch({
                        type: 'ADD_PARTICIPANT',
                        payload: {
                            id: member.userId,
                            name: member.displayName,
                            avatar: getAvatarForUser(member.userId)
                        }
                    });
                } else {
                    localDispatch({
                        type: 'REMOVE_PARTICIPANT',
                        payload: member.userId
                    });
                }
            },
            error: (err) => console.error('Presence subscription error:', err)
        });
        subscriptions.push(presenceSub);

        // Subscribe to member joined - triggered immediately when someone joins via joinRoom
        const memberJoinedSub = client.graphql({
            query: operations.ON_MEMBER_JOINED,
            variables: { roomId }
        }).subscribe({
            next: ({ data }: any) => {
                const member = data.onMemberJoined;
                console.log('📩 Member joined:', member);
                localDispatch({
                    type: 'ADD_PARTICIPANT',
                    payload: {
                        id: member.userId,
                        name: member.displayName,
                        avatar: getAvatarForUser(member.userId)
                    }
                });
            },
            error: (err) => console.error('Member joined subscription error:', err)
        });
        subscriptions.push(memberJoinedSub);

        // Subscribe to story created - sync new stories across browsers
        const storyCreatedSub = client.graphql({
            query: operations.ON_STORY_CREATED,
            variables: { roomId }
        }).subscribe({
            next: ({ data }: any) => {
                const story = data.onStoryCreated;
                console.log('📩 Story created:', story);
                localDispatch({
                    type: 'ADD_STORY',
                    payload: {
                        id: story.id,
                        title: story.title,
                        description: story.description || ''
                    }
                });
            },
            error: (err) => console.error('Story created subscription error:', err)
        });
        subscriptions.push(storyCreatedSub);

        // Subscribe to story updated - sync story changes (including vote reveals)
        const storyUpdatedSub = client.graphql({
            query: operations.ON_STORY_UPDATED,
            variables: { roomId }
        }).subscribe({
            next: ({ data }: any) => {
                const story = data.onStoryUpdated;
                console.log('📩 Story updated:', story);
                // Update story in local state
                localDispatch({
                    type: 'UPDATE_STORY',
                    payload: {
                        id: story.id,
                        title: story.title
                    }
                });
                // If votes were revealed, update reveal state
                if (story.revealed) {
                    localDispatch({ type: 'REVEAL_VOTES' });
                    if (story.avgVote) {
                        localDispatch({
                            type: 'SET_ESTIMATE',
                            payload: { storyId: story.id, estimate: Number.isInteger(story.avgVote) ? story.avgVote.toString() : story.avgVote.toFixed(1) }
                        });
                    }
                }
            },
            error: (err) => console.error('Story updated subscription error:', err)
        });
        subscriptions.push(storyUpdatedSub);

        // Subscribe to story deleted - sync story deletions across browsers
        const storyDeletedSub = client.graphql({
            query: operations.ON_STORY_DELETED,
            variables: { roomId }
        }).subscribe({
            next: ({ data }: any) => {
                const storyId = data.onStoryDeleted;
                console.log('📩 Story deleted:', storyId);
                localDispatch({
                    type: 'DELETE_STORY',
                    payload: storyId
                });
            },
            error: (err) => console.error('Story deleted subscription error:', err)
        });
        subscriptions.push(storyDeletedSub);

        // Subscribe to votes revealed - sync vote reveal across browsers
        const votesRevealedSub = client.graphql({
            query: operations.ON_VOTES_REVEALED,
            variables: { roomId }
        }).subscribe({
            next: ({ data }: any) => {
                const story = data.onVotesRevealed;
                console.log('📩 Votes revealed:', story);
                localDispatch({ type: 'REVEAL_VOTES' });
                if (story.avgVote) {
                    localDispatch({
                        type: 'SET_ESTIMATE',
                        payload: { storyId: story.id, estimate: Number.isInteger(story.avgVote) ? story.avgVote.toString() : story.avgVote.toFixed(1) }
                    });
                }
            },
            error: (err) => console.error('Votes revealed subscription error:', err)
        });
        subscriptions.push(votesRevealedSub);

        // Subscribe to vote cast - sync vote counts across browsers
        const voteCastSub = client.graphql({
            query: operations.ON_VOTE_CAST,
            variables: { roomId }
        }).subscribe({
            next: ({ data }: any) => {
                const vote = data.onVoteCast;
                console.log('📩 Vote cast:', vote);
                // Track who voted (for vote count display)
                localDispatch({
                    type: 'CAST_VOTE',
                    payload: {
                        participantId: vote.userId,
                        value: vote.value
                    }
                });
            },
            error: (err) => console.error('Vote cast subscription error:', err)
        });
        subscriptions.push(voteCastSub);

        // Subscribe to retro notes added - sync retro cards across browsers
        const retroNoteAddedSub = client.graphql({
            query: operations.ON_RETRO_NOTE_ADDED,
            variables: { roomId }
        }).subscribe({
            next: ({ data }: any) => {
                const note = data.onRetroNoteAdded;
                console.log('📩 Retro note added:', note);
                // Map backend category to frontend column ID
                const categoryMap: Record<string, string> = {
                    'WENT_WELL': 'well',
                    'TO_IMPROVE': 'improve',
                    'ACTION_ITEMS': 'actions'
                };
                const columnId = categoryMap[note.category] || 'well';
                localDispatch({
                    type: 'ADD_RETRO_CARD',
                    payload: {
                        columnId,
                        card: {
                            id: note.id,
                            text: note.text,
                            authorId: note.authorId,
                            votes: note.votes || 0
                        }
                    }
                });
            },
            error: (err) => console.error('Retro note added subscription error:', err)
        });
        subscriptions.push(retroNoteAddedSub);

        // Subscribe to retro note votes - sync retro vote counts across browsers
        const retroNoteVotedSub = client.graphql({
            query: operations.ON_RETRO_NOTE_VOTED,
            variables: { roomId }
        }).subscribe({
            next: ({ data }: any) => {
                const note = data.onRetroNoteVoted;
                console.log('📩 Retro note voted:', note);
                // Map backend category to frontend column ID
                const categoryMap: Record<string, string> = {
                    'WENT_WELL': 'well',
                    'TO_IMPROVE': 'improve',
                    'ACTION_ITEMS': 'actions'
                };
                const columnId = categoryMap[note.category] || 'well';
                // Set absolute vote count to avoid double-counting from subscription + local dispatch
                localDispatch({
                    type: 'SET_RETRO_CARD_VOTES',
                    payload: {
                        columnId,
                        cardId: note.id,
                        votes: note.votes || 0
                    }
                });
            },
            error: (err) => console.error('Retro note voted subscription error:', err)
        });
        subscriptions.push(retroNoteVotedSub);

        // Subscribe to room stage changes - sync mode across browsers
        const stageChangedSub = client.graphql({
            query: operations.ON_STAGE_CHANGED,
            variables: { roomId }
        }).subscribe({
            next: ({ data }: any) => {
                const room = data.onStageChanged;
                console.log('📩 Stage changed:', room);

                // Handle VOTING stage specially - it triggers START_VOTING and syncs currentStoryId
                if (room.stage === 'VOTING') {
                    console.log('📩 Voting started via stage change, currentStoryId:', room.currentStoryId);
                    // Start voting with the current story ID (syncs story + voting state atomically)
                    localDispatch({
                        type: 'START_VOTING',
                        payload: room.currentStoryId ? { storyId: room.currentStoryId } : undefined
                    });
                    return;
                }

                // Handle PLANNING stage - reset voting state
                if (room.stage === 'PLANNING') {
                    console.log('📩 Planning mode - reset voting');
                    localDispatch({ type: 'SET_MODE', payload: 'planning' });
                    localDispatch({ type: 'RESET_VOTING' });
                    return;
                }

                // Map backend stage to frontend mode
                const modeMap: Record<string, RoomMode> = {
                    'PLANNING': 'planning',
                    'RETRO': 'retro',
                    'COMPLETE': 'retro'
                };
                const mode = modeMap[room.stage] || 'planning';
                localDispatch({ type: 'SET_MODE', payload: mode });
            },
            error: (err) => console.error('Stage changed subscription error:', err)
        });
        subscriptions.push(stageChangedSub);

        console.log('✅ AppSync subscriptions established for room:', roomId);

        return () => {
            subscriptions.forEach(sub => {
                try {
                    sub.unsubscribe();
                } catch (err) {
                    console.error('Error unsubscribing:', err);
                }
            });
            console.log('🧹 AppSync subscriptions cleaned up');
        };
    }, [roomId]);

    // Send heartbeat to maintain presence
    useEffect(() => {
        const sendHeartbeat = async () => {
            try {
                await client.graphql({
                    query: operations.SET_PRESENCE,
                    variables: { roomId, state: 'ONLINE' }
                });
            } catch (err) {
                console.error('Heartbeat failed:', err);
            }
        };

        // Small delay to ensure subscriptions are ready before first heartbeat
        const initialDelay = setTimeout(() => {
            sendHeartbeat();
        }, 500);

        // Heartbeat every 15s for better presence responsiveness
        const interval = setInterval(sendHeartbeat, 15000);

        return () => {
            clearTimeout(initialDelay);
            clearInterval(interval);
        };
    }, [roomId]);

    return (
        <CollaborationContext.Provider value={{
            state,
            dispatch,
            currentUser,
            refreshData,
            connectionStatus,
            reconnect,
            addStory,
            updateStory,
            deleteStory,
            selectStory,
            addRetroNote,
            voteRetroNote,
            setRoomMode,
            startVoting,
            revealVotes,
            castVote,
            resetVoting,
            roomId
        }}>
            {children}
        </CollaborationContext.Provider>
    );
}

const ConnectionStatusIndicator: React.FC = () => {
    const { connectionStatus } = useCollaborationContext();
    const statusMap = {
        connected: { color: 'bg-green-500', text: 'Connected to room' },
        connecting: { color: 'bg-yellow-500 animate-pulse', text: 'Connecting...' },
        disconnected: { color: 'bg-red-500', text: 'Connection lost. Attempting to reconnect...' },
    };
    const { color, text } = statusMap[connectionStatus];
    return (
        <div className="flex items-center gap-2 group relative">
            <div className={`w-3 h-3 rounded-full transition-colors ${color}`}></div>
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-max bg-slate-700 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {text}
            </div>
        </div>
    );
}

const Room: React.FC<{ onLeave: () => void }> = ({ onLeave }) => {
  const { state, dispatch, currentUser, refreshData, connectionStatus, reconnect, setRoomMode } = useCollaborationContext();
  const { roomCode, mode, isVotingActive, icebreaker, facilitatorId, areVotesRevealed, showIndividualVotes } = state;
  const [copyStatus, setCopyStatus] = useState('Copy Link');
  const [refreshStatus, setRefreshStatus] = useState('Refresh');
  const roomUrl = `${window.location.origin}${window.location.pathname}#${roomCode}`;
  const isFacilitator = currentUser.id === facilitatorId;

  useEffect(() => { document.body.classList.toggle('voting-active-bg', isVotingActive && mode === 'planning'); return () => { document.body.classList.remove('voting-active-bg'); } }, [isVotingActive, mode]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomUrl).then(() => { setCopyStatus('Copied!'); setTimeout(() => setCopyStatus('Copy Link'), 2000); });
  };

  const handleRefresh = async () => {
    if (connectionStatus === 'disconnected') {
        reconnect();
        return;
    }
    setRefreshStatus('Syncing...');
    try {
        await refreshData();
        setRefreshStatus('Synced!');
        setTimeout(() => setRefreshStatus('Refresh'), 2000);
    } catch (error) {
        console.error("Refresh failed:", error);
        setRefreshStatus('Failed!');
        setTimeout(() => setRefreshStatus('Refresh'), 3000);
    }
  };

  const handleNewIcebreaker = () => {
    const otherQuestions = ICEBREAKER_QUESTIONS.filter(q => q !== icebreaker);
    const questionsPool = otherQuestions.length > 0 ? otherQuestions : ICEBREAKER_QUESTIONS;
    const newIcebreaker = questionsPool[Math.floor(Math.random() * questionsPool.length)];
    dispatch({ type: 'SET_ICEBREAKER', payload: newIcebreaker });
  };

  // Use backend-synced mode change (broadcasts to all clients)
  const handleSetMode = (targetMode: RoomMode) => setRoomMode(targetMode);
  const ModeButton: React.FC<{ targetMode: RoomMode; children: React.ReactNode }> = ({ targetMode, children }) => (<button onClick={() => handleSetMode(targetMode)} className={`px-4 py-2 rounded-md font-semibold transition-colors ${mode === targetMode ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>{children}</button>);

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8 font-sans">
      <header className="mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
                 <img src={currentUser.avatar} alt={currentUser.name} className="w-12 h-12 rounded-full ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-sky-500" />
                 <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200">{currentUser.name}</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Room: <span className="font-mono bg-slate-200 dark:bg-slate-700 px-3 py-1.5 rounded-md text-base font-semibold">{roomCode}</span></p>
                        <button onClick={handleCopyLink} className="flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400 hover:underline"><ClipboardIcon className="w-4 h-4" /> {copyStatus}</button>
                        <button onClick={handleRefresh} className="flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400 hover:underline" disabled={refreshStatus !== 'Refresh' && connectionStatus !== 'disconnected'}>
                            <RefreshIcon className="w-4 h-4" /> {connectionStatus === 'disconnected' ? 'Reconnect' : refreshStatus}
                        </button>
                        {!isFacilitator && <ConnectionStatusIndicator />}
                    </div>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Timer />
                <div className="flex items-center space-x-2 bg-slate-200/50 dark:bg-slate-800 p-1 rounded-lg"><ModeButton targetMode="planning">Planning Poker</ModeButton><ModeButton targetMode="retro">Retrospective</ModeButton></div>
                <ThemeToggle />
            </div>
        </div>
        {icebreaker && (
          <div className="mt-4 flex items-center justify-between gap-4 bg-sky-100/50 dark:bg-sky-900/20 p-3 rounded-lg">
            <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Icebreaker: <span className="font-normal">{icebreaker}</span></p>
                {isFacilitator && (
                  <button onClick={handleNewIcebreaker} title="New icebreaker" className="p-1 rounded-full hover:bg-slate-300/50 dark:hover:bg-slate-600/50 transition-colors">
                    <RefreshIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </button>
                )}
            </div>

            {isFacilitator && areVotesRevealed && mode === 'planning' && (
              <div className="flex items-center gap-2 animate-slide-in">
                <label htmlFor="show-votes-toggle" className="text-sm font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                  Show individual votes
                </label>
                <input
                  type="checkbox"
                  id="show-votes-toggle"
                  checked={showIndividualVotes}
                  onChange={() => dispatch({ type: 'TOGGLE_SHOW_INDIVIDUAL_VOTES' })}
                  className="w-4 h-4 rounded text-sky-600 bg-slate-200 border-slate-300 focus:ring-sky-500 dark:bg-slate-700 dark:border-slate-600 dark:focus:ring-sky-600 dark:ring-offset-slate-900 cursor-pointer"
                />
              </div>
            )}
          </div>
        )}
      </header>
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 mt-4">
        <div className="lg:col-span-1"><ParticipantList /></div>
        <div className="lg:col-span-3 flex flex-col gap-6">{mode === 'planning' ? <PlanningView /> : <RetroMode currentUser={currentUser} />}</div>
      </main>
    </div>
  );
};

// --- ROOT APP COMPONENT ---
export default function App() {
  const { isAuthenticated, isLoading: authLoading, user, signOutUser: _signOutUser } = useAuth();

  const signOutUser = useCallback(async () => {
    await _signOutUser();
    window.location.reload();
  }, [_signOutUser]);
  const [roomInfo, setRoomInfo] = useState<{ code: string; roomId: string; participant: Participant; facilitatorId: string } | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const joinRoom = useCallback(async (name: string, code: string, avatar: string) => {
    if (!user) return;

    setIsJoining(true);
    setJoinError(null);

    try {
      // Try to join and fetch room details in parallel for faster join
      const [joinResponse, roomResponse] = await Promise.all([
        client.graphql({
          query: operations.JOIN_ROOM,
          variables: {
            code,
            displayName: name
          }
        }),
        client.graphql({
          query: operations.GET_ROOM_BY_CODE,
          variables: { code }
        })
      ]) as [any, any];

      const member = joinResponse.data.joinRoom;
      const room = roomResponse.data.getRoomByCode;

      if (room && member) {
        const participant: Participant = {
          id: member.userId,
          name: member.displayName,
          avatar: getAvatarForUser(member.userId)
        };

        setRoomInfo({
          code: room.code,
          roomId: room.id,
          participant,
          facilitatorId: room.createdBy
        });

        window.location.hash = code;
        setIsJoining(false);
        return;
      }
    } catch (joinErr: any) {
      console.log('Room does not exist, creating new room...');

      // Room doesn't exist, create it
      try {
        const createResponse: any = await client.graphql({
          query: operations.CREATE_ROOM,
          variables: {
            name: `${name}'s Room`,
            code
          }
        });

        const newRoom = createResponse.data.createRoom;

        // Join the newly created room
        const joinResponse: any = await client.graphql({
          query: operations.JOIN_ROOM,
          variables: {
            code,
            displayName: name
          }
        });

        const member = joinResponse.data.joinRoom;

        const participant: Participant = {
          id: member.userId,
          name: member.displayName,
          avatar: getAvatarForUser(member.userId)
        };

        setRoomInfo({
          code: newRoom.code,
          roomId: newRoom.id,
          participant,
          facilitatorId: newRoom.createdBy
        });

        window.location.hash = code;
        setIsJoining(false);
        return;
      } catch (createErr: any) {
        console.error('Failed to create room:', createErr);
        console.error('Create room error details:', JSON.stringify(createErr, null, 2));
        if (createErr.errors) {
          console.error('GraphQL errors:', createErr.errors);
        }
        setJoinError(createErr.errors?.[0]?.message || createErr.message || 'Failed to create room');
        setIsJoining(false);
        return;
      }
    }

    setJoinError('Failed to join or create room');
    setIsJoining(false);
  }, [user]);

  const leaveRoom = useCallback(async () => {
      if (roomInfo) {
        try {
          // Set presence to offline
          await client.graphql({
            query: operations.SET_PRESENCE,
            variables: {
              roomId: roomInfo.roomId,
              state: 'OFFLINE'
            }
          });
        } catch (err) {
          console.error('Failed to set offline presence:', err);
        }
      }

      setRoomInfo(null);
      window.location.hash = '';
  }, [roomInfo]);

  // Not authenticated - show auth flow
  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <AuthFlow onAuthSuccess={() => {
          console.log('Authenticated - reloading to update state');
          setTimeout(() => window.location.reload(), 100);
        }} />
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

  // Authenticated but not in room - show lobby
  if (!roomInfo) {
    return <Lobby
      onJoinRoom={joinRoom}
      isJoining={isJoining}
      joinError={joinError}
      onSignOut={signOutUser}
      userDisplayName={user?.displayName}
      userEmail={user?.email}
    />;
  }

  // In room - show full UI
  return (
    <CollaborationProvider
        roomCode={roomInfo.code}
        roomId={roomInfo.roomId}
        currentUser={roomInfo.participant}
        facilitatorId={roomInfo.facilitatorId}
    >
        <Room onLeave={leaveRoom} />
    </CollaborationProvider>
  );
}
