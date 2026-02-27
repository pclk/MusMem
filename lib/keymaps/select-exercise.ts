import { KeymapExercise, vimBasicExercises } from "@/lib/keymaps/vim-basic";

export function selectKeymapExercise(lastExerciseId?: string | null): KeymapExercise {
  const pool = vimBasicExercises.length > 1
    ? vimBasicExercises.filter((exercise) => exercise.id !== lastExerciseId)
    : vimBasicExercises;
  return pool[Math.floor(Math.random() * pool.length)];
}
