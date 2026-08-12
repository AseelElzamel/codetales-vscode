# CodeTales — Little Red Riding Hood

A programming-learning game for high school students. Players learn Python fundamentals — variables, conditions, loops, functions, objects, lists, and debugging — by fixing broken code that drives a live, animated retelling of Little Red Riding Hood.

## Project structure

```
index.html      — page structure and markup
styles.css       — all styling
script.js        — all game logic (chapters, code validation, animation, state)
assets/          — character and scene artwork (PNG)
```

Plain HTML/CSS/JS — no build step, no bundler, no npm install. Open `index.html` in a browser and it runs.

## Running it

**Just open it:** double-click `index.html`, or open the folder in VS Code and use an extension like *Live Server* for auto-reload while editing.

**GitHub Pages:** push this repo, then enable Pages under Settings → Pages → Deploy from branch → `main` → `/root`. The game will be live at `https://<your-username>.github.io/<repo-name>/`.

## Editing in VS Code

- All game/chapter logic is in `script.js`, organized by chapter (search for `CHAPTER 1`, `CHAPTER 2`, etc. section headers).
- Each chapter has its own small parser (`parseChapterN`), evaluator (`evalChapterN`), reset function, and run function — they're independent, so you can edit one chapter without touching the others.
- `CHAPTER_META` near the bottom of `script.js` wires each chapter's title, description, and functions together, and `switchToChapter()` handles moving between them.
- Character/scene art is swapped at runtime via the `POSES` object at the top of `script.js`, which maps pose names to files in `assets/`.

## Notes

- Progress (XP, achievements, current chapter) is held in memory only — refreshing the page resets it, since there's no backend or persistent storage.
- Character and background art adapted from user-provided reference illustrations.
