import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("settings page logout markup", () => {
  const settingsPagePath = path.resolve(process.cwd(), "app/settings/page.tsx");
  const settingsPageSource = readFileSync(settingsPagePath, "utf8");

  it("uses a POST form action for logout", () => {
    expect(settingsPageSource).toContain('<form action="/api/auth/logout" method="POST">');
  });

  it("does not attach client-side click handlers to the logout button", () => {
    const logoutButtonBlock = settingsPageSource.match(
      /<button[\s\S]*?>[\s\S]*?Log out[\s\S]*?<\/button>/,
    );

    expect(logoutButtonBlock).not.toBeNull();
    expect(logoutButtonBlock?.[0]).not.toContain("onClick");
  });
});
