import { describe, expect, it } from "vitest";
import { reorderDesktopIcons, sortDesktopIcons, sortDesktopIconsBySize } from "@/components/os/desktop-order";

describe("desktop ordering", () => {
  it("reorders icons by dragging one item before another", () => {
    const order = ["hire", "work", "about", "reviews", "mail", "terminal", "bin"];
    expect(reorderDesktopIcons(order, "terminal", "about", "before")).toEqual([
      "hire",
      "work",
      "terminal",
      "about",
      "reviews",
      "mail",
      "bin",
    ]);
  });

  it("puts the dragged icon after the target when dropped lower on the item", () => {
    const order = ["hire", "work", "about", "reviews", "mail", "terminal", "bin"];
    expect(reorderDesktopIcons(order, "terminal", "about", "after")).toEqual([
      "hire",
      "work",
      "about",
      "terminal",
      "reviews",
      "mail",
      "bin",
    ]);
  });

  it("sorts icons alphabetically and reverse alphabetically", () => {
    const order = ["terminal", "about", "work", "hire"];
    expect(sortDesktopIcons(order, "asc")).toEqual(["about", "hire", "terminal", "work"]);
    expect(sortDesktopIcons(order, "desc")).toEqual(["work", "terminal", "hire", "about"]);
  });

  it("sorts icons by configured size, then name for ties", () => {
    const sizes = { terminal: 640 * 420, about: 600 * 520, mail: 540 * 580 };
    expect(sortDesktopIconsBySize(["mail", "terminal", "about"], sizes)).toEqual(["terminal", "about", "mail"]);
  });
});
