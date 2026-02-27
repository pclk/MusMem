"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import WordDisplay from "./WordDisplay";
import KeymapDisplay from "./KeymapDisplay";
import { PracticeMode } from "@/lib/schemas/mode";
import { KeymapExercise } from "@/lib/keymaps/vim-basic";

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
  mode: PracticeMode;
  exercise: KeymapExercise | null;
  commandBuffer: string;
  commandStartedAt: number | null;
}

type TypingAction =
  | { type: "SET_TEXT_PAGE"; words: string[] }
  | { type: "SET_KEYMAP_PAGE"; exercise: KeymapExercise }
  | { type: "TYPE_CHAR"; char: string; timestamp: number }
  | { type: "BACKSPACE" }
  | { type: "NEXT_WORD"; timestamp: number }
  | { type: "RESET_COMMAND" };

function typingReducer(state: TypingState, action: TypingAction): TypingState {
  switch (action.type) {
    case "SET_TEXT_PAGE":
      return { ...state, mode: "TEXT", words: action.words, currentWordIdx: 0, currentCharIdx: 0, typed: [], keystrokes: [], exercise: null, commandBuffer: "", commandStartedAt: null };
    case "SET_KEYMAP_PAGE":
      return { ...state, mode: "KEYMAP", words: [], currentWordIdx: 0, currentCharIdx: 0, typed: [], keystrokes: [], exercise: action.exercise, commandBuffer: "", commandStartedAt: null };
    case "TYPE_CHAR": {
      const { char, timestamp } = action;
      if (state.mode === "KEYMAP") {
        return {
          ...state,
          commandBuffer: state.commandBuffer + char,
          commandStartedAt: state.commandStartedAt ?? timestamp,
          keystrokes: [...state.keystrokes, { char, timestamp, correct: true }],
        };
      }
      const currentWord = state.words[state.currentWordIdx] || "";
      const expectedChar = currentWord[state.currentCharIdx] || "";
      const correct = char === expectedChar;
      const newTyped = [...state.typed];
      if (!newTyped[state.currentWordIdx]) newTyped[state.currentWordIdx] = "";
      newTyped[state.currentWordIdx] += char;
      return { ...state, currentCharIdx: state.currentCharIdx + 1, typed: newTyped, keystrokes: [...state.keystrokes, { char, timestamp, correct }] };
    }
    case "BACKSPACE": {
      if (state.mode === "KEYMAP") {
        if (!state.commandBuffer.length) return state;
        return { ...state, commandBuffer: state.commandBuffer.slice(0, -1) };
      }
      if (state.currentCharIdx === 0) return state;
      const newTyped = [...state.typed];
      if (newTyped[state.currentWordIdx]) newTyped[state.currentWordIdx] = newTyped[state.currentWordIdx].slice(0, -1);
      return { ...state, currentCharIdx: state.currentCharIdx - 1, typed: newTyped };
    }
    case "NEXT_WORD": {
      const currentWord = state.words[state.currentWordIdx] || "";
      const newKeystrokes = [...state.keystrokes];
      for (let i = state.currentCharIdx; i < currentWord.length; i++) {
        newKeystrokes.push({ char: "", timestamp: action.timestamp, correct: false });
      }
      newKeystrokes.push({ char: " ", timestamp: action.timestamp, correct: true });
      return { ...state, currentWordIdx: state.currentWordIdx + 1, currentCharIdx: 0, keystrokes: newKeystrokes };
    }
    case "RESET_COMMAND":
      return { ...state, commandBuffer: "", keystrokes: [], commandStartedAt: null };
    default:
      return state;
  }
}

