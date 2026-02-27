import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "@/lib/schemas/auth";
import { pageCompleteSchema } from "@/lib/schemas/page";
import { updateSettingsSchema } from "@/lib/schemas/settings";
import { createWordListSchema } from "@/lib/schemas/wordlist";

describe("registerSchema", () => {
  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      username: "testuser",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      username: "testuser",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short username", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      username: "ab",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      username: "testuser",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects username with special characters", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      username: "test user!",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid login data", () => {
    const result = loginSchema.safeParse({
      username: "testuser",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty username", () => {
    const result = loginSchema.safeParse({
      username: "",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("pageCompleteSchema", () => {
  it("accepts valid page completion data", () => {
    const result = pageCompleteSchema.safeParse({
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
      targetText: "",
      typedText: "hello",
      keystrokeTimings: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("updateSettingsSchema", () => {
  it("accepts valid settings update", () => {
    const result = updateSettingsSchema.safeParse({
      charsPerPage: 200,
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
