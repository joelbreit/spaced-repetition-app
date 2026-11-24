# Writing flashcard packs (instructions for AI agents)

You can create flashcards for this app (https://flashcards.joelbreit.com) by
writing a **pack**: one JSON document with folders, decks and cards. The user
imports it with **Import Pack** on the home page (file, drag-in, or paste).
JSON Schema: https://flashcards.joelbreit.com/flashcards-pack.schema.json

## Output

- Give the pack as a single JSON code block, or as a `pack.json` file.
- Images: put SVGs in `assets` as text. Raster images (PNG, JPEG, GIF, WebP)
  go in `assets` as base64 `data:` URIs, or in a `.zip` next to `pack.json`.

## Shape

```json
{
	"format": "flashcards-pack",
	"version": 1,
	"id": "cell-biology",
	"folders": [
		{
			"key": "bio",
			"name": "Cell Biology",
			"description": "Optional",
			"color": "green",
			"symbol": "microscope",
			"folders": [],
			"decks": [
				{
					"key": "organelles",
					"name": "Organelles",
					"color": "green",
					"symbol": "dna",
					"cards": [
						{
							"key": "mito",
							"front": "What does the **mitochondrion** make?",
							"back": "ATP",
							"reverse": true
						},
						{
							"key": "nucleus",
							"cloze": "The {{c1::nucleus}} stores {{c2::DNA::genetic material}}.",
							"extra": "Only in eukaryotes."
						},
						{
							"key": "cell-diagram",
							"front": "Name the labelled part\n\n![cell](asset:cell.svg)",
							"back": "Golgi apparatus"
						}
					]
				}
			]
		}
	],
	"decks": [],
	"assets": {
		"cell.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 120\">...</svg>"
	}
}
```

- `format` and `version` are required as shown.
- Top level: `folders` and/or `decks`. Folders can nest (`folders` inside a
  folder). Top-level items go into the folder the user imports from.
- A card is **basic** (`front` + `back`, optional `reverse: true` to also add
  the back→front card) or **cloze** (`cloze` + optional `extra`, shown on the
  back). Never both.

## Card text

Fields are Markdown (GitHub flavored): `**bold**`, `*italic*`, lists, tables,
`inline code`, fenced code blocks with a language (` ```python `) for
highlighting, and ` ```mermaid ` blocks for diagrams. Single line breaks are
kept. Raw HTML is not rendered. In JSON, write line breaks as `\n`.

**Cloze**: `{{c1::answer}}` or `{{c1::answer::hint}}`. Each number makes one
card hiding every deletion with that number; reuse a number to hide several
things together. Deletions work inside Markdown and code blocks.

**Images**: `![alt text](asset:NAME)`, where `NAME` is a key in `assets` (or a
path in the zip). Alt text is read aloud, so describe the image. Images show
at most ~40% of the screen high.

- SVG: include `xmlns`, a `viewBox`, and explicit fills/strokes. Scripts
  and event handlers are removed, and external images or fonts don't load, so
  keep it self-contained and use a generic font (`font-family="sans-serif"`). Prefer a ` ```mermaid ` block
  for flowcharts, sequences and similar diagrams.
- Up to 5 MB each; large photos are scaled to 2000 px.

## Updating a pack later

Give the pack an `id` and every folder, deck and card a `key` (unique within
the pack for its kind; short, stable, e.g. `"mito"`). Importing a pack with
the same `id` again then **updates** those items in place (keeping review
history) and adds new ones. Imports never delete, so to remove something the
user deletes it in the app. Without `id`/`key`, every import adds new copies.
A card can't change between basic and cloze; give it a new key instead.
Removing a cloze number from a card's text deletes that number's card.

## Look

`color`: teal (default), blue, indigo, violet, pink, red, orange, amber,
green, slate.

`symbol` (icon names): book-open, folder, library, notebook, notebook-pen,
bookmark, graduation-cap, school, lightbulb, star, trophy, rocket, cloud,
cloud-cog, server, server-cog, network, container, boxes, workflow,
shield-check, key, globe, code, code-xml, braces, terminal, cpu, binary,
git-branch, bug, laptop, database, database-zap, table, sheet, spreadsheet,
brain, brain-circuit, waypoints, bot, sparkles, languages, book-a,
spell-check, whole-word, type, messages, quote, text-quote, scan-text,
audio-lines, chart-column, chart-line, chart-scatter, chart-spline, chart-pie,
trending-up, sigma, function, variable, pi, radical, percent, calculator,
pill, tablets, syringe, stethoscope, heart-pulse, activity, hospital,
microscope, dna, test-tube, test-tubes, flask, atom, orbit, telescope, magnet,
zap, leaf, landmark, scale, briefcase, heart, music, palette, feather, camera,
utensils, dumbbell, gamepad, plane, map, paw.

Unknown colors or symbols fall back to the default, with a warning.

## Good cards

- One fact per card; keep fronts short and specific, answers brief.
- Use cloze for facts in context (definitions, sequences, code), basic for
  questions, and `reverse` only when both directions are worth learning
  (e.g. vocabulary).
- Group related cards into decks of roughly 10–100 cards.

## If the import reports problems

The app lists each problem with its location, e.g.
`folders[0].decks[1].cards[4].cloze: has no deletions like {{c1::answer}}`,
and the user can copy the list back to you. Fix those items and send the whole
pack again (with the same `id` and keys).
