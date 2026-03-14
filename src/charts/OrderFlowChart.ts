// ---------------------------------------------------------------------------
// DiCharts – ATAS-style Order Flow Heatmap
// ---------------------------------------------------------------------------
// Full order-flow visualization: liquidity heatmap background, OHLC candle
// overlay, DOM ladder (bid×ask), volume profile, and footprint-style data.
// Built-in simulation for demo / testing.
// ---------------------------------------------------------------------------

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OFLevel { price: number; quantity: number }

export interface OFSnapshot {
  timestamp: number;
  bids: OFLevel[];
  asks: OFLevel[];
  lastPrice: number;
}

export interface OFTrade {
  timestamp: number;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
}

export interface OrderFlowOptions {
  priceStep?: number;
  maxColumns?: number;
  visibleLevels?: number;
  ticksPerCandle?: number;
  showDOM?: boolean;
  showVolumeProfile?: boolean;
  showCandles?: boolean;
  simulation?: boolean;
  simulationSpeed?: number;
  basePrice?: number;
  background?: string;
  textColor?: string;
}

export interface OrderFlowInstance {
  addSnapshot(s: OFSnapshot): void;
  addTrade(t: OFTrade): void;
  startSimulation(): void;
  stopSimulation(): void;
  setOptions(o: Partial<OrderFlowOptions>): void;
  redraw(): void;
  resize(): void;
  dispose(): void;
}

// ─── ATAS-style heat LUT (blue-dominant) ────────────────────────────────────

const STOPS: [number, number, number, number][] = [
  [0.00,   6,  10,  28],
  [0.06,  10,  22,  55],
  [0.14,  16,  40,  90],
  [0.24,  22,  65, 130],
  [0.36,  28,  95, 168],
  [0.48,  36, 130, 195],
  [0.60,  55, 170, 210],
  [0.72, 100, 200, 190],
  [0.82, 180, 200,  60],
  [0.90, 225, 160,  35],
  [1.00, 220,  70,  40],
];

function heatRGB(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  let i = 0;
  while (i < STOPS.length - 2 && STOPS[i + 1][0] < t) i++;
  const [t0, r0, g0, b0] = STOPS[i];
  const [t1, r1, g1, b1] = STOPS[i + 1];
  const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
  return [
    Math.round(r0 + (r1 - r0) * f),
    Math.round(g0 + (g1 - g0) * f),
    Math.round(b0 + (b1 - b0) * f),
  ];
}

const LUT: string[] = [];
for (let i = 0; i < 256; i++) { const [r, g, b] = heatRGB(i / 255); LUT.push(`rgb(${r},${g},${b})`); }

