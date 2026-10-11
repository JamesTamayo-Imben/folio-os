"use client";

export function PrintButton() {
  return (
    <button className="btn no-print" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
