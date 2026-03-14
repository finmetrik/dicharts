// ---------------------------------------------------------------------------
// DiCharts – Bookmap / Order Flow Liquidity Heatmap
// ---------------------------------------------------------------------------
// Renders a 2D heatmap of order book depth over time, with price line,
// volume dots (trade executions), and volume profile. Includes a built-in
// simulation mode for demo / testing.
// ---------------------------------------------------------------------------

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BookmapLevel {
  price: number;
  quantity: number;
}

export interface BookmapSnapshot {
  timestamp: number;
  bids: BookmapLevel[];
  asks: BookmapLevel[];
  lastPrice: number;
}

export interface BookmapTrade {
  timestamp: number;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
}

export interface BookmapOptions {
  /** Price level granularity (e.g., 1 = $1 per row). Default: 1. */
  priceStep?: number;
  /** Max visible columns (time slices). Default: 300. */
  maxColumns?: number;
  /** Number of price levels visible above/below center. Default: 50. */
  visibleLevels?: number;
  /** Show volume dots (trade execution bubbles). Default: true. */
  showVolumeDots?: boolean;
  /** Show volume profile on right side. Default: true. */
  showVolumeProfile?: boolean;
  /** Show price line overlay. Default: true. */
  showPriceLine?: boolean;
  /** Enable built-in mock simulation. Default: false. */
  simulation?: boolean;
  /** Simulation speed in ms per tick. Default: 120. */
  simulationSpeed?: number;
  /** Base price for simulation. Default: 30150. */
  basePrice?: number;
  /** Background color. Default: '#080c24'. */
  background?: string;
  /** Text / axis color. */
  textColor?: string;
}

export interface BookmapInstance {
  /** Feed a new order book snapshot. */
  addSnapshot(snapshot: BookmapSnapshot): void;
  /** Feed a trade execution. */
  addTrade(trade: BookmapTrade): void;
  /** Start the built-in simulation. */
  startSimulation(): void;
  /** Stop the built-in simulation. */
  stopSimulation(): void;
  /** Update options dynamically. */
  setOptions(opts: Partial<BookmapOptions>): void;
  /** Force redraw. */
  redraw(): void;
  /** Handle container resize. */
  resize(): void;
  /** Clean up. */
  dispose(): void;
}

// ─── Heat Color LUT (Bookmap-style thermal ramp) ────────────────────────────
// dark navy → blue → cyan → green → yellow → orange → red

const HEAT_STOPS: [number, number, number, number][] = [
  [0.00,  10,  14,  39],
  [0.08,  14,  30,  72],
  [0.18,  20,  75, 130],
  [0.30,  20, 140, 155],
  [0.42,  40, 185, 100],
  [0.55, 130, 210,  50],
  [0.68, 220, 200,  20],
  [0.80, 235, 150,  30],
  [0.90, 230,  90,  40],
  [1.00, 210,  55,  45],
];

function heatColor(t: number): string {
  t = Math.max(0, Math.min(1, t));
  let i = 0;
  while (i < HEAT_STOPS.length - 2 && HEAT_STOPS[i + 1][0] < t) i++;
  const [t0, r0, g0, b0] = HEAT_STOPS[i];
  const [t1, r1, g1, b1] = HEAT_STOPS[i + 1];
  const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
  return `rgb(${Math.round(r0 + (r1 - r0) * f)},${Math.round(g0 + (g1 - g0) * f)},${Math.round(b0 + (b1 - b0) * f)})`;
}