// DOM ladder cell colors
function domBidColor(t: number): string {
  t = Math.max(0, Math.min(1, t));
  const r = Math.round(15 + 20 * t);
  const g = Math.round(25 + 60 * t);
  const b = Math.round(60 + 140 * t);
  return `rgb(${r},${g},${b})`;
}
function domAskColor(t: number): string {
  t = Math.max(0, Math.min(1, t));
  const r = Math.round(60 + 140 * t);
  const g = Math.round(15 + 20 * t);
  const b = Math.round(25 + 40 * t);
  return `rgb(${r},${g},${b})`;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createOrderFlow(container: HTMLElement, options: OrderFlowOptions = {}): OrderFlowInstance {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  container.appendChild(canvas);
  const cs = getComputedStyle(container);
  if (cs.position === 'static') container.style.position = 'relative';

  let opts = {
    priceStep:        options.priceStep        ?? 1,
    maxColumns:       options.maxColumns       ?? 300,
    visibleLevels:    options.visibleLevels    ?? 60,
    ticksPerCandle:   options.ticksPerCandle   ?? 8,
    showDOM:          options.showDOM          !== false,
    showVolumeProfile: options.showVolumeProfile !== false,
    showCandles:      options.showCandles      !== false,
    simulation:       options.simulation       ?? false,
    simulationSpeed:  options.simulationSpeed  ?? 120,
    basePrice:        options.basePrice        ?? 30150,
    background:       options.background       ?? '#060a1c',
    textColor:        options.textColor        ?? '#4a5578',
  };

  // ── Internal state ──

  interface Col {
    timestamp: number;
    cells: Map<number, number>;
    lastPrice: number;
  }

  interface Candle {
    startCol: number;
    endCol: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }

  const columns: Col[] = [];
  const candles: Candle[] = [];
  const trades: OFTrade[] = [];
  const volProfile = new Map<number, { buy: number; sell: number }>();

  // Current forming candle
  let formingCandle: Candle | null = null;
  let ticksInCandle = 0;

  // Latest snapshot for DOM ladder
  let latestBids: OFLevel[] = [];
  let latestAsks: OFLevel[] = [];

  let centerPrice = opts.basePrice;
  let maxQty = 80;
  let dpr = window.devicePixelRatio || 1;

  // Simulation state
  let simTimer = 0;
  let simPrice = opts.basePrice;
  let simTrend = 0;
  const walls = new Map<number, number>();

  // ── Canvas ──

  function sizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(container.clientWidth * dpr);
    canvas.height = Math.round(container.clientHeight * dpr);
  }
  sizeCanvas();
  const ro = new ResizeObserver(() => { sizeCanvas(); draw(); });
  ro.observe(container);

  // ── Layout ──

  function layout() {
    const w = canvas.width, h = canvas.height;
    const domW = opts.showDOM ? Math.round(Math.min(140 * dpr, w * 0.14)) : 0;
    const profW = opts.showVolumeProfile ? Math.round(w * 0.07) : 0;
    const paxW = Math.round(58 * dpr);
    const taxH = Math.round(22 * dpr);
    const heatW = w - domW - profW - paxW;
    const heatH = h - taxH;
    return {
      domX: 0, domW, heatX: domW, heatW, heatH,
      profX: domW + heatW, profW,
      paxX: w - paxW, paxW,
      taxY: heatH, taxH, taxW: w - paxW,
      w, h,
    };
  }

  function priceToY(price: number, heatH: number) {
    const range = opts.visibleLevels * 2 * opts.priceStep;
    const top = centerPrice + opts.visibleLevels * opts.priceStep;
    return ((top - price) / range) * heatH;
  }
  function cellH(heatH: number) { return heatH / (opts.visibleLevels * 2); }

  // ── Draw ──

  function draw() {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const l = layout();
    const ch = cellH(l.heatH);
    const topP = centerPrice + opts.visibleLevels * opts.priceStep;
    const botP = centerPrice - opts.visibleLevels * opts.priceStep;

    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, l.w, l.h);

    if (columns.length === 0) {
      const fs = Math.round(10 * dpr);
      ctx.fillStyle = opts.textColor;
      ctx.font = `${fs}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Waiting for data\u2026', l.w / 2, l.h / 2);
      return;
    }

    const colW = l.heatW / opts.maxColumns;
    const startCol = Math.max(0, columns.length - opts.maxColumns);

    // ── 1. Heatmap cells ──
    for (let ci = startCol; ci < columns.length; ci++) {
      const col = columns[ci];
      const x = l.heatX + (ci - startCol) * colW;
      const age = 1 - (ci - startCol) / Math.max(1, columns.length - startCol - 1);
      const alpha = 0.6 + age * 0.4;

      for (const [pi, qty] of col.cells) {
        const price = pi * opts.priceStep;
        if (price < botP || price > topP) continue;
        const y = priceToY(price, l.heatH);
        const intensity = Math.min(1, qty / maxQty);
        if (intensity < 0.008) continue;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = LUT[Math.min(255, Math.round(intensity * 255))];
        ctx.fillRect(Math.round(x), Math.round(y - ch / 2), Math.ceil(colW) + 1, Math.ceil(ch) + 1);
      }
    }
    ctx.globalAlpha = 1;

    // ── 2. Candle overlay ──
    if (opts.showCandles) {
      const allCandles = formingCandle ? [...candles, formingCandle] : candles;
      for (const c of allCandles) {
        const cStart = Math.max(c.startCol, startCol);
        const cEnd = Math.min(c.endCol, columns.length - 1);
        if (cEnd < startCol) continue;

        const x1 = l.heatX + (cStart - startCol) * colW;
        const x2 = l.heatX + (cEnd - startCol + 1) * colW;
        const cx = (x1 + x2) / 2;
        const bw = Math.max(3 * dpr, (x2 - x1) * 0.6);
        const up = c.close >= c.open;
        const bodyColor = up ? 'rgba(38,166,154,0.85)' : 'rgba(239,83,80,0.85)';
        const wickColor = up ? '#26a69a' : '#ef5350';

        const yO = priceToY(c.open, l.heatH);
        const yC = priceToY(c.close, l.heatH);
        const yH = priceToY(c.high, l.heatH);
        const yL = priceToY(c.low, l.heatH);

        // Wick
        ctx.strokeStyle = wickColor;
        ctx.lineWidth = Math.max(1, 1.2 * dpr);
        ctx.beginPath();
        ctx.moveTo(cx, yH);
        ctx.lineTo(cx, yL);
        ctx.stroke();

        // Body
        const bodyTop = Math.min(yO, yC);
        const bodyH = Math.max(1.5 * dpr, Math.abs(yO - yC));
        ctx.fillStyle = bodyColor;
        ctx.fillRect(cx - bw / 2, bodyTop, bw, bodyH);
      }
    }

    // ── 3. DOM ladder ──
    if (opts.showDOM && l.domW > 0) {
      drawDOM(ctx, l, ch, topP, botP);
    }

    // ── 4. Volume profile ──
    if (opts.showVolumeProfile && volProfile.size > 0) {
      let maxV = 0;
      for (const v of volProfile.values()) maxV = Math.max(maxV, v.buy + v.sell);
      if (maxV === 0) maxV = 1;

      for (const [pi, v] of volProfile) {
        const price = pi * opts.priceStep;
        if (price < botP || price > topP) continue;
        const y = priceToY(price, l.heatH);
        const total = v.buy + v.sell;
        const barW = (total / maxV) * l.profW;
        const buyW = (v.buy / total) * barW;

        ctx.fillStyle = 'rgba(38,166,154,0.5)';
        ctx.fillRect(l.profX, Math.round(y - ch / 2), buyW, Math.ceil(ch));
        ctx.fillStyle = 'rgba(239,83,80,0.5)';
        ctx.fillRect(l.profX + buyW, Math.round(y - ch / 2), barW - buyW, Math.ceil(ch));
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(l.profX, 0); ctx.lineTo(l.profX, l.heatH);
      ctx.stroke();
    }

    // ── 5. Axes ──
    drawAxes(ctx, l, topP, botP, startCol, colW);
  }

  // ── DOM Ladder ──

  function drawDOM(ctx: CanvasRenderingContext2D, l: ReturnType<typeof layout>, ch: number, topP: number, botP: number) {
    // Background
    ctx.fillStyle = 'rgba(6,10,28,0.95)';
    ctx.fillRect(0, 0, l.domW, l.heatH);

    const fs = Math.max(7 * dpr, Math.min(9 * dpr, ch * 0.75));
    ctx.font = `${fs}px monospace`;
    ctx.textBaseline = 'middle';

    const halfW = l.domW / 2;
    let maxBid = 1, maxAsk = 1;
    for (const b of latestBids) if (b.quantity > maxBid) maxBid = b.quantity;
    for (const a of latestAsks) if (a.quantity > maxAsk) maxAsk = a.quantity;

    // Build lookup
    const bidMap = new Map<number, number>();
    const askMap = new Map<number, number>();
    for (const b of latestBids) bidMap.set(Math.round(b.price / opts.priceStep), b.quantity);
    for (const a of latestAsks) askMap.set(Math.round(a.price / opts.priceStep), a.quantity);

    const step = Math.max(1, Math.round(1 / (ch / (12 * dpr))));
    const topIdx = Math.round(topP / opts.priceStep);
    const botIdx = Math.round(botP / opts.priceStep);

    for (let pi = topIdx; pi >= botIdx; pi -= step) {
      const price = pi * opts.priceStep;
      const y = priceToY(price, l.heatH);
      if (y < 0 || y > l.heatH) continue;

      const bq = bidMap.get(pi) || 0;
      const aq = askMap.get(pi) || 0;

      // Bid cell (left half)
      if (bq > 0) {
        const t = Math.min(1, bq / maxBid);
        ctx.fillStyle = domBidColor(t);
        ctx.globalAlpha = 0.3 + t * 0.7;
        ctx.fillRect(0, Math.round(y - ch * step / 2), halfW - 1, Math.ceil(ch * step));
        ctx.globalAlpha = 1;
        ctx.fillStyle = t > 0.6 ? '#e6edf3' : '#8892b0';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(bq).toString(), halfW - 4 * dpr, y);
      }

      // Ask cell (right half)
      if (aq > 0) {
        const t = Math.min(1, aq / maxAsk);
        ctx.fillStyle = domAskColor(t);
        ctx.globalAlpha = 0.3 + t * 0.7;
        ctx.fillRect(halfW + 1, Math.round(y - ch * step / 2), halfW - 1, Math.ceil(ch * step));
        ctx.globalAlpha = 1;
        ctx.fillStyle = t > 0.6 ? '#e6edf3' : '#8892b0';
        ctx.textAlign = 'left';
        ctx.fillText(Math.round(aq).toString(), halfW + 4 * dpr, y);
      }
    }

    // Center separator
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(halfW, 0); ctx.lineTo(halfW, l.heatH);
    ctx.stroke();

    // Current price row highlight
    const curY = priceToY(centerPrice, l.heatH);
    ctx.fillStyle = 'rgba(255,200,50,0.12)';
    ctx.fillRect(0, curY - ch * 1.5, l.domW, ch * 3);

    // Right border
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(l.domW, 0); ctx.lineTo(l.domW, l.heatH);
    ctx.stroke();

    // Column headers
    const hfs = Math.round(7 * dpr);
    ctx.font = `bold ${hfs}px monospace`;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#4a90d9';
    ctx.textAlign = 'center';
    ctx.fillText('BID', halfW / 2, 8 * dpr);
    ctx.fillStyle = '#d94a4a';
    ctx.fillText('ASK', halfW + halfW / 2, 8 * dpr);
    ctx.globalAlpha = 1;
  }

  // ── Axes ──

  function drawAxes(
    ctx: CanvasRenderingContext2D,
    l: ReturnType<typeof layout>,
    topP: number, botP: number,
    startCol: number, colW: number,
  ) {
    const fs = Math.round(8.5 * dpr);
    const decimals = opts.priceStep >= 1 ? 0 : 2;

    // Price axis bg
    ctx.fillStyle = 'rgba(6,10,28,0.94)';
    ctx.fillRect(l.paxX, 0, l.paxW, l.heatH);

    ctx.font = `${fs}px monospace`;
    ctx.fillStyle = opts.textColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const labelStep = Math.max(1, Math.round(opts.visibleLevels * 2 / 18)) * opts.priceStep;
    const roundedBot = Math.ceil(botP / labelStep) * labelStep;

    for (let p = roundedBot; p <= topP; p += labelStep) {
      const y = priceToY(p, l.heatH);
      ctx.fillStyle = opts.textColor;
      ctx.fillText(p.toFixed(decimals), l.paxX + l.paxW - 3 * dpr, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.025)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(l.heatX, y); ctx.lineTo(l.heatX + l.heatW, y);
      ctx.stroke();
    }

    // Current price marker
    const lastCol = columns[columns.length - 1];
    if (lastCol) {
      const curY = priceToY(lastCol.lastPrice, l.heatH);
      const up = lastCol.lastPrice >= centerPrice;
      ctx.fillStyle = up ? '#26a69a' : '#ef5350';
      ctx.fillRect(l.paxX, curY - 8 * dpr, l.paxW, 16 * dpr);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${fs}px monospace`;
      ctx.fillText(lastCol.lastPrice.toFixed(decimals), l.paxX + l.paxW - 3 * dpr, curY);

      // Dashed line across heatmap
      ctx.save();
      ctx.strokeStyle = up ? 'rgba(38,166,154,0.35)' : 'rgba(239,83,80,0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3 * dpr, 3 * dpr]);
      ctx.beginPath();
      ctx.moveTo(l.heatX, curY); ctx.lineTo(l.heatX + l.heatW, curY);
      ctx.stroke();
      ctx.restore();
    }

    // Time axis
    ctx.fillStyle = 'rgba(6,10,28,0.94)';
    ctx.fillRect(0, l.taxY, l.taxW, l.taxH);
    ctx.font = `${fs}px monospace`;
    ctx.fillStyle = opts.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const numLabels = Math.min(8, columns.length - startCol);
    if (numLabels > 1) {
      for (let i = 0; i < numLabels; i++) {
        const ci = startCol + Math.round((i / (numLabels - 1)) * (columns.length - startCol - 1));
        if (ci < 0 || ci >= columns.length) continue;
        const x = l.heatX + (ci - startCol) * colW + colW / 2;
        const d = new Date(columns[ci].timestamp);
        ctx.fillText(
          `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`,
          x, l.taxY + 5 * dpr,
        );
      }
    }

    // Borders
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(l.paxX, 0); ctx.lineTo(l.paxX, l.h);
    ctx.moveTo(0, l.taxY); ctx.lineTo(l.taxW, l.taxY);
    ctx.stroke();
  }

  // ── Data API ──

  function addSnapshot(s: OFSnapshot) {
    const cells = new Map<number, number>();
    for (const lvl of s.bids) {
      const idx = Math.round(lvl.price / opts.priceStep);
      cells.set(idx, (cells.get(idx) || 0) + lvl.quantity);
      if (lvl.quantity > maxQty * 0.35) maxQty = Math.max(maxQty, lvl.quantity * 1.4);
    }
    for (const lvl of s.asks) {
      const idx = Math.round(lvl.price / opts.priceStep);
      cells.set(idx, (cells.get(idx) || 0) + lvl.quantity);
      if (lvl.quantity > maxQty * 0.35) maxQty = Math.max(maxQty, lvl.quantity * 1.4);
    }

    const colIdx = columns.length;
    columns.push({ timestamp: s.timestamp, cells, lastPrice: s.lastPrice });

    // Update DOM ladder state
    latestBids = s.bids;
    latestAsks = s.asks;

    // Candle management
    if (!formingCandle) {
      formingCandle = { startCol: colIdx, endCol: colIdx, open: s.lastPrice, high: s.lastPrice, low: s.lastPrice, close: s.lastPrice };
      ticksInCandle = 1;
    } else {
      formingCandle.endCol = colIdx;
      formingCandle.close = s.lastPrice;
      formingCandle.high = Math.max(formingCandle.high, s.lastPrice);
      formingCandle.low = Math.min(formingCandle.low, s.lastPrice);
      ticksInCandle++;
    }

    if (ticksInCandle >= opts.ticksPerCandle) {
      candles.push(formingCandle!);
      formingCandle = null;
      ticksInCandle = 0;
    }

    // Trim
    if (columns.length > opts.maxColumns * 1.5) {
      const trim = columns.length - opts.maxColumns;
      columns.splice(0, trim);
      // Adjust candle indices
      for (let i = candles.length - 1; i >= 0; i--) {
        candles[i].startCol -= trim;
        candles[i].endCol -= trim;
        if (candles[i].endCol < 0) { candles.splice(0, i + 1); break; }
      }
      if (formingCandle) {
        formingCandle.startCol -= trim;
        formingCandle.endCol -= trim;
      }
    }

    centerPrice = s.lastPrice;
    draw();
  }

  function addTrade(t: OFTrade) {
    trades.push(t);
    const idx = Math.round(t.price / opts.priceStep);
    let vp = volProfile.get(idx);
    if (!vp) { vp = { buy: 0, sell: 0 }; volProfile.set(idx, vp); }
    if (t.side === 'buy') vp.buy += t.quantity; else vp.sell += t.quantity;
    if (trades.length > 5000) trades.splice(0, trades.length - 3000);
  }

  // ── Simulation ──

  function initWalls() {
    walls.clear();
    const base = Math.round(opts.basePrice / 50) * 50;
    for (let i = -6; i <= 6; i++) walls.set(base + i * 50, 120 + Math.random() * 350);
    for (let i = -3; i <= 3; i++) {
      const p = base + i * 100;
      walls.set(p, (walls.get(p) || 0) + 250 + Math.random() * 500);
    }
  }

  function simSnapshot(): OFSnapshot {
    const bids: OFLevel[] = [];
    const asks: OFLevel[] = [];
    for (let i = 1; i <= opts.visibleLevels; i++) {
      const bp = Math.round((simPrice - i * opts.priceStep) * 100) / 100;
      const ap = Math.round((simPrice + i * opts.priceStep) * 100) / 100;
      let bq = Math.max(1, (2 + Math.random() * 12) * Math.pow(i / 8, 0.5));
      let aq = Math.max(1, (2 + Math.random() * 12) * Math.pow(i / 8, 0.5));
      const br = Math.round(bp), ar = Math.round(ap);
      if (walls.has(br)) bq += walls.get(br)! * (0.5 + Math.random() * 0.9);
      if (walls.has(ar)) aq += walls.get(ar)! * (0.5 + Math.random() * 0.9);
      if (Math.random() < 0.02) bq *= 4 + Math.random() * 6;
      if (Math.random() < 0.02) aq *= 4 + Math.random() * 6;
      bids.push({ price: bp, quantity: bq });
      asks.push({ price: ap, quantity: aq });
    }
    return { timestamp: Date.now(), bids, asks, lastPrice: simPrice };
  }

  function simTrades(): OFTrade[] {
    const out: OFTrade[] = [];
    const n = Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const side: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell';
      let qty = 1 + Math.random() * 20;
      if (Math.random() < 0.035) qty = 60 + Math.random() * 200;
      out.push({
        timestamp: Date.now(),
        price: Math.round((simPrice + (Math.random() - 0.5) * opts.priceStep * 2) * 100) / 100,
        quantity: qty, side,
      });
    }
    return out;
  }

  function simTick() {
    simTrend += (Math.random() - 0.5) * 0.3;
    simTrend *= 0.93;
    simTrend -= (simPrice - opts.basePrice) * 0.0007;
    for (const [wp, wq] of walls) {
      if (Math.abs(simPrice - wp) < opts.priceStep * 4 && wq > 120) {
        simTrend += (simPrice > wp ? 1 : -1) * 0.2;
        walls.set(wp, wq * (0.92 + Math.random() * 0.06));
        if (wq < 30) walls.delete(wp);
      }
    }
    simPrice += simTrend + (Math.random() - 0.5) * opts.priceStep * 0.85;
    simPrice = Math.round(simPrice * 100) / 100;
    if (Math.random() < 0.01) {
      const np = Math.round(simPrice / 50) * 50 + (Math.random() > 0.5 ? 1 : -1) * 50 * Math.ceil(Math.random() * 3);
      if (!walls.has(np)) walls.set(np, 100 + Math.random() * 400);
    }
    addSnapshot(simSnapshot());
    for (const t of simTrades()) addTrade(t);
  }

  function startSimulation() {
    if (simTimer) return;
    initWalls();
    simPrice = opts.basePrice;
    simTrend = 0;
    simTimer = window.setInterval(simTick, opts.simulationSpeed);
  }

  function stopSimulation() {
    if (simTimer) { clearInterval(simTimer); simTimer = 0; }
  }

  if (opts.simulation) startSimulation();
  draw();

  return {
    addSnapshot,
    addTrade,
    startSimulation,
    stopSimulation,
    setOptions(o: Partial<OrderFlowOptions>) { opts = { ...opts, ...o }; draw(); },
    redraw: draw,
    resize() { sizeCanvas(); draw(); },
    dispose() { stopSimulation(); ro.disconnect(); canvas.remove(); },
  };
}
