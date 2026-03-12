"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import WordDisplay from "./WordDisplay";
import KeymapDisplay from "./KeymapDisplay";
import BigramInsights from "./BigramInsights";
import HelpTooltip from "@/components/ui/HelpTooltip";
import { PracticeMode } from "@/lib/schemas/mode";
import { KeymapExercise, vimBasicExercises } from "@/lib/keymaps/vim-basic";
import { fillKeymapExerciseQueue } from "@/lib/keymaps/select-exercise";
import {
  appendRecentBigramResults,
  BigramStatRow,
  GuestBigramStatRow,
  MAX_BIGRAM_WINDOW_SIZE,
  normalizeGuestBigramStats,
} from "@/lib/bigram-insights";
import englishWords from "@/lib/words/english-5k.json";
import { generatePage } from "@/lib/algorithm/page-generator";
import {
  extractBigramResults,
  aggregateBigramResults,
  groupBigramResults,
} from "@/lib/algorithm/bigram";
import {
  calculateAccuracy,
  calculateRollingKeymapStats,
  calculateWpm,
  RollingKeymapAttempt,
} from "@/lib/utils";
import {
  formatKeymapCommandFromEvent,
  getActiveModifiersFromEvent,
} from "@/lib/keymaps/commands";

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
  initialBigramWindowSize: number;
  initialMode: "TEXT" | "KEYMAP";
  activeListId: string | null;
  keymapListId: string | null;
  wordLists: { id: string; name: string }[];
  keymapLists: { id: string; name: string }[];
  isGuest?: boolean;
}

type TypingAction =
  | { type: "SET_TEXT_PAGE"; words: string[] }
  | { type: "SET_KEYMAP_PAGE"; exercise: KeymapExercise; startedAt: number }
  | { type: "TYPE_CHAR"; char: string; timestamp: number; correct?: boolean }
  | { type: "BACKSPACE" }
  | { type: "NEXT_WORD"; timestamp: number }
  | { type: "RESET_COMMAND" };

