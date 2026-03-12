import { describe, expect, it } from "vitest";
import { parseWordListText, serializeWordListText } from "@/lib/wordlists/text";
import { listProjectWordLists, PROJECT_WORDLISTS_DIR } from "@/lib/wordlists/project-lists";

describe("word list text formatting", () => {
  it("parses comma-separated lists", () => {
    expect(parseWordListText("alpha, beta, gamma")).toEqual(["alpha", "beta", "gamma"]);
  });

  it("parses newline-separated lists", () => {
    expect(parseWordListText("alpha\nbeta\ngamma")).toEqual(["alpha", "beta", "gamma"]);
  });

  it("serializes words using commas", () => {
    expect(serializeWordListText(["alpha", "beta", "gamma"])).toBe("alpha, beta, gamma");
  });
});

describe("project word list loader", () => {
  it("loads .txt files from the project wordlists directory", async () => {
    const lists = await listProjectWordLists();

    expect(PROJECT_WORDLISTS_DIR.endsWith("/wordlists")).toBe(true);
    expect(lists).toContainEqual({
      id: "project-dev-tools",
      name: "Dev Tools",
      words: ["git", "grep", "tmux", "docker", "kubectl", "sqlite", "prisma", "eslint", "vitest", "nextjs"],
      sourceFile: "wordlists/dev-tools.txt",
    });
  });
});
