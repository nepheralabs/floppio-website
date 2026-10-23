# Daily puzzle format (schema version 1)

Save each official puzzle as `test/puzzles/YYYY-MM-DD.json` in UTF-8. Its filename, `id`, and `date` must be the same real UTC calendar date. At initial load the game requests the current UTC date, never local midnight. The sample is requested only by `?sample=1` and cannot load as an official puzzle, including on its own date.

## Structure

```json
{
  "schemaVersion": 1,
  "id": "2026-11-02",
  "date": "2026-11-02",
  "title": "Daily disk title",
  "sample": false,
  "editorialNote": "Optional internal content notes",
  "prompts": [
    {
      "id": "unique-prompt-slug",
      "question": "Name one of the eight planets in our Solar System.",
      "fuzzy": true,
      "answers": [
        { "canonical": "Earth", "score": 10, "aliases": [] }
      ]
    }
  ]
}
```

This abbreviated example is **not a valid complete puzzle**. Supply exactly seven prompts and complete accepted-answer sets. The actual seven-prompt sample is `test/puzzles/2026-11-01.json`.

## Required fields and constraints

| Field | Contract |
| --- | --- |
| `schemaVersion` | Integer `1`. |
| `id`, `date` | Equal date strings, `YYYY-MM-DD`; must match the requested filename. |
| `title` | Nonblank string, at most 100 characters. |
| `sample` | Boolean. `false` for official content, `true` only for development sample content. |
| `prompts` | Exactly seven entries, in playing order. |
| Prompt `id` | Nonblank string up to 80 characters, unique within this puzzle. |
| `question` | Nonblank string up to 300 characters; specify the category precisely. |
| `fuzzy` | Optional boolean, default `true`. Use `false` for numeric or easily confused categories. |
| `answers` | 1–500 entries per prompt; include all valid answers for the stated scope. |
| `canonical` | Nonblank answer string, at most 120 characters. Displayed and saved on acceptance. |
| `score` | Integer 0–1000, assigned by an editor. Never computed from time or popularity by the engine. |
| `aliases` | Required array of nonblank strings up to 120 characters each; empty is valid. |

Extra metadata is allowed and ignored by the engine. The executable validator is `test/js/validation.js`; no schema library is required. Distinct answers must not collide after normalization, including their aliases. Duplicate aliases for the same canonical answer are harmless.

## Matching policy

NFKD Unicode normalization removes combining accents; comparisons ignore case, normalize repeated whitespace, remove apostrophes and turn other punctuation into spaces. Numeric signs, fractions, decimal prefixes and percentages are preserved to avoid changing the value of an answer. Add explicit aliases for abbreviations, alternative names, symbols and meaningful spelling variants. Normalization does not invent translations or alternate geographic names. Case-insensitive matching applies to symbols as well as words in V0.1.

Exact canonical names and aliases are accepted immediately. For Latin-letter inputs at least four characters long, a single insertion, deletion, substitution, or adjacent transposition may produce a suggestion. Only one canonical answer may be within that distance, considering its aliases. Ambiguous candidates, short words, and numeric inputs are rejected without choosing an answer. A suggestion never scores until SEND; its timer continues. This policy intentionally misses some typos.

## Publishing content safely

1. Copy the sample structure into the intended date file; change both date fields and set `sample: false`.
2. Write seven distinct, narrowly scoped prompts with comprehensive canonical answers and aliases.
3. Fact-check the complete sets and assign editorial scores. Scores are provisional until approved.
4. Run the test suite and validate the new file with `validatePuzzle` (or add a loader fixture test).
5. Do not edit a published puzzle after play starts. A changed content signature causes old progress to be rejected with a notice; this protects against silently re-scoring changed answers.
6. Obtain approval before publishing the branch or its content. The game shows a friendly unavailable screen for absent, mismatched, invalid, or sample-only daily content.

## Sample content review

Seven bounded sets contain 9 German land neighbours, 8 planets, 6 naturally occurring noble gases, 6 standard chess piece types including pawns, 7 SI base units, 10 primes below 30, and 5 Olympic ring colours. All entries in each set are represented. Pluto and oganesson are excluded by the wording; the white Olympic background is not a ring. Prime completeness is also checked algorithmically in tests. "Holland" and "castle" are permissive colloquial aliases for Netherlands and rook.

Sources used for factual review:

- [Germany's nine neighbours — deutschland.de](https://www.deutschland.de/en/topic/politics/germany-nine-neighbours-facts)
- [SI base units — BIPM](https://www.bipm.org/en/measurement-units/si-base-units)
- [Periodic table — Royal Society of Chemistry](https://periodic-table.rsc.org/)
- [Olympic symbol — Olympic Brand Centre](https://brand-centre.olympic.org/olympic_symbol)

This is reviewed testing material, **not verified launch-ready editorial content**. Rarity points are illustrative editorial values, not survey results. Independent content and alias review remains required.