function typingReducer(state: TypingState, action: TypingAction): TypingState {
  switch (action.type) {
    case "SET_TEXT_PAGE":
      return { ...state, mode: "TEXT", words: action.words, currentWordIdx: 0, currentCharIdx: 0, typed: [], keystrokes: [], exercise: null, commandBuffer: "", commandStartedAt: null };
    case "SET_KEYMAP_PAGE":
      return { ...state, mode: "KEYMAP", words: [], currentWordIdx: 0, currentCharIdx: 0, typed: [], keystrokes: [], exercise: action.exercise, commandBuffer: "", commandStartedAt: action.startedAt };
    case "TYPE_CHAR": {
      const { char, timestamp } = action;
      if (state.mode === "KEYMAP") {
        return {
          ...state,
          commandBuffer: state.commandBuffer + char,
          commandStartedAt: state.commandStartedAt ?? timestamp,
          keystrokes: [...state.keystrokes, { char, timestamp, correct: action.correct ?? true }],
        };
      }
      const currentWord = state.words[state.currentWordIdx] || "";
      const expectedChar = currentWord[state.currentCharIdx] || "";
      const correct = char === expectedChar;
      const newTyped = [...state.typed];
      if (!newTyped[state.currentWordIdx]) newTyped[state.currentWordIdx] = "";
      newTyped[state.currentWordIdx] += char;
      const isFinalWord = state.currentWordIdx === state.words.length - 1;
      const isFinalChar = state.currentCharIdx === currentWord.length - 1;

      if (isFinalWord && isFinalChar) {
        return {
          ...state,
          currentWordIdx: state.words.length,
          currentCharIdx: 0,
          typed: newTyped,
          keystrokes: [...state.keystrokes, { char, timestamp, correct }],
        };
      }

      return { ...state, currentCharIdx: state.currentCharIdx + 1, typed: newTyped, keystrokes: [...state.keystrokes, { char, timestamp, correct }] };
    }
    case "BACKSPACE": {
      if (state.mode === "KEYMAP") {
        if (!state.commandBuffer.length) return state;
        return { ...state, commandBuffer: state.commandBuffer.slice(0, -1) };
      }
      if (state.currentCharIdx === 0) {
        if (state.currentWordIdx === 0) return state;

        const previousWordIdx = state.currentWordIdx - 1;
        const newTyped = [...state.typed];
        const previousTyped = newTyped[previousWordIdx] || "";

        if (!previousTyped.length) {
          return {
            ...state,
            currentWordIdx: previousWordIdx,
            currentCharIdx: 0,
          };
        }

        newTyped[previousWordIdx] = previousTyped.slice(0, -1);
        return {
          ...state,
          currentWordIdx: previousWordIdx,
          currentCharIdx: newTyped[previousWordIdx].length,
          typed: newTyped,
        };
      }
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

const GUEST_SETTINGS_KEY = "guest-settings";
const GUEST_BIGRAMS_KEY = "guest-bigram-stats";
const GUEST_KEYMAP_KEY = "guest-keymap-stats";
const GUEST_SUMMARY_KEY = "guest-summary-stats";
const KEYMAP_PREVIEW_COUNT = 3;
const KEYMAP_QUEUE_SIZE = KEYMAP_PREVIEW_COUNT + 1;
const KEYMAP_METRICS_WINDOW = 10;
const TEXT_SETTINGS_REVEAL_DELAY_MS = 2000;
const KEYMAP_SETTINGS_REVEAL_DELAY_MS = 10000;

export default function TypingEngine({
  initialCharsPerPage,
  initialTargetedPracticeRatio,
  initialBigramWindowSize,
  initialMode,
  activeListId,
  wordLists,
  keymapListId,
  keymapLists,
  isGuest = false,
}: TypingEngineProps) {
  const targetedPracticeTooltip =
    "Controls how much of each page focuses on your weak patterns. Higher values include more words that match your weak bigrams; lower values include more random variety. If no weaknesses are recorded yet, pages are fully random.";

  const [state, dispatch] = useReducer(typingReducer, {
    words: [], currentWordIdx: 0, currentCharIdx: 0, typed: [], keystrokes: [], mode: "TEXT", exercise: null, commandBuffer: "", commandStartedAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [sessionStats, setSessionStats] = useState<{ accuracy: number; wpm: number | null; kpm: number | null; pagesCompleted: number } | null>(null);
  const [fadeIn, setFadeIn] = useState(true);
  const [lastSubmission, setLastSubmission] = useState<{ correct: boolean; typedCommand: string; displayTypedCommand?: string; expectedInput?: string } | null>(null);
  const [isSettingsVisible, setIsSettingsVisible] = useState(true);
  const [charsPerPage, setCharsPerPage] = useState(initialCharsPerPage);
  const [targetedPracticeRatio, setTargetedPracticeRatio] = useState(initialTargetedPracticeRatio);
  const [bigramWindowSize, setBigramWindowSize] = useState(initialBigramWindowSize);
  const [mode, setMode] = useState<"TEXT" | "KEYMAP">(initialMode);
  const [selectedList, setSelectedList] = useState<string>(activeListId ?? "");
  const [selectedKeymapList, setSelectedKeymapList] = useState<string>(keymapListId ?? "");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("Changes apply automatically");
  const [bigramStats, setBigramStats] = useState<BigramStatRow[]>([]);
  const [isBigramStatsLoading, setIsBigramStatsLoading] = useState(true);
  const [isResettingBigrams, setIsResettingBigrams] = useState(false);
  const [savedSettings, setSavedSettings] = useState({
    charsPerPage: initialCharsPerPage,
    targetedPracticeRatio: initialTargetedPracticeRatio,
    bigramWindowSize: initialBigramWindowSize,
    mode: initialMode,
    selectedList: activeListId ?? "",
    selectedKeymapList: keymapListId ?? "",
  });
  const [keymapQueue, setKeymapQueue] = useState<KeymapExercise[]>([]);
  const keymapQueueRef = useRef<KeymapExercise[]>([]);
  const keymapPoolRef = useRef<KeymapExercise[]>([]);
  const currentKeymapExerciseIdRef = useRef<string | null>(null);
  const recentKeymapAttemptsRef = useRef<RollingKeymapAttempt[]>([]);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const typingInputRef = useRef<HTMLInputElement>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileTypingFocused, setIsMobileTypingFocused] = useState(false);
  const [activeModifiers, setActiveModifiers] = useState<string[]>([]);
  const isPageComplete = state.mode === "TEXT" && state.words.length > 0 && state.currentWordIdx >= state.words.length;
  const isTextMode = mode === "TEXT";
  const isKeymapMode = mode === "KEYMAP";

  useEffect(() => {
    keymapQueueRef.current = keymapQueue;
  }, [keymapQueue]);

  useEffect(() => {
    currentKeymapExerciseIdRef.current = state.exercise?.id ?? null;
  }, [state.exercise]);

  useEffect(() => {
    if (mode === "KEYMAP") {
      recentKeymapAttemptsRef.current = [];
      keymapQueueRef.current = [];
      keymapPoolRef.current = [];
      currentKeymapExerciseIdRef.current = null;
      setKeymapQueue([]);
    }
    setActiveModifiers([]);
  }, [mode, selectedKeymapList]);

  useEffect(() => {
    if (!isGuest) return;
    const rawSettings = localStorage.getItem(GUEST_SETTINGS_KEY);
    if (!rawSettings) return;
    try {
      const parsed = JSON.parse(rawSettings) as {
        charsPerPage?: number;
        targetedPracticeRatio?: number;
        bigramWindowSize?: number;
        mode?: "TEXT" | "KEYMAP";
        keymapListId?: string;
      };
      const nextCharsPerPage = parsed.charsPerPage ?? initialCharsPerPage;
      const nextTargetedRatio = parsed.targetedPracticeRatio ?? initialTargetedPracticeRatio;
      const nextBigramWindowSize = parsed.bigramWindowSize ?? initialBigramWindowSize;
      const nextMode = parsed.mode ?? initialMode;
      const nextKeymapListId = parsed.keymapListId ?? keymapListId ?? "";
      setCharsPerPage(nextCharsPerPage);
      setTargetedPracticeRatio(nextTargetedRatio);
      setBigramWindowSize(nextBigramWindowSize);
      setMode(nextMode);
      setSelectedKeymapList(nextKeymapListId);
      setSavedSettings((current) => ({
        ...current,
        charsPerPage: nextCharsPerPage,
        targetedPracticeRatio: nextTargetedRatio,
        bigramWindowSize: nextBigramWindowSize,
        mode: nextMode,
        selectedKeymapList: nextKeymapListId,
      }));
    } catch {
      localStorage.removeItem(GUEST_SETTINGS_KEY);
    }
  }, [isGuest, initialCharsPerPage, initialTargetedPracticeRatio, initialBigramWindowSize, initialMode, keymapListId]);

  const getGuestMostRecentKeymapId = useCallback(() => {
    const rawKeymapStats = localStorage.getItem(GUEST_KEYMAP_KEY);
    const keymapStats = rawKeymapStats
      ? (JSON.parse(rawKeymapStats) as Record<string, { attempts: number; errors: number; lastSeen: number }>)
      : {};
    const sorted = Object.entries(keymapStats).sort((a, b) => b[1].lastSeen - a[1].lastSeen);
    return sorted[0]?.[0] ?? null;
  }, []);

  const recordKeymapAttempt = useCallback((attempt: RollingKeymapAttempt) => {
    const nextAttempts = [...recentKeymapAttemptsRef.current, attempt].slice(-KEYMAP_METRICS_WINDOW);
    recentKeymapAttemptsRef.current = nextAttempts;
    return calculateRollingKeymapStats(nextAttempts, KEYMAP_METRICS_WINDOW);
  }, []);

  const triggerTypingActivity = useCallback(() => {
    setIsSettingsVisible(false);
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    inactivityTimeoutRef.current = setTimeout(() => {
      setIsSettingsVisible(true);
    }, state.mode === "KEYMAP" ? KEYMAP_SETTINGS_REVEAL_DELAY_MS : TEXT_SETTINGS_REVEAL_DELAY_MS);
  }, [state.mode]);

  const loadBigramStats = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsBigramStatsLoading(true);
    }

    try {
      if (isGuest) {
        const rawBigramStats = localStorage.getItem(GUEST_BIGRAMS_KEY);
        const parsed = rawBigramStats
          ? (JSON.parse(rawBigramStats) as Record<string, GuestBigramStatRow>)
          : {};
        setBigramStats(normalizeGuestBigramStats(parsed, bigramWindowSize));
        return;
      }

      const res = await fetch(
        `/api/stats/bigrams?bigramWindowSize=${bigramWindowSize}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        throw new Error("Failed to fetch bigram stats");
      }

      const data = await res.json();
      setBigramStats((data.bigrams ?? []) as BigramStatRow[]);
    } catch (error) {
      console.error("Failed to load bigram stats:", error);
      setBigramStats([]);
    } finally {
      if (!options?.silent) {
        setIsBigramStatsLoading(false);
      }
    }
  }, [bigramWindowSize, isGuest]);

  const fetchNextPage = useCallback(async () => {
    setIsLoading(true);
    setFadeIn(false);
    try {
      if (mode === "KEYMAP") {
        let nextQueue: KeymapExercise[] = [];
        const existingQueue = keymapQueueRef.current;
        const currentExerciseId = currentKeymapExerciseIdRef.current;

        if (existingQueue.length > 1) {
          nextQueue = fillKeymapExerciseQueue(
            existingQueue.slice(1),
            KEYMAP_QUEUE_SIZE,
            existingQueue[0]?.id ?? currentExerciseId ?? null,
            keymapPoolRef.current.length > 0 ? keymapPoolRef.current : existingQueue
          );
        } else if (isGuest) {
          nextQueue = fillKeymapExerciseQueue(
            [],
            KEYMAP_QUEUE_SIZE,
            existingQueue[0]?.id ?? currentExerciseId ?? getGuestMostRecentKeymapId()
          );
        } else {
          const params = new URLSearchParams({
            mode,
            charsPerPage: String(charsPerPage),
            targetedPracticeRatio: String(targetedPracticeRatio),
            bigramWindowSize: String(bigramWindowSize),
            activeListId: selectedList,
            keymapListId: selectedKeymapList,
          });
          const res = await fetch(`/api/pages/next?${params.toString()}`, { cache: "no-store" });
          if (!res.ok) throw new Error("Failed to fetch page");
          const data = await res.json();
          const seedExercise = (data.exercise ?? vimBasicExercises[0]) as KeymapExercise;
          const fetchedPool = Array.isArray(data.exercisePool)
            ? (data.exercisePool as KeymapExercise[])
            : [seedExercise];
          keymapPoolRef.current = fetchedPool.length > 0 ? fetchedPool : [seedExercise];
          nextQueue = fillKeymapExerciseQueue(
            [seedExercise],
            KEYMAP_QUEUE_SIZE,
            seedExercise.id,
            keymapPoolRef.current
          );
        }

        setKeymapQueue(nextQueue);
        keymapQueueRef.current = nextQueue;
        if (nextQueue[0]) {
          currentKeymapExerciseIdRef.current = nextQueue[0].id;
          dispatch({ type: "SET_KEYMAP_PAGE", exercise: nextQueue[0], startedAt: Date.now() });
        }
      } else if (isGuest) {
          const rawBigramStats = localStorage.getItem(GUEST_BIGRAMS_KEY);
          const bigramStats = rawBigramStats
            ? (JSON.parse(rawBigramStats) as Record<string, GuestBigramStatRow>)
            : {};
          const now = Date.now();
          const dayMs = 24 * 60 * 60 * 1000;
          const weakBigrams = normalizeGuestBigramStats(
            bigramStats,
            bigramWindowSize
          )
            .filter((stat) => stat.errorRate > 0)
            .map((stat) => {
              const lastSeen =
                typeof stat.lastSeen === "number"
                  ? stat.lastSeen
                  : new Date(stat.lastSeen ?? Date.now()).getTime();
              const hoursSinceLastSeen = (now - lastSeen) / dayMs;
              const decayBoost = hoursSinceLastSeen > 1 ? (0.2 * Math.min(hoursSinceLastSeen, 7)) / 7 : 0;
              return {
                bigram: stat.bigram,
                errorRate: Math.min(stat.errorRate + decayBoost, 1),
              };
            })
            .sort((a, b) => b.errorRate - a.errorRate)
            .slice(0, 20);

          const text = generatePage({
            words: englishWords as string[],
            weakBigrams,
            charsPerPage,
            targetedPracticeRatio,
          });
          dispatch({ type: "SET_TEXT_PAGE", words: text.split(" ").filter((w) => w.length > 0) });
      } else {
        const params = new URLSearchParams({
          mode,
          charsPerPage: String(charsPerPage),
          targetedPracticeRatio: String(targetedPracticeRatio),
          bigramWindowSize: String(bigramWindowSize),
          activeListId: selectedList,
          keymapListId: selectedKeymapList,
        });

        const res = await fetch(`/api/pages/next?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch page");
        const data = await res.json();
        const words = data.text.split(" ").filter((w: string) => w.length > 0);
        dispatch({ type: "SET_TEXT_PAGE", words });
      }
      setTimeout(() => setFadeIn(true), 50);
    } catch (error) {
      console.error("Failed to fetch page:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    bigramWindowSize,
    charsPerPage,
    getGuestMostRecentKeymapId,
    isGuest,
    mode,
    selectedList,
    selectedKeymapList,
    targetedPracticeRatio,
  ]);

  const submitTextPage = useCallback(async () => {
    const targetText = state.words.join(" ");
    const typedText = state.typed.join(" ");
    setIsPageTransitioning(true);
    try {
      if (isGuest) {
        const results = extractBigramResults(targetText, typedText);
        const aggregated = aggregateBigramResults(results);
        const grouped = groupBigramResults(results);
        const rawStored = localStorage.getItem(GUEST_BIGRAMS_KEY);
        const stored = rawStored
          ? (JSON.parse(rawStored) as Record<string, GuestBigramStatRow>)
          : {};
        aggregated.forEach((entry, bigram) => {
          const current = stored[bigram] ?? { attempts: 0, errors: 0, lastSeen: Date.now(), recentResults: [] };
          stored[bigram] = {
            attempts: current.attempts + entry.attempts,
            errors: current.errors + entry.errors,
            lastSeen: Date.now(),
            recentResults: appendRecentBigramResults(
              current.recentResults,
              grouped.get(bigram) ?? [],
              current.attempts,
              current.errors,
              MAX_BIGRAM_WINDOW_SIZE
            ),
          };
        });
        localStorage.setItem(GUEST_BIGRAMS_KEY, JSON.stringify(stored));

        const correctChars = state.keystrokes.filter((k) => k.correct).length;
        const accuracyAttemptCount = state.keystrokes.length;
        const scoredChars = targetText.length;
        const accuracy = calculateAccuracy(correctChars, accuracyAttemptCount);

        let wpm = 0;
        if (state.keystrokes.length >= 2) {
          const duration = state.keystrokes[state.keystrokes.length - 1].timestamp - state.keystrokes[0].timestamp;
          wpm = calculateWpm(scoredChars, duration);
        }

        const rawSummary = localStorage.getItem(GUEST_SUMMARY_KEY);
        const summary = rawSummary
          ? (JSON.parse(rawSummary) as { pagesCompleted: number; charsTyped: number })
          : { pagesCompleted: 0, charsTyped: 0 };
        const nextSummary = {
          pagesCompleted: summary.pagesCompleted + 1,
          charsTyped: summary.charsTyped + scoredChars,
        };
        localStorage.setItem(GUEST_SUMMARY_KEY, JSON.stringify(nextSummary));

        setSessionStats({ accuracy, wpm, kpm: null, pagesCompleted: nextSummary.pagesCompleted });
      } else {
        const res = await fetch("/api/pages/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "TEXT", targetText, typedText, keystrokeTimings: state.keystrokes }),
        });
        if (res.ok) {
          const data = await res.json();
          setSessionStats({ accuracy: data.accuracy, wpm: data.wpm, kpm: data.kpm ?? null, pagesCompleted: data.pagesCompleted });
        }
      }
    } catch (error) {
      console.error("Failed to submit page:", error);
    }
    await loadBigramStats({ silent: true });
    await fetchNextPage();
    setIsPageTransitioning(false);
  }, [state.words, state.typed, state.keystrokes, fetchNextPage, isGuest, loadBigramStats]);

  const submitKeymap = useCallback(async (options?: { typedCommand?: string; correct?: boolean; displayTypedCommand?: string; expectedInput?: string }) => {
    if (!state.exercise) return;
    const typedCommand = options?.typedCommand ?? state.commandBuffer;
    const correct = options?.correct ?? state.exercise.acceptedInputs.includes(typedCommand);
    const endedAt = Date.now();
    const latencyMs = state.commandStartedAt ? Math.max(0, endedAt - state.commandStartedAt) : 0;
    setLastSubmission({
      correct,
      typedCommand,
      displayTypedCommand: options?.displayTypedCommand,
      expectedInput: options?.expectedInput,
    });
    try {
      const rollingStats = recordKeymapAttempt({ correct, latencyMs });
      if (isGuest) {
        const rawStored = localStorage.getItem(GUEST_KEYMAP_KEY);
        const stored = rawStored ? (JSON.parse(rawStored) as Record<string, { attempts: number; errors: number; lastSeen: number }>) : {};
        const current = stored[state.exercise.id] ?? { attempts: 0, errors: 0, lastSeen: Date.now() };
        stored[state.exercise.id] = {
          attempts: current.attempts + 1,
          errors: current.errors + (correct ? 0 : 1),
          lastSeen: Date.now(),
        };
        localStorage.setItem(GUEST_KEYMAP_KEY, JSON.stringify(stored));

        const rawSummary = localStorage.getItem(GUEST_SUMMARY_KEY);
        const summary = rawSummary
          ? (JSON.parse(rawSummary) as { pagesCompleted: number; charsTyped: number })
          : { pagesCompleted: 0, charsTyped: 0 };
        const nextSummary = {
          pagesCompleted: summary.pagesCompleted + 1,
          charsTyped: summary.charsTyped + totalChars,
        };
        localStorage.setItem(GUEST_SUMMARY_KEY, JSON.stringify(nextSummary));

        setSessionStats({
          accuracy: rollingStats.accuracy ?? 100,
          wpm: null,
          kpm: rollingStats.kpm,
          pagesCompleted: nextSummary.pagesCompleted,
        });
      } else {
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
          setSessionStats({
            accuracy: rollingStats.accuracy ?? data.accuracy,
            wpm: null,
            kpm: rollingStats.kpm,
            pagesCompleted: data.pagesCompleted,
          });
        }
      }
    } catch (error) {
      console.error("Failed to submit keymap:", error);
    }
    await fetchNextPage();
  }, [state.exercise, state.commandBuffer, state.commandStartedAt, state.keystrokes, fetchNextPage, isGuest, recordKeymapAttempt]);

  const handleResetBigramInsights = useCallback(async () => {
    setIsResettingBigrams(true);
    try {
      if (isGuest) {
        localStorage.removeItem(GUEST_BIGRAMS_KEY);
      } else {
        const res = await fetch("/api/stats/bigrams", {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error("Failed to reset bigram stats");
        }
      }

      setBigramStats([]);
      await loadBigramStats({ silent: true });
      await fetchNextPage();
    } catch (error) {
      console.error("Failed to reset bigram insights:", error);
    } finally {
      setIsResettingBigrams(false);
    }
  }, [fetchNextPage, isGuest, loadBigramStats]);

  useEffect(() => { loadBigramStats(); }, [loadBigramStats]);
  useEffect(() => { fetchNextPage(); }, [fetchNextPage]);
  useEffect(() => { if (isPageComplete) submitTextPage(); }, [isPageComplete, submitTextPage]);

  useEffect(() => {
    const nextSettings = {
      charsPerPage,
      targetedPracticeRatio,
      bigramWindowSize,
      mode,
      selectedList: isGuest ? "" : selectedList,
      selectedKeymapList: isGuest ? "" : selectedKeymapList,
    };

    if (
      nextSettings.charsPerPage === savedSettings.charsPerPage &&
      nextSettings.targetedPracticeRatio === savedSettings.targetedPracticeRatio &&
      nextSettings.bigramWindowSize === savedSettings.bigramWindowSize &&
      nextSettings.mode === savedSettings.mode &&
      nextSettings.selectedList === savedSettings.selectedList &&
      nextSettings.selectedKeymapList === savedSettings.selectedKeymapList
    ) {
      return;
    }

    setIsSavingSettings(true);
    setSettingsMessage(isGuest ? "Applying locally..." : "Saving changes...");

    const timeoutId = window.setTimeout(async () => {
      try {
        if (isGuest) {
          localStorage.setItem(
            GUEST_SETTINGS_KEY,
            JSON.stringify({
              charsPerPage: nextSettings.charsPerPage,
              targetedPracticeRatio: nextSettings.targetedPracticeRatio,
              bigramWindowSize: nextSettings.bigramWindowSize,
              mode: nextSettings.mode,
              keymapListId: nextSettings.selectedKeymapList,
            })
          );
          setSavedSettings(nextSettings);
          setSettingsMessage("Changes apply automatically");
          return;
        }

        if (nextSettings.selectedList.startsWith("project-")) {
          setSavedSettings(nextSettings);
          setSettingsMessage("Project .txt lists apply for this session only");
          return;
        }

        if (nextSettings.selectedKeymapList.startsWith("project-keymap-")) {
          setSavedSettings(nextSettings);
          setSettingsMessage("Project .txt keymap lists apply for this session only");
          return;
        }

        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            charsPerPage: nextSettings.charsPerPage,
            targetedPracticeRatio: nextSettings.targetedPracticeRatio,
            bigramWindowSize: nextSettings.bigramWindowSize,
            mode: nextSettings.mode,
            activeListId: nextSettings.selectedList || null,
            keymapListId: nextSettings.selectedKeymapList || null,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Failed to save" }));
          setSettingsMessage(data.error || "Failed to save");
          return;
        }

        setSavedSettings(nextSettings);
        setSettingsMessage("Changes apply automatically");
      } catch {
        setSettingsMessage("Something went wrong");
      } finally {
        setIsSavingSettings(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [charsPerPage, targetedPracticeRatio, bigramWindowSize, mode, selectedList, selectedKeymapList, savedSettings, isGuest]);

  const handleTypingKeyDown = useCallback((e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean; preventDefault: () => void }) => {
    if (isLoading || isPageTransitioning || isPageComplete) return;

    const timestamp = Date.now();
    triggerTypingActivity();
    setActiveModifiers(getActiveModifiersFromEvent(e));

    if (e.key === "Backspace") {
      e.preventDefault();
      dispatch({ type: "BACKSPACE" });
      return;
    }

    if (state.mode === "KEYMAP") {
      if (!state.exercise) {
        return;
      }

      let formattedKeyCommand: string | null = null;
      try {
        formattedKeyCommand = formatKeymapCommandFromEvent(e);
      } catch {
        formattedKeyCommand = null;
      }
      const isModifiedCommand =
        formattedKeyCommand !== null &&
        (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.key.length > 1);

      if (isModifiedCommand && formattedKeyCommand) {
        e.preventDefault();
        const expectedInput = state.exercise.acceptedInputs[0] ?? "";
        const correct = state.exercise.acceptedInputs.includes(formattedKeyCommand);
        dispatch({ type: "TYPE_CHAR", char: formattedKeyCommand, timestamp, correct });
        submitKeymap({
          typedCommand: formattedKeyCommand,
          correct,
          displayTypedCommand: formattedKeyCommand,
          expectedInput,
        });
        dispatch({ type: "RESET_COMMAND" });
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        const typedCommand = `${state.commandBuffer}${e.key}`;
        const acceptedInputs = state.exercise.acceptedInputs;
        const expectedInput = acceptedInputs[0] ?? "";

        if (acceptedInputs.includes(typedCommand)) {
          dispatch({ type: "TYPE_CHAR", char: e.key, timestamp, correct: true });
          submitKeymap({ typedCommand, correct: true, expectedInput });
          dispatch({ type: "RESET_COMMAND" });
          return;
        }

        if (acceptedInputs.some((input) => input.startsWith(typedCommand))) {
          dispatch({ type: "TYPE_CHAR", char: e.key, timestamp, correct: true });
          return;
        }

        const displayTypedCommand = expectedInput
          ? typedCommand.padEnd(expectedInput.length, "_")
          : typedCommand;
        dispatch({ type: "TYPE_CHAR", char: e.key, timestamp, correct: false });
        submitKeymap({ typedCommand, correct: false, displayTypedCommand, expectedInput });
        dispatch({ type: "RESET_COMMAND" });
      }
      return;
    }

    if (e.key === " ") {
      e.preventDefault();
      const currentWord = state.words[state.currentWordIdx] || "";
      if (state.currentCharIdx >= currentWord.length && state.currentWordIdx < state.words.length) {
        dispatch({ type: "NEXT_WORD", timestamp });
      } else {
        dispatch({ type: "TYPE_CHAR", char: e.key, timestamp });
      }
      return;
    }

    if (e.key.length === 1) {
      e.preventDefault();
      dispatch({ type: "TYPE_CHAR", char: e.key, timestamp });
    }
  }, [isLoading, isPageTransitioning, isPageComplete, state.mode, state.currentCharIdx, state.currentWordIdx, state.words, state.commandBuffer, state.exercise, submitKeymap, triggerTypingActivity]);

  const handleTypingKeyUp = useCallback((e: { ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }) => {
    setActiveModifiers(getActiveModifiersFromEvent(e));
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px) and (pointer: coarse)");
    const updateViewportMode = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    updateViewportMode();
    mediaQuery.addEventListener("change", updateViewportMode);
    return () => mediaQuery.removeEventListener("change", updateViewportMode);
  }, []);

  useEffect(() => {
    if (isMobileViewport) return;

    const handleDocumentKeyDown = (e: KeyboardEvent) => handleTypingKeyDown(e);
    const handleDocumentKeyUp = (e: KeyboardEvent) => handleTypingKeyUp(e);
    document.addEventListener("keydown", handleDocumentKeyDown);
    document.addEventListener("keyup", handleDocumentKeyUp);
    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown);
      document.removeEventListener("keyup", handleDocumentKeyUp);
    };
  }, [isMobileViewport, handleTypingKeyDown, handleTypingKeyUp]);

  useEffect(() => {
    if (!isMobileViewport) {
      containerRef.current?.focus();
      setIsMobileTypingFocused(false);
      setActiveModifiers([]);
      return;
    }

    if (isMobileTypingFocused) {
      typingInputRef.current?.focus();
      return;
    }

    typingInputRef.current?.blur();
  }, [isMobileViewport, isMobileTypingFocused]);

  useEffect(() => {
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto outline-none" tabIndex={0}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {sessionStats ? (
          <div className="flex flex-wrap gap-6 text-sm text-zinc-400">
            {isKeymapMode ? (
              <span>KPM (last 10): <span className="text-emerald-400 font-medium">{sessionStats.kpm?.toFixed(1) ?? "—"}</span></span>
            ) : (
              <span>WPM: <span className="text-emerald-400 font-medium">{sessionStats.wpm ?? "—"}</span></span>
            )}
            <span>{isKeymapMode ? "Accuracy (last 10)" : "Accuracy"}: <span className="text-emerald-400 font-medium">{sessionStats.accuracy?.toFixed(1) ?? "—"}%</span></span>
            <span>{isKeymapMode ? "Drills" : "Pages"}: <span className="text-emerald-400 font-medium">{sessionStats.pagesCompleted}</span></span>
          </div>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={() => setIsSettingsVisible((current) => !current)}
          className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
        >
          {isSettingsVisible ? "Hide Settings" : "Show Settings"}
        </button>
      </div>

      <div className={`overflow-hidden transition-all duration-300 ${isSettingsVisible ? "max-h-[1600px] opacity-100 mb-5" : "max-h-0 opacity-0 mb-0"}`}>
        <div className="space-y-3">
          <BigramInsights
            stats={bigramStats}
            isLoading={isBigramStatsLoading}
            isResetting={isResettingBigrams}
            mode={mode}
            onReset={handleResetBigramInsights}
          />
          <div className="rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_40%),rgba(24,24,27,0.58)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Session control</p>
                <h2 className="mt-2 text-sm font-semibold text-zinc-100">Quick settings</h2>
              </div>
              {isGuest ? (
                <span className="text-xs text-zinc-500">Guest mode (local only)</span>
              ) : (
                <Link href="/settings" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Open full settings</Link>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm text-zinc-300">
                <span className="mb-1 block">Practice mode</span>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "TEXT" | "KEYMAP")}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="TEXT">Text typing</option>
                  <option value="KEYMAP">Keymap drills</option>
                </select>
              </label>
              {!isGuest && isTextMode && (
                <label className="text-sm text-zinc-300">
                  <span className="mb-1 block">Typing word list</span>
                  <select
                    value={selectedList}
                    onChange={(e) => setSelectedList(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Default English (5k words)</option>
                    {wordLists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!isGuest && isKeymapMode && (
                <label className="text-sm text-zinc-300">
                  <span className="mb-1 block">Keymap list</span>
                  <select
                    value={selectedKeymapList}
                    onChange={(e) => setSelectedKeymapList(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Default keymap drills</option>
                    {keymapLists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {isTextMode && (
                <label className="rounded-2xl border border-white/6 bg-black/15 p-4 text-sm text-zinc-300">
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
              )}
              {isTextMode && (
                <label className="rounded-2xl border border-white/6 bg-black/15 p-4 text-sm text-zinc-300">
                  <span className="mb-1 block">
                    Targeted practice: {targetedPracticeRatio}%{" "}
                    <HelpTooltip
                      content={targetedPracticeTooltip}
                      label="Targeted practice help"
                    />
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
              )}
              {isTextMode && (
                <label className="rounded-2xl border border-white/6 bg-black/15 p-4 text-sm text-zinc-300">
                  <span className="mb-1 block">Rolling weakness window: last {bigramWindowSize} attempts</span>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={bigramWindowSize}
                    onChange={(e) => setBigramWindowSize(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </label>
              )}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-zinc-400">
                {isSavingSettings ? "Saving..." : settingsMessage}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={`min-h-[200px] p-8 rounded-xl border border-zinc-800 bg-zinc-900/50 transition-opacity duration-150 ${fadeIn ? "opacity-100" : "opacity-0"}`}>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-zinc-400 animate-pulse text-xl text-center">{isPageTransitioning ? "Page complete! Loading next page..." : "Loading..."}</div>
          </div>
        ) : state.mode === "KEYMAP" && state.exercise ? (
          <button
            type="button"
            onClick={() => {
              if (!isMobileViewport) return;
              setIsMobileTypingFocused(true);
              typingInputRef.current?.focus();
            }}
            className={`w-full text-left ${isMobileViewport ? "cursor-text" : "cursor-default"}`}
          >
            <KeymapDisplay
              prompt={state.exercise.prompt}
              typedCommand={state.commandBuffer}
              acceptedInputs={state.exercise.acceptedInputs}
              upcomingPrompts={keymapQueue.slice(1, KEYMAP_QUEUE_SIZE).map((exercise) => exercise.prompt)}
              activeModifiers={activeModifiers}
              lastSubmission={lastSubmission}
              isFocused={!isMobileViewport || isMobileTypingFocused}
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!isMobileViewport) return;
              setIsMobileTypingFocused(true);
              typingInputRef.current?.focus();
            }}
            className={`w-full text-left ${isMobileViewport ? "cursor-text" : "cursor-default"}`}
          >
            <WordDisplay
              words={state.words}
              currentWordIdx={state.currentWordIdx}
              currentCharIdx={state.currentCharIdx}
              typed={state.typed}
              showCursor={!isMobileViewport || isMobileTypingFocused}
            />
          </button>
        )}
      </div>

      {isMobileViewport && (
        <div className="mt-3">
          <input
            id="typing-input"
            ref={typingInputRef}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="done"
            aria-label="Hidden typing input"
            onKeyDown={handleTypingKeyDown}
            onKeyUp={handleTypingKeyUp}
            onBlur={() => {
              setIsMobileTypingFocused(false);
              setActiveModifiers([]);
            }}
            onFocus={() => setIsMobileTypingFocused(true)}
            onChange={() => undefined}
            className="pointer-events-none absolute h-0 w-0 opacity-0"
          />
          {!isMobileTypingFocused && (
            <p className="text-center text-sm text-zinc-500">Tap to type</p>
          )}
        </div>
      )}

      <p className="mt-4 text-center text-base text-zinc-600">
        {state.mode === "KEYMAP" ? "Type command to match prompt • Backspace to correct" : "Start typing to begin • Space advances only after a finished word • The last character completes the test • Otherwise it counts as an error • Backspace to correct"}
      </p>
    </div>
  );
}
