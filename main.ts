// news-image-20261125 — "The World Today, Wednesday 25 November 2026"
// One program draws the whole front page from scratch: a 5x7 pixel font
// held as one row of bit-strings per glyph, and a PNG writer built by hand.
// It runs on Node 24 with nothing but the standard library (fs + zlib),
// touches no network, and always paints the same fixed date and palette.
// The result is a 1024x1024 PNG at /output/entry.png.
import * as fs from "node:fs";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;
const OUT = "/output/entry.png";

// ---------------------------------------------------------------- palette
const PAPER = [248, 244, 233];
const INK = [22, 28, 38];
const NAVY = [15, 40, 64];
const NAVY2 = [23, 62, 94];
const GOLD = [198, 158, 44];
const RED = [178, 44, 34];
const ORANGE = [214, 104, 40];
const BLUE = [26, 74, 132];
const TEAL = [14, 112, 104];
const GREEN = [30, 116, 56];
const WHITE = [255, 255, 255];
const CREAM = [234, 226, 202];
const GREY = [96, 102, 98];
const SKY = [166, 198, 222];

// ---------------------------------------------------------------- canvas
// A raw RGB framebuffer, three bytes per pixel, row-major.
const buf = new Uint8Array(W * H * 3);
function px(x: number, y: number, c: number[]): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const o = (y * W + x) * 3;
  buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2];
}
function fill(x: number, y: number, w: number, h: number, c: number[]): void {
  const ax = Math.max(0, x);
  const ay = Math.max(0, y);
  const bx = Math.min(W, x + w);
  const by = Math.min(H, y + h);
  const span = bx - ax;
  if (span <= 0 || by <= ay) return;
  const row = Buffer.alloc(span * 3);
  for (let i = 0; i < span; i++) {
    row[i * 3] = c[0];
    row[i * 3 + 1] = c[1];
    row[i * 3 + 2] = c[2];
  }
  for (let yy = ay; yy < by; yy++) buf.set(row, (yy * W + ax) * 3);
}
function ball(cx: number, cy: number, r: number, c: number[]): void {
  for (let y = cy - r; y <= cy + r; y++) {
    const dy = y - cy;
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    for (let x = cx - dx; x <= cx + dx; x++) px(x, y, c);
  }
}
function line(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const n = Math.max(Math.abs(dx), Math.abs(dy), 1);
  let i = 0;
  while (i <= n) {
    px(Math.round(x0 + (dx * i) / n), Math.round(y0 + (dy * i) / n), c);
    i++;
  }
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number[]): void {
  const loX = Math.min(x0, x1, x2);
  const hiX = Math.max(x0, x1, x2);
  const loY = Math.min(y0, y1, y2);
  const hiY = Math.max(y0, y1, y2);
  const d2 = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  if (d2 === 0) return;
  for (let y = loY; y <= hiY; y++) {
    for (let x = loX; x <= hiX; x++) {
      const u = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d2;
      const v = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d2;
      if (u >= 0 && v >= 0 && 1 - u - v >= 0) px(x, y, c);
    }
  }
}
function grad(x: number, y: number, w: number, h: number, top: number[], bot: number[]): void {
  for (let yy = 0; yy < h; yy++) {
    const t = yy / Math.max(1, h - 1);
    const c = [
      Math.round(top[0] + (bot[0] - top[0]) * t),
      Math.round(top[1] + (bot[1] - top[1]) * t),
      Math.round(top[2] + (bot[2] - top[2]) * t),
    ];
    fill(x, y + yy, w, 1, c);
  }
}

// ---------------------------------------------------------------- 5x7 font
// One line per glyph: seven rows of five bits, "1" is ink, "0" is blank.
const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00001", "00010", "00100", "01000", "10000", "10000"],
  "%": ["11001", "11001", "00010", "00100", "01000", "10011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "*": ["00000", "00100", "10101", "01110", "10101", "00100", "00000"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
};
function textW(s: string, sc: number): number {
  return s.length * 6 * sc - sc;
}
function put(x: number, y: number, s: string, sc: number, c: number[]): number {
  const txt = s.toUpperCase();
  let pen = x;
  for (const ch of txt) {
    const g = GLYPHS[ch] || GLYPHS["?"];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === "1") fill(pen + col * sc, y + r * sc, sc, sc, c);
      }
    }
    pen += 6 * sc;
  }
  return pen;
}
function putC(cx: number, y: number, s: string, sc: number, c: number[]): void {
  put(cx - Math.floor(textW(s, sc) / 2), y, s, sc, c);
}
// Word-wrap paragraph; returns y after last line.
function para(x: number, y: number, maxW: number, s: string, sc: number, lh: number, c: number[]): number {
  const out: string[] = [];
  let cur = "";
  for (const w of s.split(" ")) {
    const t = cur ? cur + " " + w : w;
    if (textW(t, sc) > maxW && cur) {
      out.push(cur);
      cur = w;
    } else {
      cur = t;
    }
  }
  if (cur) out.push(cur);
  out.forEach((ln, i) => put(x, y + i * lh, ln, sc, c));
  return y + out.length * lh;
}
function kick(x: number, y: number, s: string, c: number[]): void {
  put(x, y, s, 2, c);
}