// Pre-compute 256 colors for O(1) lookup during render
const HEAT_LUT: string[] = [];
for (let i = 0; i < 256; i++) HEAT_LUT.push(heatColor(i / 255));

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createBookmap(container: HTMLElement, options: BookmapOptions = {}): BookmapInstance {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  container.appendChild(canvas);
  const cs = getComputedStyle(container);
  if (cs.position === 'static') container.style.position = 'relative';

  let opts = {
    priceStep:       options.priceStep       ?? 1,
    maxColumns:      options.maxColumns      ?? 300,
    visibleLevels:   options.visibleLevels   ?? 50,
    showVolumeDots:  options.showVolumeDots  !== false,
    showVolumeProfile: options.showVolumeProfile !== false,
    showPriceLine:   options.showPriceLine   !== false,
    simulation:      options.simulation      ?? false,
    simulationSpeed: options.simulationSpeed ?? 120,
    basePrice:       options.basePrice       ?? 30150,
    background:      options.background      ?? '#080c24',
    textColor:       options.textColor       ?? '#596882',
  };

  // ── Internal state ───────────────────────────────────────

  interface Column {
    timestamp: number;
    cells: Map<number, number>;   // priceIndex → quantity
    lastPrice: number;
  }

  const columns: Column[] = [];
  const allTrades: BookmapTrade[] = [];
  const volumeProfile = new Map<number, { buy: number; sell: number }>();
  let centerPrice = opts.basePrice;
  let maxQty = 100;
  let simTimer = 0;
  let simPrice = opts.basePrice;
  let simTrend = 0;
  let dpr = window.devicePixelRatio || 1;

  // ── Canvas sizing ────────────────────────────────────────

  function sizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    canvas.width  = Math.round(container.clientWidth  * dpr);
    canvas.height = Math.round(container.clientHeight * dpr);
  }
  sizeCanvas();
  const ro = new ResizeObserver(() => { sizeCanvas(); draw(); });
  ro.observe(container);

  // ── Layout regions ───────────────────────────────────────

  function layout() {
    const w = canvas.width, h = canvas.height;
    const profileW  = opts.showVolumeProfile ? Math.round(w * 0.09) : 0;
    const priceAxisW = Math.round(62 * dpr);
    const timeAxisH  = Math.round(24 * dpr);
    return {
      heatX: 0, heatY: 0,
      heatW: w - profileW - priceAxisW,
      heatH: h - timeAxisH,
      profX: w - profileW - priceAxisW, profW: profileW, profH: h - timeAxisH,
      paxX: w - priceAxisW, paxW: priceAxisW, paxH: h - timeAxisH,
      taxY: h - timeAxisH, taxW: w - priceAxisW, taxH: timeAxisH,
      w, h,
    };
  }

  // ── Price ↔ pixel helpers ────────────────────────────────

  function priceToY(price: number, l: ReturnType<typeof layout>) {
    const range = opts.visibleLevels * 2 * opts.priceStep;
    const top   = centerPrice + opts.visibleLevels * opts.priceStep;
    return l.heatY + ((top - price) / range) * l.heatH;
  }
  function cellH(l: ReturnType<typeof layout>) {
    return l.heatH / (opts.visibleLevels * 2);
  }

  // ── Draw ─────────────────────────────────────────────────

  function draw() {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const l = layout();

    // Background
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, l.w, l.h);
    if (columns.length === 0) {
      drawAxesEmpty(ctx, l);
      return;
    }

    const colW     = l.heatW / opts.maxColumns;
    const ch       = cellH(l);
    const topPrice = centerPrice + opts.visibleLevels * opts.priceStep;
    const botPrice = centerPrice - opts.visibleLevels * opts.priceStep;
    const startCol = Math.max(0, columns.length - opts.maxColumns);

    // ── Heatmap cells ──
    for (let ci = startCol; ci < columns.length; ci++) {
      const col = columns[ci];
      const x = (ci - startCol) * colW + l.heatX;
      // Slight age fade: newest = 1.0, oldest = 0.65
      const age = 1 - ((ci - startCol) / Math.max(1, columns.length - startCol - 1));
      const alpha = 0.65 + age * 0.35;

      for (const [priceIdx, qty] of col.cells) {
        const price = priceIdx * opts.priceStep;
        if (price < botPrice || price > topPrice) continue;
        const y = priceToY(price, l);
        const intensity = Math.min(1, qty / maxQty);
        if (intensity < 0.01) continue;
        const lutIdx = Math.min(255, Math.round(intensity * 255));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = HEAT_LUT[lutIdx];
        ctx.fillRect(Math.round(x), Math.round(y - ch / 2), Math.ceil(colW) + 1, Math.ceil(ch) + 1);
      }
    }
    ctx.globalAlpha = 1;

    // ── Price line ──
    if (opts.showPriceLine && columns.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 * dpr;
      ctx.shadowColor = 'rgba(255,255,255,0.4)';
      ctx.shadowBlur = 6 * dpr;
      ctx.beginPath();
      let first = true;
      for (let ci = startCol; ci < columns.length; ci++) {
        const x = (ci - startCol) * colW + l.heatX + colW / 2;
        const y = priceToY(columns[ci].lastPrice, l);
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // ── Volume dots ──
    if (opts.showVolumeDots && allTrades.length > 0) {
      const t0 = columns[startCol]?.timestamp ?? 0;
      const t1 = columns[columns.length - 1]?.timestamp ?? 0;
      const tRange = t1 - t0 || 1;

      for (const tr of allTrades) {
        if (tr.timestamp < t0 || tr.timestamp > t1) continue;
        if (tr.price < botPrice || tr.price > topPrice) continue;
        const x = l.heatX + ((tr.timestamp - t0) / tRange) * l.heatW;
        const y = priceToY(tr.price, l);
        const r = Math.max(2 * dpr, Math.min(10 * dpr, Math.sqrt(tr.quantity) * 1.2 * dpr));

        ctx.globalAlpha = 0.75;
        ctx.fillStyle = tr.side === 'buy' ? '#26a69a' : '#ef5350';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Glow for large trades
        if (tr.quantity > 80) {
          ctx.globalAlpha = 0.18;
          ctx.beginPath();
          ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    // ── Volume profile ──
    if (opts.showVolumeProfile && volumeProfile.size > 0) {
      let maxVol = 0;
      for (const v of volumeProfile.values()) maxVol = Math.max(maxVol, v.buy + v.sell);
      if (maxVol === 0) maxVol = 1;

      for (const [priceIdx, vol] of volumeProfile) {
        const price = priceIdx * opts.priceStep;
        if (price < botPrice || price > topPrice) continue;
        const y     = priceToY(price, l);
        const total = vol.buy + vol.sell;
        const barW  = (total / maxVol) * l.profW;
        const buyW  = (vol.buy / total) * barW;

        ctx.fillStyle = 'rgba(38,166,154,0.55)';
        ctx.fillRect(l.profX, Math.round(y - ch / 2), buyW, Math.ceil(ch));
        ctx.fillStyle = 'rgba(239,83,80,0.55)';
        ctx.fillRect(l.profX + buyW, Math.round(y - ch / 2), barW - buyW, Math.ceil(ch));
      }
      // Separator line
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(l.profX, 0);
      ctx.lineTo(l.profX, l.profH);
      ctx.stroke();
    }

    drawAxes(ctx, l, topPrice, botPrice, startCol);
  }

  function drawAxesEmpty(ctx: CanvasRenderingContext2D, l: ReturnType<typeof layout>) {
    const fs = Math.round(10 * dpr);
    ctx.fillStyle = opts.textColor;
    ctx.font = `${fs}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Waiting for data\u2026', l.w / 2, l.h / 2);
  }

  function drawAxes(
    ctx: CanvasRenderingContext2D,
    l: ReturnType<typeof layout>,
    topPrice: number, botPrice: number,
    startCol: number,
  ) {
    const fs = Math.round(9 * dpr);

    // ── Price axis background ──
    ctx.fillStyle = 'rgba(8,12,36,0.92)';
    ctx.fillRect(l.paxX, 0, l.paxW, l.paxH);

    ctx.font = `${fs}px monospace`;
    ctx.fillStyle = opts.textColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const decimals = opts.priceStep >= 1 ? 0 : 2;
    const labelStep = Math.max(1, Math.round(opts.visibleLevels * 2 / 16)) * opts.priceStep;
    const roundedBot = Math.ceil(botPrice / labelStep) * labelStep;

    for (let p = roundedBot; p <= topPrice; p += labelStep) {
      const y = priceToY(p, l);
      ctx.fillStyle = opts.textColor;
      ctx.fillText(p.toFixed(decimals), l.paxX + l.paxW - 4 * dpr, y);
      // Faint grid line
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(l.heatX, y);
      ctx.lineTo(l.heatX + l.heatW, y);
      ctx.stroke();
    }

    // Current price marker
    const lastCol = columns[columns.length - 1];
    if (lastCol) {
      const curY = priceToY(lastCol.lastPrice, l);
      const up = lastCol.lastPrice >= centerPrice;
      ctx.fillStyle = up ? '#26a69a' : '#ef5350';
      ctx.fillRect(l.paxX, curY - 9 * dpr, l.paxW, 18 * dpr);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fs}px monospace`;
      ctx.fillText(lastCol.lastPrice.toFixed(decimals), l.paxX + l.paxW - 4 * dpr, curY);
      // Dashed horizontal line across heatmap
      ctx.save();
      ctx.strokeStyle = up ? 'rgba(38,166,154,0.4)' : 'rgba(239,83,80,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3 * dpr, 3 * dpr]);
      ctx.beginPath();
      ctx.moveTo(l.heatX, curY);
      ctx.lineTo(l.heatX + l.heatW, curY);
      ctx.stroke();
      ctx.restore();
    }

    // ── Time axis ──
    ctx.fillStyle = 'rgba(8,12,36,0.92)';
    ctx.fillRect(0, l.taxY, l.taxW, l.taxH);

    ctx.font = `${fs}px monospace`;
    ctx.fillStyle = opts.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const colW = l.heatW / opts.maxColumns;
    const numLabels = Math.min(8, columns.length - startCol);
    if (numLabels > 1) {
      for (let i = 0; i < numLabels; i++) {
        const ci = startCol + Math.round((i / (numLabels - 1)) * (columns.length - startCol - 1));
        if (ci < 0 || ci >= columns.length) continue;
        const x = (ci - startCol) * colW + l.heatX + colW / 2;
        const d = new Date(columns[ci].timestamp);
        const label = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
        ctx.fillText(label, x, l.taxY + 6 * dpr);
      }
    }

    // Axis borders
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(l.paxX, 0); ctx.lineTo(l.paxX, l.h);
    ctx.moveTo(0, l.taxY);  ctx.lineTo(l.taxW, l.taxY);
    ctx.stroke();
  }

  // ── Data API ─────────────────────────────────────────────

  function addSnapshot(snapshot: BookmapSnapshot) {
    const cells = new Map<number, number>();
    for (const lvl of snapshot.bids) {
      const idx = Math.round(lvl.price / opts.priceStep);
      cells.set(idx, (cells.get(idx) || 0) + lvl.quantity);
      if (lvl.quantity > maxQty * 0.4) maxQty = Math.max(maxQty, lvl.quantity * 1.3);
    }
    for (const lvl of snapshot.asks) {
      const idx = Math.round(lvl.price / opts.priceStep);
      cells.set(idx, (cells.get(idx) || 0) + lvl.quantity);
      if (lvl.quantity > maxQty * 0.4) maxQty = Math.max(maxQty, lvl.quantity * 1.3);
    }
    columns.push({ timestamp: snapshot.timestamp, cells, lastPrice: snapshot.lastPrice });

    if (columns.length > opts.maxColumns * 1.5) {
      columns.splice(0, columns.length - opts.maxColumns);
    }
    centerPrice = snapshot.lastPrice;
    draw();
  }

  function addTrade(trade: BookmapTrade) {
    allTrades.push(trade);
    const idx = Math.round(trade.price / opts.priceStep);
    let vp = volumeProfile.get(idx);
    if (!vp) { vp = { buy: 0, sell: 0 }; volumeProfile.set(idx, vp); }
    if (trade.side === 'buy') vp.buy += trade.quantity; else vp.sell += trade.quantity;
    if (allTrades.length > 6000) allTrades.splice(0, allTrades.length - 4000);
  }

  // ── Simulation ───────────────────────────────────────────

  // Persistent liquidity walls at round numbers
  const walls = new Map<number, number>();

  function initWalls() {
    walls.clear();
    const base = Math.round(opts.basePrice / 50) * 50;
    // Walls at every $50
    for (let i = -5; i <= 5; i++) {
      walls.set(base + i * 50, 150 + Math.random() * 400);
    }
    // Heavier walls at every $100
    for (let i = -3; i <= 3; i++) {
      const p = base + i * 100;
      walls.set(p, (walls.get(p) || 0) + 300 + Math.random() * 600);
    }
  }

  function simGenSnapshot(): BookmapSnapshot {
    const bids: BookmapLevel[] = [];
    const asks: BookmapLevel[] = [];

    for (let i = 1; i <= opts.visibleLevels; i++) {
      const bidP = Math.round((simPrice - i * opts.priceStep) * 100) / 100;
      const askP = Math.round((simPrice + i * opts.priceStep) * 100) / 100;

      // Base: thin near spread, thicker further out
      let bidQ = Math.max(1, (3 + Math.random() * 15) * Math.pow(i / 8, 0.5));
      let askQ = Math.max(1, (3 + Math.random() * 15) * Math.pow(i / 8, 0.5));

      // Wall overlay
      const bidRound = Math.round(bidP);
      const askRound = Math.round(askP);
      if (walls.has(bidRound)) bidQ += walls.get(bidRound)! * (0.6 + Math.random() * 0.8);
      if (walls.has(askRound)) askQ += walls.get(askRound)! * (0.6 + Math.random() * 0.8);

      // Random spikes (spoofing)
      if (Math.random() < 0.025) bidQ *= 4 + Math.random() * 6;
      if (Math.random() < 0.025) askQ *= 4 + Math.random() * 6;

      bids.push({ price: bidP, quantity: bidQ });
      asks.push({ price: askP, quantity: askQ });
    }
    return { timestamp: Date.now(), bids, asks, lastPrice: simPrice };
  }

  function simGenTrades(): BookmapTrade[] {
    const out: BookmapTrade[] = [];
    const n = Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const side: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell';
      const offset = (Math.random() - 0.5) * opts.priceStep * 2;
      let qty = 1 + Math.random() * 25;
      if (Math.random() < 0.04) qty = 80 + Math.random() * 250; // large lot
      out.push({ timestamp: Date.now(), price: Math.round((simPrice + offset) * 100) / 100, quantity: qty, side });
    }
    return out;
  }

  function simTick() {
    // Momentum with mean reversion
    simTrend += (Math.random() - 0.5) * 0.35;
    simTrend *= 0.94;
    simTrend -= (simPrice - opts.basePrice) * 0.0008;

    // Wall bounce / absorption
    for (const [wp, wq] of walls) {
      const dist = Math.abs(simPrice - wp);
      if (dist < opts.priceStep * 4 && wq > 150) {
        simTrend += (simPrice > wp ? 1 : -1) * 0.25;
        walls.set(wp, wq * (0.93 + Math.random() * 0.05));
        if (wq < 40) walls.delete(wp);
      }
    }

    simPrice += simTrend + (Math.random() - 0.5) * opts.priceStep * 0.9;
    simPrice = Math.round(simPrice * 100) / 100;

    // Occasionally spawn new walls
    if (Math.random() < 0.012) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      const newP = Math.round(simPrice / 50) * 50 + dir * 50 * Math.ceil(Math.random() * 3);
      if (!walls.has(newP)) walls.set(newP, 120 + Math.random() * 500);
    }

    addSnapshot(simGenSnapshot());
    for (const t of simGenTrades()) addTrade(t);
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

  // Auto-start if configured
  if (opts.simulation) startSimulation();
  draw();

  // ── Public API ───────────────────────────────────────────

  return {
    addSnapshot,
    addTrade,
    startSimulation,
    stopSimulation,
    setOptions(newOpts: Partial<BookmapOptions>) {
      opts = { ...opts, ...newOpts };
      draw();
    },
    redraw: draw,
    resize() { sizeCanvas(); draw(); },
    dispose() {
      stopSimulation();
      ro.disconnect();
      canvas.remove();
    },
  };
}
