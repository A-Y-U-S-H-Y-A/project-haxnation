# Solution: White on White — diagram-white-text

**Storyline:** Operation Coinnectar (HaxNation × FOSS Mumbai) — Chapter 4
**Difficulty:** Easy · **Points:** 100 · **Answer format:** `HXN{...}`

## Walkthrough

1. The provided `diagram.excalidraw` is JSON. Open it in a text editor (or `jq`), not a browser.
2. Scan `elements[]` for anything suspicious. Every visible label is a normal text element. One text element is drawn with stroke `#ffffff` — invisible on a white canvas:

   ```bash
   jq '.elements[] | select(.strokeColor == "#ffffff") | {text, originalText}' diagram.excalidraw
   ```

3. That element contains a base64 blob, not a literal flag. Decode it:

   ```bash
   echo '<decoded-blob>' | base64 -d
   ```

4. The decoded string is the flag itself.

The trap is trusting the render. Excalidraw stores full element data regardless of visibility — "white on white" is the classic way this hides.

## Notes for authors

- The hidden element is a single text node; no file tricks needed.
- Flag value is withheld until the answer-key commit.