// ---------------------------------------------------------------- PNG encoder
// The PNG is assembled by hand: signature, IHDR, one IDAT holding the
// zlib-deflated scanlines (filter byte 0 on every row), then IEND. Each
// chunk carries a CRC32 over its type plus data, computed from a table
// built once from the standard reversed polynomial.
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let cc = n;
  for (let k = 0; k < 8; k++) cc = cc & 1 ? 0xedb88320 ^ (cc >>> 1) : cc >>> 1;
  CRC_TABLE.push(cc);
}
function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function u32be(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}
function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  return Buffer.concat([u32be(data.length), body, u32be(crc32(body))]);
}
function emit(): void {
  const frame = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  const rows: Buffer[] = [];
  for (let y = 0; y < H; y++) {
    const row = Buffer.alloc(1 + W * 3);
    row[0] = 0;
    frame.copy(row, 1, y * W * 3, (y + 1) * W * 3);
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const parts: Buffer[] = [sig];
  parts.push(chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)));
  const png = Buffer.concat(parts);
  fs.mkdirSync("/output", { recursive: true });
  fs.writeFileSync(OUT, png);
}

// ---------------------------------------------------------------- compose
function card(x: number, y: number, w: number, h: number, bg: number[]): void {
  fill(x, y, w, h, bg);
  fill(x, y, w, 3, GOLD);
  fill(x, y, 3, h, INK);
  fill(x + w - 3, y, 3, h, INK);
  fill(x, y + h - 3, w, 3, INK);
}

