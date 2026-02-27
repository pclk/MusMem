"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import WordDisplay from "./WordDisplay";

interface Keystroke {
  char: string;
  timestamp: number;
  correct: boolean;
}

interface TypingState {
  words: string[];
  currentWordIdx: number;
  currentCharIdx: number;
  typed: string[];
  keystrokes: Keystroke[];
}

type TypingAction =
  | { type: "SET_WORDS"; words: string[] }
  | { type: "TYPE_CHAR"; char: string; timestamp: number }
  | { type: "BACKSPACE" }
  | { type: "NEXT_WORD"; timestamp: number };

function typingReducer(state: TypingState, action: TypingAction): TypingState {
  switch (action.type) {
    case "SET_WORDS":
      return {
        words: action.words,
        currentWordIdx: 0,
        currentCharIdx: 0,
        typed: [],
        keystrokes: [],
      };

    case "TYPE_CHAR": {
      const { char, timestamp } = action;
      const currentWord = state.words[state.currentWordIdx] || "";
      const expectedChar = currentWord[state.currentCharIdx] || "";
      const correct = char === expectedChar;

      const newTyped = [...state.typed];
      if (!newTyped[state.currentWordIdx]) newTyped[state.currentWordIdx] = "";
      newTyped[state.currentWordIdx] += char;

      return {
        ...state,
        currentCharIdx: state.currentCharIdx + 1,
        typed: newTyped,
        keystrokes: [
          ...state.keystrokes,
          { char, timestamp, correct },
        ],
      };
    }

    case "BACKSPACE": {
      if (state.currentCharIdx === 0) return state;

      const newTyped = [...state.typed];
      if (newTyped[state.currentWordIdx]) {
        newTyped[state.currentWordIdx] = newTyped[state.currentWordIdx].slice(0, -1);
      }

      return {
        ...state,
        currentCharIdx: state.currentCharIdx - 1,
        typed: newTyped,
      };
    }

    case "NEXT_WORD": {
      const { timestamp } = action;
      // Mark remaining chars as errors if word was incomplete
      const currentWord = state.words[state.currentWordIdx] || "";
      const newKeystrokes = [...state.keystrokes];

      for (let i = state.currentCharIdx; i < currentWord.length; i++) {
        newKeystrokes.push({
          char: "",
          timestamp,
          correct: false,
        });
      }

      // Add space keystroke
      newKeystrokes.push({
        char: " ",
        timestamp,
        correct: true,
      });

      return {
        ...state,
        currentWordIdx: state.currentWordIdx + 1,
        currentCharIdx: 0,
        keystrokes: newKeystrokes,
      };
    }

    default:
      return state;
  }
}

export default function TypingEngine() {
  const [state, dispatch] = useReducer(typingReducer, {
    words: [],
    currentWordIdx: 0,
    currentCharIdx: 0,
    typed: [],
    keystrokes: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionStats, setSessionStats] = useState<{
    accuracy: number;
    wpm: number;
    pagesCompleted: number;
  } | null>(null);
  const [fadeIn, setFadeIn] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const isActive = Date.now() - lastActivity < 2000;
  const isPageComplete =
    state.words.length > 0 &&
    state.currentWordIdx >= state.words.length;

  const fetchNextPage = useCallback(async () => {
    setIsLoading(true);
    setFadeIn(false);
    try {
      const res = await fetch("/api/pages/next");
      if (!res.ok) throw new Error("Failed to fetch page");
      const data = await res.json();
      const words = data.text.split(" ").filter((w: string) => w.length > 0);
      dispatch({ type: "SET_WORDS", words });
      setTimeout(() => setFadeIn(true), 50);
    } catch (error) {
      console.error("Failed to fetch page:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitPage = useCallback(async () => {
    const targetText = state.words.join(" ");
    const typedText = state.typed.join(" ");

    try {
      const res = await fetch("/api/pages/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetText,
          typedText,
          keystrokeTimings: state.keystrokes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSessionStats({
          accuracy: data.accuracy,
          wpm: data.wpm,
          pagesCompleted: data.pagesCompleted,
        });
      }
    } catch (error) {
      console.error("Failed to submit page:", error);
    }

    fetchNextPage();
  }, [state.words, state.typed, state.keystrokes, fetchNextPage]);

  useEffect(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  useEffect(() => {
    if (isPageComplete) {
      submitPage();
    }
  }, [isPageComplete, submitPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading || isPageComplete) return;

      // Ignore modifier keys (except Shift)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const timestamp = Date.now();
      setLastActivity(timestamp);

      if (e.key === "Backspace") {
        e.preventDefault();
        dispatch({ type: "BACKSPACE" });
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        if (state.currentWordIdx < state.words.length - 1) {
          dispatch({ type: "NEXT_WORD", timestamp });
        } else if (state.currentWordIdx === state.words.length - 1) {
          // Last word - only advance if something was typed
          if (state.typed[state.currentWordIdx]?.length > 0) {
            dispatch({ type: "NEXT_WORD", timestamp });
          }
        }
        return;
      }

      // Only accept printable single characters
      if (e.key.length === 1) {
        e.preventDefault();
        dispatch({ type: "TYPE_CHAR", char: e.key, timestamp });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, isPageComplete, state.currentWordIdx, state.words.length, state.typed]);

  // Focus container on mount
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-4xl mx-auto outline-none"
      tabIndex={0}
    >
      {/* Stats bar */}
      {sessionStats && (
        <div className="flex gap-6 mb-6 text-sm text-zinc-400">
          <span>
            WPM: <span className="text-emerald-400 font-medium">{sessionStats.wpm ?? "—"}</span>
          </span>
          <span>
            Accuracy:{" "}
            <span className="text-emerald-400 font-medium">
              {sessionStats.accuracy?.toFixed(1) ?? "—"}%
            </span>
          </span>
          <span>
            Pages: <span className="text-emerald-400 font-medium">{sessionStats.pagesCompleted}</span>
          </span>
        </div>
      )}

      {/* Typing area */}
      <div
        className={`min-h-[200px] p-8 rounded-xl border border-zinc-800 bg-zinc-900/50 transition-opacity duration-150 ${
          fadeIn ? "opacity-100" : "opacity-0"
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-zinc-500 animate-pulse">Loading...</div>
          </div>
        ) : (
          <WordDisplay
            words={state.words}
            currentWordIdx={state.currentWordIdx}
            currentCharIdx={state.currentCharIdx}
            typed={state.typed}
          />
        )}
      </div>

      {/* Instructions */}
      <p className="mt-4 text-center text-sm text-zinc-600">
        {isActive ? "" : "Start typing to begin • Space to advance • Backspace to correct"}
      </p>
    </div>
  );
}
