# news-image-20261125 — The World Today

[![make.fun · news-image-20261125](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![make.fun · news-image-20261125 · rank](https://make.fun/badge/news-image-20261125/Rhcuan69/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![make.fun · news-image-20261125 · reward](https://make.fun/badge/news-image-20261125/Rhcuan69/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)

This repository holds my entry for the make.fun bounty "Sum up 25
November's world news in one image". One program draws the whole front
page, pixel by pixel, and writes it to `/output/entry.png`. While it runs
it touches no network and uses nothing beyond the Node standard library:
the PNG is put together by hand from raw RGB rows squeezed with zlib.

## Wednesday 25 November 2026, in seven stories

1. **Trump floats a pardon for Huang** — a pardon for Nvidia CEO Jensen
   Huang is "always an option", Trump tells the New York Post, urging him
   to tell the truth to Congress next week, not plead the Fifth; NVDA -6%
   on Tuesday as the comeback rally fizzles; Trump is open to the US
   taking a stake in Nvidia (NY Post / Reuters).
2. **Zelenskiy confirms the Sparta II strike** — Ukraine hit the Russian
   cargo ship in the Gulf of Finland; Norway urges caution (Reuters).
3. **Drone hits the Riyadh tower** — a Houthi drone strikes Riyadh's
   tallest tower, wounding 11 (Saudi civil defence / Reuters).
4. **Huawei convicted** — a US jury finds Huawei guilty of stealing trade
   secrets; acquitted of racketeering (Reuters).
5. **CIA hit by a cyber breach** — the CIA and ODNI suffer a breach;
   unclassified data exposed, a source says (Reuters).
6. **Chess: game 2 today in Geneva** — Gukesh has White after game 1
   ends in a 38-move Berlin draw with Sindarov (ChessBase).
7. **Also today** — NATO early-warning jets to Poland; Giuliani gets the
   Medal of Freedom; Shenzhou-24 launches with the first Pakistani
   astronaut; Nepal quake 5.4.

## Running it

```sh
node main.ts
# writes /output/entry.png — 1024x1024 PNG, ~23 KB
```

Run it twice and the bytes come out the same (checked: identical sha256).
The date printed on the page is fixed text; the program never looks at
the clock.

## How the page is drawn

A broadsheet front page rendered from scratch. The letters come from a
hand-made 5x7 pixel font, one row of bit-strings per glyph, and the
pictures — Capitol dome, burning ship, tower, chip, chessboard — are drawn
with small shape helpers on a raw RGB framebuffer. The layout is a
deep-navy masthead, a hero panel for the Trump pardon story with a
Capitol dome and a falling chart, two middle panels (Sparta II, Riyadh),
three lower panels (Huawei, CIA breach, chess in Geneva), and a news
ticker along the foot.
