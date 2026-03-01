"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
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

interface TypingEngineProps {
  initialCharsPerPage: number;
  initialTargetedPracticeRatio: number;
  initialMode: "TEXT" | "KEYMAP";
  activeListId: string | null;
  wordLists: { id: string; name: string }[];
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

export default function TypingEngine({
  initialCharsPerPage,
  initialTargetedPracticeRatio,
  initialMode,
  activeListId,
  wordLists,
}: TypingEngineProps) {
  const targetedPracticeTooltip =
    "Controls how much of each page focuses on your weak patterns. Higher values include more words that match your weak bigrams; lower values include more random variety. If no weaknesses are recorded yet, pages are fully random.";

  const [state, dispatch] = useReducer(typingReducer, {
    words: [], currentWordIdx: 0, currentCharIdx: 0, typed: [], keystrokes: [], mode: "TEXT", exercise: null, commandBuffer: "", commandStartedAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [sessionStats, setSessionStats] = useState<{ accuracy: number; wpm: number; pagesCompleted: number } | null>(null);
  const [fadeIn, setFadeIn] = useState(true);
  const [lastSubmission, setLastSubmission] = useState<{ correct: boolean; typedCommand: string } | null>(null);
  const [isSettingsVisible, setIsSettingsVisible] = useState(true);
  const [charsPerPage, setCharsPerPage] = useState(initialCharsPerPage);
  const [targetedPracticeRatio, setTargetedPracticeRatio] = useState(initialTargetedPracticeRatio);
  const [mode, setMode] = useState<"TEXT" | "KEYMAP">(initialMode);
  const [selectedList, setSelectedList] = useState<string>(activeListId ?? "");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [savedSettings, setSavedSettings] = useState({
    charsPerPage: initialCharsPerPage,
    targetedPracticeRatio: initialTargetedPracticeRatio,
    mode: initialMode,
    selectedList: activeListId ?? "",
  });
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isPageComplete = state.mode === "TEXT" && state.words.length > 0 && state.currentWordIdx >= state.words.length;
  const hasSettingChanges = useMemo(
    () =>
      charsPerPage !== savedSettings.charsPerPage ||
      targetedPracticeRatio !== savedSettings.targetedPracticeRatio ||
      mode !== savedSettings.mode ||
      selectedList !== savedSettings.selectedList,
    [charsPerPage, targetedPracticeRatio, mode, selectedList, savedSettings]
  );

  const triggerTypingActivity = useCallback(() => {
    setIsSettingsVisible(false);
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    inactivityTimeoutRef.current = setTimeout(() => {
      setIsSettingsVisible(true);
    }, 2000);
  }, []);

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

  const handleSaveSettings = useCallback(async () => {
    setIsSavingSettings(true);
    setSettingsMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          charsPerPage,
          targetedPracticeRatio,
          mode,
          activeListId: selectedList || null,
        }),
      });

      if (res.ok) {
        setSavedSettings({ charsPerPage, targetedPracticeRatio, mode, selectedList });
        setSettingsMessage("Settings saved");
        await fetchNextPage();
      } else {
        const data = await res.json();
        setSettingsMessage(data.error || "Failed to save");
      }
    } catch {
      setSettingsMessage("Something went wrong");
    } finally {
      setIsSavingSettings(false);
    }
  }, [charsPerPage, targetedPracticeRatio, mode, selectedList, fetchNextPage]);

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
      triggerTypingActivity();

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
  }, [isLoading, isPageTransitioning, state.mode, state.currentWordIdx, state.words.length, state.typed, state.commandBuffer, submitKeymap, triggerTypingActivity]);

  useEffect(() => {
    containerRef.current?.focus();
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto outline-none" tabIndex={0}>
      {sessionStats && (
        <div className="flex gap-6 mb-6 text-sm text-zinc-400">
          <span>WPM: <span className="text-emerald-400 font-medium">{sessionStats.wpm ?? "—"}</span></span>
          <span>Accuracy: <span className="text-emerald-400 font-medium">{sessionStats.accuracy?.toFixed(1) ?? "—"}%</span></span>
          <span>Pages: <span className="text-emerald-400 font-medium">{sessionStats.pagesCompleted}</span></span>
        </div>
      )}

      <div className={`overflow-hidden transition-all duration-200 ${isSettingsVisible ? "max-h-[400px] opacity-100 mb-5" : "max-h-0 opacity-0 mb-0"}`}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">Quick settings</h2>
            <Link href="/settings" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Open full settings</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm text-zinc-300">
              <span className="mb-1 block">Practice mode</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "TEXT" | "KEYMAP")}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="TEXT">Text typing</option>
                <option value="KEYMAP">Keymap drills</option>
              </select>
            </label>
            <label className="text-sm text-zinc-300">
              <span className="mb-1 block">Active word list</span>
              <select
                value={selectedList}
                onChange={(e) => setSelectedList(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Default English (5k words)</option>
                {wordLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-zinc-300">
              <span className="mb-1 block">Characters per page: {charsPerPage}</span>
              <input
                type="range"
                min={50}
                max={500}
                step={10}
                value={charsPerPage}
                onChange={(e) => setCharsPerPage(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </label>
            <label className="text-sm text-zinc-300">
              <span className="mb-1 block">
                Targeted practice: {targetedPracticeRatio}%{" "}
                <span
                  title={targetedPracticeTooltip}
                  aria-label="Targeted practice help"
                  className="cursor-help text-zinc-500"
                >
                  (?)
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={targetedPracticeRatio}
                onChange={(e) => setTargetedPracticeRatio(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSavingSettings || !hasSettingChanges}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-700"
            >
              {isSavingSettings ? "Saving..." : "Save"}
            </button>
            {settingsMessage && <span className="text-sm text-zinc-400">{settingsMessage}</span>}
          </div>
        </div>
      </div>

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
        {state.mode === "KEYMAP" ? "Type command and press Enter (or Space) • Backspace to correct" : "Start typing to begin • Space to advance • Backspace to correct"}
      </p>
    </div>
  );
}