export default function TypingEngine() {
  const [state, dispatch] = useReducer(typingReducer, {
    words: [], currentWordIdx: 0, currentCharIdx: 0, typed: [], keystrokes: [], mode: "TEXT", exercise: null, commandBuffer: "", commandStartedAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionStats, setSessionStats] = useState<{ accuracy: number; wpm: number; pagesCompleted: number } | null>(null);
  const [fadeIn, setFadeIn] = useState(true);
  const [lastSubmission, setLastSubmission] = useState<{ correct: boolean; typedCommand: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isActive = Date.now() - lastActivity < 2000;
  const isPageComplete = state.mode === "TEXT" && state.words.length > 0 && state.currentWordIdx >= state.words.length;

  const fetchNextPage = useCallback(async () => {
    setIsLoading(true);
    setFadeIn(false);
    try {
      const res = await fetch("/api/pages/next");
      if (!res.ok) throw new Error("Failed to fetch page");
      const data = await res.json();
      if (data.mode === "KEYMAP" && data.exercise) {
        dispatch({ type: "SET_KEYMAP_PAGE", exercise: data.exercise });
      } else {
        const words = data.text.split(" ").filter((w: string) => w.length > 0);
        dispatch({ type: "SET_TEXT_PAGE", words });
      }
      setTimeout(() => setFadeIn(true), 50);
    } catch (error) {
      console.error("Failed to fetch page:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitTextPage = useCallback(async () => {
    const targetText = state.words.join(" ");
    const typedText = state.typed.join(" ");
    setIsPageTransitioning(true);
    try {
      const res = await fetch("/api/pages/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "TEXT", targetText, typedText, keystrokeTimings: state.keystrokes }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessionStats({ accuracy: data.accuracy, wpm: data.wpm, pagesCompleted: data.pagesCompleted });
      }
    } catch (error) {
      console.error("Failed to submit page:", error);
    }
    await fetchNextPage();
    setIsPageTransitioning(false);
  }, [state.words, state.typed, state.keystrokes, fetchNextPage]);

  const submitKeymap = useCallback(async () => {
    if (!state.exercise) return;
    const typedCommand = state.commandBuffer;
    const correct = state.exercise.acceptedInputs.includes(typedCommand);
    const endedAt = Date.now();
    const latencyMs = state.commandStartedAt ? Math.max(0, endedAt - state.commandStartedAt) : 0;
    setLastSubmission({ correct, typedCommand });
    try {
      const res = await fetch("/api/pages/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "KEYMAP",
          exerciseId: state.exercise.id,
          prompt: state.exercise.prompt,
          acceptedInputs: state.exercise.acceptedInputs,
          typedCommand,
          correct,
          latencyMs,
          keystrokeTimings: state.keystrokes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessionStats({ accuracy: data.accuracy, wpm: data.wpm, pagesCompleted: data.pagesCompleted });
      }
    } catch (error) {
      console.error("Failed to submit keymap:", error);
    }
    await fetchNextPage();
  }, [state.exercise, state.commandBuffer, state.commandStartedAt, state.keystrokes, fetchNextPage]);

  useEffect(() => { fetchNextPage(); }, [fetchNextPage]);
  useEffect(() => { if (isPageComplete) submitTextPage(); }, [isPageComplete, submitTextPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading || isPageTransitioning) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const timestamp = Date.now();
      setLastActivity(timestamp);

      if (e.key === "Backspace") {
        e.preventDefault();
        dispatch({ type: "BACKSPACE" });
        return;
      }

      if (state.mode === "KEYMAP") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (state.commandBuffer.length > 0) {
            submitKeymap();
            dispatch({ type: "RESET_COMMAND" });
          }
          return;
        }
      } else if (e.key === " ") {
        e.preventDefault();
        if (state.currentWordIdx < state.words.length - 1) dispatch({ type: "NEXT_WORD", timestamp });
        else if (state.currentWordIdx === state.words.length - 1 && state.typed[state.currentWordIdx]?.length > 0) dispatch({ type: "NEXT_WORD", timestamp });
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        dispatch({ type: "TYPE_CHAR", char: e.key, timestamp });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, isPageTransitioning, state.mode, state.currentWordIdx, state.words.length, state.typed, state.commandBuffer, submitKeymap]);

  useEffect(() => { containerRef.current?.focus(); }, []);

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto outline-none" tabIndex={0}>
      {sessionStats && (
        <div className="flex gap-6 mb-6 text-sm text-zinc-400">
          <span>WPM: <span className="text-emerald-400 font-medium">{sessionStats.wpm ?? "—"}</span></span>
          <span>Accuracy: <span className="text-emerald-400 font-medium">{sessionStats.accuracy?.toFixed(1) ?? "—"}%</span></span>
          <span>Pages: <span className="text-emerald-400 font-medium">{sessionStats.pagesCompleted}</span></span>
        </div>
      )}

      <div className={`min-h-[200px] p-8 rounded-xl border border-zinc-800 bg-zinc-900/50 transition-opacity duration-150 ${fadeIn ? "opacity-100" : "opacity-0"}`}>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-zinc-400 animate-pulse text-xl text-center">{isPageTransitioning ? "Page complete! Loading next page..." : "Loading..."}</div>
          </div>
        ) : state.mode === "KEYMAP" && state.exercise ? (
          <KeymapDisplay prompt={state.exercise.prompt} typedCommand={state.commandBuffer} acceptedInputs={state.exercise.acceptedInputs} lastSubmission={lastSubmission} />
        ) : (
          <WordDisplay words={state.words} currentWordIdx={state.currentWordIdx} currentCharIdx={state.currentCharIdx} typed={state.typed} />
        )}
      </div>

      <p className="mt-4 text-center text-base text-zinc-600">
        {isActive ? "" : state.mode === "KEYMAP" ? "Type command and press Enter (or Space) • Backspace to correct" : "Start typing to begin • Space to advance • Backspace to correct"}
      </p>
    </div>
  );
}
