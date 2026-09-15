# IDK — Just play.

A responsive, dark arcade inspired by the layout of donutglint.com, with original IDK branding and original generated game artwork. Six playable games use free virtual credits: Mines, Towers, Coinflip, Plinko, Blackjack, and Dice.

## Run locally

No build step or dependencies. Serve this directory with any static HTTP server, for example:

```sh
python -m http.server 8080
```

Open `http://localhost:8080`. The site uses plain HTML, CSS, and JavaScript. Fonts load from Google Fonts with system fallbacks. Artwork is stored locally in `assets/arcade-games.png`.

## GitHub Pages

Serve the `main` branch from `/ (root)` in the repository's **Settings → Pages**. `CNAME` retains the existing `idk.rest` custom domain. `.nojekyll` allows direct static delivery. No API keys or environment variables are needed. Hash-based game links work on GitHub Pages without a server router.

## Demo behavior

- Start with 10,000 free credits. The wallet's **+** restores a balance below 10,000 to 10,000 when no round is active.
- Balances and the last 50 completed rounds use localStorage on the current browser. If storage is unavailable, play works in memory with a notice.
- Credits have no cash value. There are no deposits, withdrawals, purchases, prizes, accounts, or Minecraft integrations.
- Results use `crypto.getRandomValues` with rejection sampling and a Fisher–Yates shuffle. All state is client-side and editable by the player. This is not a secure balance ledger or a server-verifiable fairness system.
- Reloading or leaving the page during an active round forfeits its deducted stake. Closing the game dialog collects safe Mines/Towers progress (or refunds an unplayed round), or stands in Blackjack. Single-result animations must finish before closing the dialog.
- Each browser tab has its own in-memory session; don't run simultaneous tabs if you need one consistent saved balance.

## Game rules

| Game | Rules |
| --- | --- |
| Mines | 25 tiles, configurable 1/3/5/10 mines. Safe-pick return is 0.97 divided by the probability of surviving that number of picks. Collect early or reveal every gem. |
| Towers | 8 rows, 3 choices each, 1 losing tile per row. Return after n safe rows is 0.97 × 1.5^n. |
| Coinflip | Equal chance of heads or tails. Correct picks return 1.95×. |
| Plinko | Eight independent 50/50 bounces. Nine slots pay 8/3/1.4/0.7/0.4/0.7/1.4/3/8×. |
| Blackjack | Fresh shuffled 52-card deck each round; aces count as 1 or 11. Dealer stands on all 17s and checks natural blackjack. Normal wins return 2×; natural blackjack returns 2.5×; ties return 1×. No splitting, doubling, insurance, or surrender. |
| Dice | Integer target from 5 to 95. Uniform roll from 0.00 to 99.99. Rolls strictly below the target win, returning 97/target ×. |

All listed returns include the original stake. Payouts round to two decimal places. Stakes use whole credits from 1 to 1,000,000 and cannot exceed the current balance.

## Artwork

`assets/arcade-games.png` was made with the built-in ImageGen tool for this project, not copied from the reference site.

Prompt: Premium glossy 3D arcade game illustration sheet, seamless 3 columns × 2 rows, no gutters. Top row: teal mine with cyan diamonds; purple block tower and crystal; amber floating gold coin. Bottom row: pink plinko pegs and golden ball; emerald playing cards and chips; cobalt translucent dice. Centered subjects, jewel-tone gradients, soft studio bloom, generous breathing room, no words, letters, logos, or watermark.
