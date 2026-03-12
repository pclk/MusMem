import { KeymapExercise, vimBasicExercises } from "@/lib/keymaps/vim-basic";

export function selectKeymapExerciseFromPool(
  exercises: KeymapExercise[],
  lastExerciseId?: string | null
): KeymapExercise {
  if (exercises.length === 0) {
    throw new Error("Exercise pool cannot be empty");
  }

  const pool = exercises.length > 1
    ? exercises.filter((exercise) => exercise.id !== lastExerciseId)
    : exercises;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function selectKeymapExercise(lastExerciseId?: string | null): KeymapExercise {
  return selectKeymapExerciseFromPool(vimBasicExercises, lastExerciseId);
}

export function fillKeymapExerciseQueue(
  existingQueue: KeymapExercise[],
  desiredSize: number,
  previousExerciseId?: string | null,
  exercisePool: KeymapExercise[] = vimBasicExercises
): KeymapExercise[] {
  const nextQueue = existingQueue.slice(0, desiredSize);
  let lastExerciseId = nextQueue[nextQueue.length - 1]?.id ?? previousExerciseId ?? null;

  while (nextQueue.length < desiredSize) {
    const exercise = selectKeymapExerciseFromPool(exercisePool, lastExerciseId);
    nextQueue.push(exercise);
    lastExerciseId = exercise.id;
  }

  return nextQueue;
}
