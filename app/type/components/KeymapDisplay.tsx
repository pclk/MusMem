"use client";

interface KeymapDisplayProps {
  prompt: string;
  typedCommand: string;
  acceptedInputs: string[];
  lastSubmission?: {
    correct: boolean;
    typedCommand: string;
  } | null;
  isFocused?: boolean;
}

export default function KeymapDisplay({
  prompt,
  typedCommand,
  acceptedInputs,
  lastSubmission,
  isFocused = true,
}: KeymapDisplayProps) {
  return (
    <div className="space-y-4 font-mono">
      <div>
        <p className="text-zinc-400 text-sm uppercase tracking-wider">Prompt</p>
        <p className="text-2xl text-zinc-100 mt-1">{prompt}</p>
      </div>

      <div>
        <p className="text-zinc-400 text-sm uppercase tracking-wider">Command buffer</p>
        <p className="text-xl mt-1 text-emerald-400">:{typedCommand}{isFocused ? <span className="animate-pulse">|</span> : (!typedCommand ? "_" : "")}</p>
      </div>

      {lastSubmission && (
        <div className={lastSubmission.correct ? "text-emerald-400" : "text-red-400"}>
          {lastSubmission.correct
            ? "Correct"
            : `Incorrect (${lastSubmission.typedCommand || "∅"}). Expected: ${acceptedInputs.join(" or ")}`}
        </div>
      )}
    </div>
  );
}
