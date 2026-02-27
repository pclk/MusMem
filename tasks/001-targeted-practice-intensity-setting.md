# Task 001: Add "Targeted Practice Intensity" setting

## Goal
Allow users to choose how much of each generated page focuses on their weak bigrams versus random variety words.

## Why
The current page generation uses a fixed 60/40 split between targeted and variety content. Making this configurable lets users tune difficulty and learning style.

## Scope
- Add a new user setting `targetedPracticeRatio` (percentage, integer).
- Default value: `60`.
- Allowed range: `0` to `100`.
- Use this ratio in adaptive page generation.

## Implementation Notes
1. **Schema / validation**
   - Extend settings input schema to accept `targetedPracticeRatio`.
   - Validate as integer between 0 and 100.

2. **Persistence**
   - Add a column/field in user settings storage.
   - Ensure migration + seed/default path sets `60` when missing.

3. **Settings UI**
   - Add slider/input in Settings page:
     - Label: `Targeted practice intensity`
     - Helper text: `0% = all variety, 100% = all weak-bigram targeting`
   - Include value in save payload.

4. **Page generation**
   - Replace hardcoded split in page generation with user-selected ratio:
     - `targetedChars = floor(charsPerPage * (ratio / 100))`
     - `varietyChars = charsPerPage - targetedChars`

5. **API plumbing**
   - Ensure `/api/pages/next` has access to current user setting and passes it to generator.

## Acceptance Criteria
- User can set and save `targetedPracticeRatio` from Settings.
- Saved value persists across sessions.
- Generated page composition changes according to selected ratio.
- Existing users without value fall back to 60.
- Unit tests cover:
  - schema validation boundaries (0, 100, out-of-range)
  - page generation split behavior for at least 0, 60, 100.

## Out of Scope
- Per-language or per-wordlist ratio overrides.
- Dynamic auto-adjusting ratio by performance.
