export interface KeymapExercise {
  id: string;
  prompt: string;
  acceptedInputs: string[];
  tags?: string[];
  difficulty?: "easy" | "medium" | "hard";
  lesson?: string;
}

export const vimBasicExercises: KeymapExercise[] = [
  {
    id: "vim-ciw",
    prompt: "change inside word",
    acceptedInputs: ["ciw"],
    tags: ["change", "text-object"],
    difficulty: "easy",
    lesson: "text-objects",
  },
  {
    id: "vim-diw",
    prompt: "delete inside word",
    acceptedInputs: ["diw"],
    tags: ["delete", "text-object"],
    difficulty: "easy",
    lesson: "text-objects",
  },
  {
    id: "vim-yy",
    prompt: "yank current line",
    acceptedInputs: ["yy"],
    tags: ["yank", "line"],
    difficulty: "easy",
    lesson: "line-ops",
  },
  {
    id: "vim-dd",
    prompt: "delete current line",
    acceptedInputs: ["dd"],
    tags: ["delete", "line"],
    difficulty: "easy",
    lesson: "line-ops",
  },
  {
    id: "vim-gg",
    prompt: "go to first line",
    acceptedInputs: ["gg"],
    tags: ["navigation"],
    difficulty: "easy",
    lesson: "movement",
  },
  {
    id: "vim-G",
    prompt: "go to last line",
    acceptedInputs: ["G"],
    tags: ["navigation"],
    difficulty: "easy",
    lesson: "movement",
  },
];