function main(): void {
  fill(0, 0, W, H, PAPER);

  // ---- masthead
  fill(0, 0, W, 112, NAVY);
  fill(0, 112, W, 6, GOLD);
  putC(512, 16, "THE WORLD TODAY", 6, WHITE);
  putC(512, 64, "WEDNESDAY 25 NOVEMBER 2026  *  ONE IMAGE  *  SEVEN STORIES", 2, GOLD);
  put(28, 90, "MARKETS  *  WAR  *  TECH  *  INTEL  *  CHESS", 2, [178, 205, 190]);
  put(1024 - 28 - textW("NEWS-IMAGE-20261125", 2), 90, "NEWS-IMAGE-20261125", 2, [178, 205, 190]);

  // ---- HERO: Trump floats a pardon for Huang
  card(24, 130, 976, 292, WHITE);
  grad(620, 146, 364, 260, [14, 38, 60], [30, 80, 120]);
  // capitol dome
  ball(802, 258, 44, WHITE);
  fill(758, 258, 88, 8, WHITE);
  fill(740, 266, 124, 58, WHITE);
  for (let i = 0; i < 5; i++) fill(748 + i * 24, 276, 10, 40, NAVY2);
  line(802, 214, 802, 196, GOLD);
  ball(802, 192, 4, GOLD);
  // falling chart
  line(640, 360, 700, 372, GOLD); line(700, 372, 760, 368, GOLD);
  line(760, 368, 830, 382, GOLD); line(830, 382, 900, 378, GOLD);
  line(900, 378, 956, 396, RED);
  tri(938, 390, 970, 390, 954, 412, RED);
  ball(700, 372, 5, GOLD); ball(830, 382, 5, GOLD);
  // -6% stamp
  fill(648, 146, 176, 40, RED);
  put(660, 154, "-6% IN A DAY", 2, WHITE);
  // hero text
  kick(44, 150, "1  MARKETS + POLITICS  -  WASHINGTON", GREEN);
  put(44, 178, "TRUMP FLOATS", 7, INK);
  put(44, 234, "PARDON", 7, INK);
  para(44, 296, 556, "A pardon for Nvidia CEO Jensen Huang is 'always an option', Trump tells the New York Post, urging him to tell the truth to Congress next week, not plead the Fifth.", 2, 20, INK);
  put(44, 392, "NVDA -6% * RALLY FIZZLES * US STAKE TALK", 2, TEAL);

  // ---- ROW 2: two panels
  // Zelenskiy confirms the Sparta II strike
  card(24, 434, 480, 214, WHITE);
  fill(40, 450, 448, 62, NAVY);
  // burning ship
  fill(64, 478, 120, 16, [90, 96, 104]);
  tri(64, 478, 110, 478, 86, 452, [120, 130, 140]);
  tri(120, 452, 150, 468, 120, 482, ORANGE);
  tri(150, 458, 178, 470, 152, 484, RED);
  ball(210, 468, 5, RED);
  // funnel + waves under the burning ship
  fill(150, 466, 14, 12, [60, 64, 70]);
  line(64, 500, 184, 500, [52, 110, 168]);
  line(80, 506, 170, 506, [52, 110, 168]);
  put(240, 466, "KYIV CLAIMS", 3, WHITE);
  put(240, 492, "THE SHIP STRIKE", 2, GOLD);
  kick(40, 528, "2  WAR AT SEA  -  GULF OF FINLAND", RED);
  put(40, 554, "SPARTA II", 3, INK);
  put(40, 578, "HIT AT SEA", 3, INK);
  para(40, 610, 448, "Zelenskiy confirms Ukraine hit the Russian ship. Norway urges caution.", 2, 18, GREY);

  // Houthi drone hits the Riyadh tower
  card(520, 434, 480, 214, WHITE);
  fill(536, 450, 448, 62, [24, 44, 60]);
  // tower + blast
  fill(560, 470, 26, 42, [180, 190, 200]);
  tri(560, 470, 586, 470, 573, 452, ORANGE);
  ball(600, 470, 5, RED);
  tri(620, 456, 648, 472, 624, 488, RED);
  put(660, 466, "DRONE HITS", 3, WHITE);
  put(660, 492, "RIYADH TOWER", 2, GOLD);
  kick(536, 528, "3  MIDDLE EAST  -  RIYADH", TEAL);
  put(536, 554, "TOWER HIT", 3, INK);
  put(536, 578, "11 WOUNDED", 3, INK);
  para(536, 610, 448, "A Houthi drone hits Riyadh's tallest tower, wounding 11.", 2, 18, GREY);

  // ---- ROW 3: three panels
  // Huawei convicted
  card(24, 660, 316, 204, WHITE);
  fill(24, 660, 316, 10, TEAL);
  // chip
  fill(56, 676, 64, 64, [20, 32, 28]);
  fill(66, 686, 44, 44, NAVY2);
  put(74, 700, "HW", 3, WHITE);
  for (let i = 0; i < 3; i++) {
    fill(56, 688 + i * 20, 8, 6, GOLD);
    fill(112, 688 + i * 20, 8, 6, GOLD);
  }
  kick(40, 748, "4  TECH  -  NEW YORK", TEAL);
  put(40, 772, "HUAWEI", 3, INK);
  put(40, 796, "CONVICTED", 2, INK);
  para(40, 822, 284, "Guilty of trade-secret theft, a US jury rules.", 2, 16, GREY);

  // CIA breach
  card(354, 660, 316, 204, WHITE);
  fill(354, 660, 316, 10, BLUE);
  // warning disc
  ball(402, 706, 26, BLUE);
  put(396, 696, "!", 4, WHITE);
  kick(370, 748, "5  INTEL  -  WASHINGTON", BLUE);
  put(370, 772, "CIA HIT BY", 3, INK);
  put(370, 796, "CYBER BREACH", 2, INK);
  para(370, 822, 284, "Unclassified data exposed, a source says.", 2, 16, GREY);

  // World Chess Championship, game 2 today
  card(684, 660, 316, 204, WHITE);
  fill(684, 660, 316, 10, GREEN);
  // mini chessboard 4x4
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if ((r + c) % 2 === 0) fill(700 + c * 22, 676 + r * 22, 22, 22, INK);
    else fill(700 + c * 22, 676 + r * 22, 22, 22, CREAM);
  }
  ball(711, 687, 7, WHITE); ball(755, 731, 7, RED);
  kick(796, 700, "6  CHESS", GREEN);
  put(796, 726, "GENEVA", 2, INK);
  para(700, 768, 284, "Gukesh has White after game 1 ends in a 38-move draw.", 2, 18, GREY);

  // ---- bottom ticker
  fill(24, 876, 976, 88, NAVY);
  fill(24, 876, 976, 4, GOLD);
  put(40, 892, "ALSO TODAY", 3, GOLD);
  put(40, 920, "NATO EARLY-WARNING JETS TO POLAND * GIULIANI GETS MEDAL OF FREEDOM", 2, WHITE);
  put(40, 942, "SHENZHOU-24 LAUNCHES WITH FIRST PAKISTANI ASTRONAUT * NEPAL QUAKE 5.4", 2, WHITE);
  putC(512, 978, "SOURCES: REUTERS  *  NY POST  *  AP  *  BBC  *  CHESSBASE  *  25 NOVEMBER 2026", 2, GREY);

  emit();
}

main();
