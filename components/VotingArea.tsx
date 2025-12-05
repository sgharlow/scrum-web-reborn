import React from 'react';
import type { VoteValue } from '../types';
import { CoffeeIcon, QuestionIcon } from './Icons';
import { useCollaborationContext } from '../App';
import { VOTING_SCALE } from '../constants';

const VoteCard: React.FC<{
  value: VoteValue;
  onVote: (value: VoteValue) => void;
  disabled: boolean;
  selected: boolean;
}> = ({ value, onVote, disabled, selected }) => {
  const isSpecialCard = typeof value !== 'number';

  return (
    <button
      onClick={() => onVote(value)}
      disabled={disabled}
      className={`
        w-20 h-28 sm:w-24 sm:h-32
        flex flex-col items-center justify-center
        rounded-lg border-2
        shadow-lg transform transition-all duration-200
        ${selected
          ? 'bg-green-500 dark:bg-green-600 border-green-600 dark:border-green-500 ring-4 ring-green-300 scale-105'
          : isSpecialCard
            ? 'bg-amber-100 dark:bg-amber-800 border-amber-300 dark:border-amber-600'
            : 'bg-sky-100 dark:bg-sky-800 border-sky-300 dark:border-sky-600'}
        ${disabled && !selected ? 'opacity-50 cursor-not-allowed scale-95' : !disabled ? 'hover:-translate-y-2 hover:shadow-2xl' : ''}
      `}
    >
      <span className={`text-3xl sm:text-4xl font-bold ${selected ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
        {value === '☕' ? <CoffeeIcon className="w-10 h-10"/> : value === '❓' ? <QuestionIcon className="w-10 h-10"/> : value}
      </span>
    </button>
  );
};

export default function VotingArea() {
    const { state, currentUser, castVote } = useCollaborationContext();
    const { areVotesRevealed, isVotingActive, votes, participants, facilitatorId, currentStoryId } = state;
    const isFacilitator = currentUser.id === facilitatorId;
    const userVote = votes[currentUser.id];
    const userHasVoted = !!userVote;
    const votesCount = Object.keys(votes).length;
    const participantsCount = participants.length;
    const allVoted = votesCount >= participantsCount && participantsCount > 0;

    const handleVote = (value: VoteValue) => {
        if (userHasVoted || areVotesRevealed || !isVotingActive || !currentStoryId) return;
        castVote(currentStoryId, String(value));
    };

    // Determine voting prompt based on state
    let votingPrompt: string;
    let promptColor = 'text-slate-700 dark:text-slate-300';

    if (areVotesRevealed) {
        votingPrompt = "Voting complete - results shown above";
        promptColor = 'text-green-600 dark:text-green-400';
    } else if (!isVotingActive) {
        votingPrompt = isFacilitator
            ? "Click 'Start Voting' above to begin"
            : "Waiting for facilitator to start voting...";
        promptColor = 'text-amber-600 dark:text-amber-400';
    } else if (userHasVoted) {
        votingPrompt = allVoted
            ? "Everyone has voted! Facilitator can reveal votes."
            : `You voted! Waiting for others... (${votesCount}/${participantsCount})`;
        promptColor = 'text-blue-600 dark:text-blue-400';
    } else {
        votingPrompt = "Cast your vote!";
        promptColor = 'text-green-600 dark:text-green-400';
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 flex flex-col items-center">
            <h2 className={`text-xl font-bold mb-4 ${promptColor}`}>{votingPrompt}</h2>

            {/* Vote cards - shown but disabled when voting not active */}
            <div className="flex flex-wrap justify-center gap-4">
                {VOTING_SCALE.map(value => (
                    <VoteCard
                        key={String(value)}
                        value={value}
                        onVote={handleVote}
                        disabled={userHasVoted || areVotesRevealed || !isVotingActive}
                        selected={userVote === value || userVote === String(value)}
                    />
                ))}
            </div>
        </div>
    );
}