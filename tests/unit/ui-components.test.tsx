import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import HelpTooltip from "@/components/ui/HelpTooltip";
import Input from "@/components/ui/Input";

describe("Button", () => {
  it("applies variant and size classes", () => {
    render(
      <Button variant="danger" size="lg">
        Delete
      </Button>
    );

    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.className).toContain("bg-red-600");
    expect(button.className).toContain("px-6 py-3 text-base");
  });
});

describe("Card", () => {
  it("renders content and merges custom class names", () => {
    render(<Card className="custom-card">Stats</Card>);

    const card = screen.getByText("Stats");
    expect(card.className).toContain("rounded-xl");
    expect(card.className).toContain("custom-card");
  });
});

describe("Input", () => {
  it("shows label and error state classes", () => {
    render(<Input label="Username" error="Required" defaultValue="" />);

    expect(screen.getByText("Username")).toBeTruthy();
    expect(screen.getByText("Required")).toBeTruthy();

    const input = screen.getByRole("textbox");
    expect(input.className).toContain("border-red-500");
  });

  it("uses default border class when there is no error", () => {
    render(<Input aria-label="Email" />);

    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input.className).toContain("border-zinc-700");
  });
});

describe("HelpTooltip", () => {
  it("shows tooltip content on hover and hides it on mouse leave", () => {
    render(<HelpTooltip content="Explains targeted practice." label="Open help" />);

    const button = screen.getByRole("button", { name: "Open help" });
    const tooltip = screen.getByRole("tooltip");

    expect(tooltip.className).toContain("invisible");

    fireEvent.mouseEnter(button);
    expect(tooltip.className).toContain("visible");
    expect(screen.getByText("Explains targeted practice.")).toBeTruthy();

    fireEvent.mouseLeave(button);
    expect(tooltip.className).toContain("invisible");
  });

  it("keeps the tooltip open after click until toggled closed", () => {
    render(<HelpTooltip content="Pinned help text." label="Pinned help" />);

    const button = screen.getByRole("button", { name: "Pinned help" });
    const tooltip = screen.getByRole("tooltip");

    fireEvent.click(button);
    expect(tooltip.className).toContain("visible");

    fireEvent.mouseLeave(button);
    expect(tooltip.className).toContain("visible");

    fireEvent.click(button);
    expect(tooltip.className).toContain("invisible");
  });
});
