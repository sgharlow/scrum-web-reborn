import React from 'react';
import type { VoteValue } from '../types';
import { useCollaborationContext } from '../App';

export default function ResultsDisplay() {
  const { state } = useCollaborationContext();
  const { votes, participants, areVotesRevealed, currentStoryId, stories } = state;

  if (!areVotesRevealed) return null;

  const currentStory = stories.find(s => s.id === currentStoryId);

  const voteCounts = Object.values(votes).reduce((acc, vote) => {
    const key = String(vote);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedVotes = Object.entries(voteCounts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => {
        const valA = parseFloat(a.value);
        const valB = parseFloat(b.value);
        if (!isNaN(valA) && !isNaN(valB)) return valA - valB;
        return a.value.localeCompare(b.value);
    });

  const numericVotes = Object.values(votes).filter((v): v is number => typeof v === 'number');
  const minVote = numericVotes.length > 0 ? Math.min(...numericVotes) : null;
  const maxVote = numericVotes.length > 0 ? Math.max(...numericVotes) : null;
  
  const numericVoteValues = sortedVotes
    .map(({ value }) => parseFloat(value))
    .filter(v => !isNaN(v));
  const maxVoteValue = numericVoteValues.length > 0 ? Math.max(...numericVoteValues) : 1;
  
  const specialVotes = Object.entries(votes)
    .filter(([, value]) => typeof value !== 'number')
    .map(([participantId, value]) => ({
      participantName: participants.find(p => p.id === participantId)?.name || 'Someone',
      value
    }));

  const getBarColor = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'bg-amber-400 dark:bg-amber-500';
    if (numValue === minVote || numValue === maxVote) {
        if (new Set(numericVotes).size > 1) return 'bg-red-500 dark:bg-red-600';
    }
    return 'bg-sky-500 dark:bg-sky-600';
  }

  // Format estimate to 1 decimal place for display
  const formatEstimate = (estimate: VoteValue) => {
    if (typeof estimate === 'number') {
      return Number.isInteger(estimate) ? estimate : estimate.toFixed(1);
    }
    return estimate;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 animate-reveal">
      {/* Header with agreed estimate inline */}
      <div className="flex justify-center items-center gap-3 mb-3">
        <h2 className="text-lg font-bold">Voting Results</h2>
        {currentStory && currentStory.estimate != null && (
          <div className="flex items-center gap-1.5 bg-sky-100 dark:bg-sky-900 px-3 py-1 rounded-full">
            <span className="text-xs text-slate-600 dark:text-slate-300">Agreed:</span>
            <span className="text-lg font-bold text-sky-600 dark:text-sky-400">{formatEstimate(currentStory.estimate)}</span>
          </div>
        )}
      </div>

      {sortedVotes.length > 0 ? (
        <div className="flex justify-center items-end gap-3 h-20">
            {sortedVotes.map(({ value, count }) => {
              const numericValue = parseFloat(value);
              const height = isNaN(numericValue) ? 15 : (numericValue / maxVoteValue) * 85 + 15;
              return (
                <div key={value} className="flex flex-col items-center h-full justify-end" title={`${count} vote(s)`}>
                    <div
                        className={`w-10 rounded-t-md transition-all duration-500 ${getBarColor(value)} flex items-start justify-center`}
                        style={{ height: `${height}%` }}
                    >
                        <span className="text-white font-bold text-xs mt-0.5">{count}</span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{value}</div>
                </div>
              );
            })}
        </div>
      ) : (
        <p className="text-center text-slate-500">No votes have been cast.</p>
      )}

      {specialVotes.length > 0 && (
        <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex justify-center items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Special:</span>
                {specialVotes.map((vote, i) => (
                    <span key={i} className="bg-amber-100 dark:bg-amber-800 px-2 py-0.5 rounded">
                        {vote.participantName} {vote.value}
                    </span>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}