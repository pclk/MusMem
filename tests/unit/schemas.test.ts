import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "@/lib/schemas/auth";
import { pageCompleteSchema } from "@/lib/schemas/page";
import { practiceModeSchema } from "@/lib/schemas/mode";
import { updateSettingsSchema } from "@/lib/schemas/settings";
import { createWordListSchema } from "@/lib/schemas/wordlist";

describe("registerSchema", () => {
  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = registerSchema.safeParse({
      name: "",
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid login data", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});


describe("practiceModeSchema", () => {
  it("accepts TEXT and KEYMAP", () => {
    expect(practiceModeSchema.safeParse("TEXT").success).toBe(true);
    expect(practiceModeSchema.safeParse("KEYMAP").success).toBe(true);
  });

  it("rejects invalid mode", () => {
    expect(practiceModeSchema.safeParse("OTHER").success).toBe(false);
  });
});

describe("pageCompleteSchema", () => {
  it("accepts valid page completion data", () => {
    const result = pageCompleteSchema.safeParse({
      mode: "TEXT",
      targetText: "hello world",
      typedText: "hello world",
      keystrokeTimings: [
        { char: "h", timestamp: 1000, correct: true },
        { char: "e", timestamp: 1050, correct: true },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty target text", () => {
    const result = pageCompleteSchema.safeParse({
      mode: "TEXT",
      targetText: "",
      typedText: "hello",
      keystrokeTimings: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts keymap completion payload", () => {
    const result = pageCompleteSchema.safeParse({
      mode: "KEYMAP",
      exerciseId: "vim-ciw",
      prompt: "change inside word",
      typedCommand: "ciw",
      acceptedInputs: ["ciw"],
      correct: true,
      latencyMs: 100,
      keystrokeTimings: [
        { char: "c", timestamp: 1000, correct: true },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("updateSettingsSchema", () => {
  it("accepts valid settings update", () => {
    const result = updateSettingsSchema.safeParse({
      charsPerPage: 200,
      mode: "KEYMAP",
    });
    expect(result.success).toBe(true);
  });

  it("rejects charsPerPage below minimum", () => {
    const result = updateSettingsSchema.safeParse({
      charsPerPage: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects charsPerPage above maximum", () => {
    const result = updateSettingsSchema.safeParse({
      charsPerPage: 1000,
    });
    expect(result.success).toBe(false);
  });

  it("accepts null activeListId", () => {
    const result = updateSettingsSchema.safeParse({
      activeListId: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts targetedPracticeRatio at lower boundary", () => {
    const result = updateSettingsSchema.safeParse({
      targetedPracticeRatio: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts targetedPracticeRatio at upper boundary", () => {
    const result = updateSettingsSchema.safeParse({
      targetedPracticeRatio: 100,
    });
    expect(result.success).toBe(true);
  });

  it("rejects targetedPracticeRatio below lower boundary", () => {
    const result = updateSettingsSchema.safeParse({
      targetedPracticeRatio: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects targetedPracticeRatio above upper boundary", () => {
    const result = updateSettingsSchema.safeParse({
      targetedPracticeRatio: 101,
    });
    expect(result.success).toBe(false);
  });
});

describe("createWordListSchema", () => {
  it("accepts valid word list", () => {
    const result = createWordListSchema.safeParse({
      name: "My List",
      words: ["hello", "world"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createWordListSchema.safeParse({
      name: "",
      words: ["hello"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty words array", () => {
    const result = createWordListSchema.safeParse({
      name: "My List",
      words: [],
    });
    expect(result.success).toBe(false);
  });
});
