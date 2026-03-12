"use client";

import { useEffect, useRef, useState } from "react";

interface KeymapDisplayProps {
  prompt: string;
  typedCommand: string;
  acceptedInputs: string[];
  upcomingPrompts: string[];
  activeModifiers?: string[];
  lastSubmission?: {
    correct: boolean;
    typedCommand: string;
    displayTypedCommand?: string;
    expectedInput?: string;
  } | null;
  isFocused?: boolean;
}

export default function KeymapDisplay({
  prompt,
  typedCommand,
  acceptedInputs,
  upcomingPrompts,
  activeModifiers = [],
  lastSubmission,
  isFocused = true,
}: KeymapDisplayProps) {
  const expectedDisplay = lastSubmission?.expectedInput ?? acceptedInputs[0] ?? "";
  const [stackVersion, setStackVersion] = useState(0);
  const previousPromptRef = useRef(prompt);

  useEffect(() => {
    if (previousPromptRef.current === prompt) return;
    previousPromptRef.current = prompt;
    setStackVersion((current) => current + 1);
  }, [prompt]);

  return (
    <div className="space-y-4 font-mono">
      <div className="space-y-3">
        <div>
          <p className="text-zinc-400 text-sm uppercase tracking-wider">Prompt</p>
          <div
            key={`prompt-${stackVersion}`}
            className="keymap-slide-up mt-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3"
          >
            <p className="text-2xl text-zinc-100">{prompt}</p>
          </div>
        </div>

        {upcomingPrompts.length > 0 && (
          <div>
            <p className="text-zinc-400 text-sm uppercase tracking-wider">Up next</p>
            <div className="mt-2 grid gap-2">
              {upcomingPrompts.map((upcomingPrompt, index) => (
                <div
                  key={`${stackVersion}-${upcomingPrompt}-${index}`}
                  className="keymap-slide-up rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-300"
                  style={{ animationDelay: `${(index + 1) * 45}ms` }}
                >
                  {upcomingPrompt}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="text-zinc-400 text-sm uppercase tracking-wider">Command buffer</p>
        <p className="text-xl mt-1 text-emerald-400">:{typedCommand}{isFocused ? <span className="animate-pulse">|</span> : (!typedCommand ? "_" : "")}</p>
      </div>

      <div>
        <p className="text-zinc-400 text-sm uppercase tracking-wider">Held modifiers</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {activeModifiers.length > 0 ? (
            activeModifiers.map((modifier) => (
              <span
                key={modifier}
                className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300"
              >
                {modifier}
              </span>
            ))
          ) : (
            <span className="text-sm text-zinc-500">None</span>
          )}
        </div>
      </div>

      {lastSubmission && (
        <div className={lastSubmission.correct ? "text-emerald-400" : "text-red-400"}>
          {lastSubmission.correct
            ? "Correct"
            : `Incorrect (${lastSubmission.displayTypedCommand || lastSubmission.typedCommand || "∅"}). Expected: ${expectedDisplay}`}
        </div>
      )}

      <style jsx>{`
        .keymap-slide-up {
          animation: keymap-slide-up 220ms ease both;
        }

        @keyframes keymap-slide-up {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
