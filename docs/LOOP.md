# A self-checking loop for this project (optional)

This is for people using **Claude Code** on this repo. It lets Claude keep fixing problems on its own until the real checks pass, instead of you re-prompting every few minutes.

## Is a loop worth it here?

A loop pays off only when all four are true:

1. The work repeats (many small fixes, not one big idea).
2. A script can say pass or fail (here: `npm run typecheck` and `npm test`).
3. You are happy to spend the tokens.
4. Claude can run commands and edit files.

**Good fit:** accessibility fixes, refactors, adding tests, fixing a red test suite.
**Poor fit:** writing your case studies, choosing colors, judging taste. Nothing can pass or fail those mechanically, so use a normal prompt.

## Turn it on

1. Copy `docs/loop/settings.example.json` to `.claude/settings.json`.
2. In Claude Code run, for example:
   `/goal "Fix every failing check. Done means npm run typecheck and npm test both pass."`
3. Claude cannot stop while the gate is red. After `GATE_MAX_TRIES` failures in a row (default 8) the gate lets it stop so it never spins forever. Set `GATE_BUILD=1` to include `next build`.

## Prove it works

Break something on purpose (change a number in a test), tell Claude to fix it, and watch it keep going until the gate is green. The script is the control, not the banner.

The gate never asks the AI whether it is "done". A real test run decides.
