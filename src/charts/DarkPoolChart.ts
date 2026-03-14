// ---------------------------------------------------------------------------
// DiCharts – Dark Pool / Block Trade Visualization
// ---------------------------------------------------------------------------
// Renders institutional block trades (off-exchange "dark pool" prints) on a
// price timeline with a classified radar-screen aesthetic. Prints appear as
// glowing nodes sized by volume, colored by side, with faint connection webs
// between nearby prints. Includes cumulative flow bar, print summary panel,
// and built-in simulation mode.
// ---------------------------------------------------------------------------

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DarkPoolPrint {
  timestamp: number;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
}

export interface DarkPoolOptions {
  priceStep?: number;
  maxPrints?: number;
  visibleLevels?: number;
  showConnections?: boolean;
  showFlowBar?: boolean;
  showPrintSummary?: boolean;
  simulation?: boolean;
  simulationSpeed?: number;
  basePrice?: number;
  background?: string;
  textColor?: string;
}

export interface DarkPoolInstance {
  addPrint(print: DarkPoolPrint): void;
  startSimulation(): void;
  stopSimulation(): void;
  setOptions(opts: Partial<DarkPoolOptions>): void;
  redraw(): void;
  resize(): void;
  dispose(): void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BUY_COLOR  = '#00e5cc';
const BUY_DIM    = '#00bfa5';
const SELL_COLOR = '#ff6b6b';
const SELL_DIM   = '#ff4757';
const CONN_COLOR = 'rgba(100,140,200,0.08)';
const PRICE_LINE = '#8892b0';

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createDarkPool(container: HTMLElement, options: DarkPoolOptions = {}): DarkPoolInstance {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  container.appendChild(canvas);
  const cs = getComputedStyle(container);
  if (cs.position === 'static') container.style.position = 'relative';

  let opts = {
    priceStep:        options.priceStep        ?? 1,
    maxPrints:        options.maxPrints         ?? 600,
    visibleLevels:    options.visibleLevels     ?? 50,
    showConnections:  options.showConnections   !== false,
    showFlowBar:      options.showFlowBar       !== false,
    showPrintSummary: options.showPrintSummary  !== false,
    simulation:       options.simulation        ?? false,
    simulationSpeed:  options.simulationSpeed   ?? 120,
    basePrice:        options.basePrice         ?? 30150,
    background:       options.background        ?? '#030608',
    textColor:        options.textColor         ?? '#4a5578',
  };

  // ── Internal state ───────────────────────────────────────

  const prints: DarkPoolPrint[] = [];
  let centerPrice = opts.basePrice;
  let totalBuyVol  = 0;
  let totalSellVol = 0;
  let simTimer = 0;
  let simPrice = opts.basePrice;
  let simTrend = 0;
  let simBias  = 0;        // shifting buy/sell imbalance
  let dpr = window.devicePixelRatio || 1;
  let pulsePhase = 0;      // animation phase for mega prints

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
    const flowH      = opts.showFlowBar ? Math.round(20 * dpr) : 0;
    const summaryW   = opts.showPrintSummary ? Math.round(w * 0.15) : 0;
    const priceAxisW = Math.round(62 * dpr);
    const timeAxisH  = Math.round(24 * dpr);
    return {
      flowX: summaryW, flowY: 0, flowW: w - summaryW - priceAxisW, flowH,
      sumX: 0, sumY: 0, sumW: summaryW, sumH: h,
      chartX: summaryW, chartY: flowH,
      chartW: w - summaryW - priceAxisW,
      chartH: h - flowH - timeAxisH,
      paxX: w - priceAxisW, paxW: priceAxisW, paxH: h - timeAxisH,
      taxY: h - timeAxisH, taxW: w - priceAxisW, taxH: timeAxisH,
      w, h,
    };
  }

  // ── Price / time helpers ─────────────────────────────────

  function priceToY(price: number, l: ReturnType<typeof layout>) {
    const range = opts.visibleLevels * 2 * opts.priceStep;
    const top   = centerPrice + opts.visibleLevels * opts.priceStep;
    return l.chartY + ((top - price) / range) * l.chartH;
  }

  function timeToX(ts: number, l: ReturnType<typeof layout>) {
    if (prints.length < 2) return l.chartX + l.chartW / 2;
    const t0 = prints[0].timestamp;
    const t1 = prints[prints.length - 1].timestamp;
    const span = t1 - t0 || 1;
    return l.chartX + ((ts - t0) / span) * l.chartW;
  }

  // ── Print size helper ────────────────────────────────────

  function printRadius(qty: number): number {
    if (qty >= 500) return 12 * dpr;
    if (qty >= 80)  return 7 * dpr;
    if (qty >= 20)  return 4 * dpr;
    return 2.2 * dpr;
  }

  // ── Draw ─────────────────────────────────────────────────

  function draw() {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const l = layout();
    pulsePhase = (pulsePhase + 0.08) % (Math.PI * 2);

    // Background
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, l.w, l.h);

    if (prints.length === 0) {
      const fs = Math.round(10 * dpr);
      ctx.fillStyle = opts.textColor;
      ctx.font = `${fs}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Awaiting dark pool data\u2026', l.chartX + l.chartW / 2, l.chartY + l.chartH / 2);
      return;
    }

    drawRadarGrid(ctx, l);
    if (opts.showConnections) drawConnections(ctx, l);
    drawPriceLine(ctx, l);
    drawPrints(ctx, l);
    drawFlowArrows(ctx, l);
    if (opts.showFlowBar) drawFlowBar(ctx, l);
    drawAxes(ctx, l);
    if (opts.showPrintSummary) drawSummaryPanel(ctx, l);
  }

  // ── Radar grid ───────────────────────────────────────────

  function drawRadarGrid(ctx: CanvasRenderingContext2D, l: ReturnType<typeof layout>) {
    const cx = l.chartX + l.chartW / 2;
    const cy = l.chartY + l.chartH / 2;
    const maxR = Math.hypot(l.chartW, l.chartH) / 2;
    ctx.strokeStyle = 'rgba(60,80,120,0.06)';
    ctx.lineWidth = 1;
    for (let r = 60 * dpr; r < maxR; r += 60 * dpr) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Cross-hairs
    ctx.strokeStyle = 'rgba(60,80,120,0.04)';
    ctx.beginPath();
    ctx.moveTo(l.chartX, cy); ctx.lineTo(l.chartX + l.chartW, cy);
    ctx.moveTo(cx, l.chartY); ctx.lineTo(cx, l.chartY + l.chartH);
    ctx.stroke();
  }

  // ── Connection lines ─────────────────────────────────────

  function drawConnections(ctx: CanvasRenderingContext2D, l: ReturnType<typeof layout>) {
    const priceThr = 3 * opts.priceStep;
    const timeThr  = prints.length > 10 ? (prints[prints.length - 1].timestamp - prints[0].timestamp) / (prints.length / 10) : Infinity;

    ctx.strokeStyle = CONN_COLOR;
    ctx.lineWidth = 1;
    // Only check recent prints for performance
    const start = Math.max(0, prints.length - 120);
    for (let i = start; i < prints.length; i++) {
      const a = prints[i];
      const ax = timeToX(a.timestamp, l);
      const ay = priceToY(a.price, l);
      for (let j = i + 1; j < prints.length; j++) {
        const b = prints[j];
        if (b.timestamp - a.timestamp > timeThr) break;
        if (Math.abs(b.price - a.price) > priceThr) continue;
        const bx = timeToX(b.timestamp, l);
        const by = priceToY(b.price, l);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    }
  }

  // ── Price line ───────────────────────────────────────────

  function drawPriceLine(ctx: CanvasRenderingContext2D, l: ReturnType<typeof layout>) {
    if (prints.length < 2) return;
    // Build unique price snapshots in time order
    ctx.save();
    ctx.strokeStyle = PRICE_LINE;
    ctx.lineWidth = 1.5 * dpr;
    ctx.shadowColor = 'rgba(136,146,176,0.35)';
    ctx.shadowBlur = 6 * dpr;
    ctx.beginPath();
    let first = true;
    let lastTs = -1;
    for (const p of prints) {
      if (p.timestamp === lastTs) continue;
      lastTs = p.timestamp;
      const x = timeToX(p.timestamp, l);
      const y = priceToY(p.price, l);
      if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ── Print nodes ──────────────────────────────────────────

  function drawPrints(ctx: CanvasRenderingContext2D, l: ReturnType<typeof layout>) {
    const topP = centerPrice + opts.visibleLevels * opts.priceStep;
    const botP = centerPrice - opts.visibleLevels * opts.priceStep;

    for (const p of prints) {
      if (p.price < botP || p.price > topP) continue;
      const x = timeToX(p.timestamp, l);
      const y = priceToY(p.price, l);
      const r = printRadius(p.quantity);
      const isBuy = p.side === 'buy';
      const base  = isBuy ? BUY_COLOR : SELL_COLOR;
      const dim   = isBuy ? BUY_DIM   : SELL_DIM;

      // Outer glow for large prints
      if (p.quantity >= 80) {
        ctx.save();
        ctx.shadowColor = base;
        ctx.shadowBlur = (p.quantity >= 500 ? 22 : 12) * dpr;
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Glow ring
        ctx.globalAlpha = p.quantity >= 500 ? 0.25 + Math.sin(pulsePhase) * 0.1 : 0.18;
        ctx.strokeStyle = base;
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
        ctx.stroke();

        // Double glow for mega prints
        if (p.quantity >= 500) {
          ctx.globalAlpha = 0.1 + Math.sin(pulsePhase + 1) * 0.05;
          ctx.beginPath();
          ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Main dot
      ctx.save();
      ctx.shadowColor = base;
      ctx.shadowBlur = (p.quantity >= 80 ? 8 : 3) * dpr;
      ctx.fillStyle = p.quantity >= 80 ? base : dim;
      ctx.globalAlpha = p.quantity >= 20 ? 0.85 : 0.55;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  // ── Flow arrows (clusters of large prints) ───────────────

  function drawFlowArrows(ctx: CanvasRenderingContext2D, l: ReturnType<typeof layout>) {
    // Scan recent prints for clusters at same level
    if (prints.length < 5) return;
    const recent = prints.slice(-60);
    const buckets = new Map<number, { buy: number; sell: number; x: number; y: number; count: number }>();

    for (const p of recent) {
      if (p.quantity < 40) continue;
      const key = Math.round(p.price / (opts.priceStep * 3));
      let b = buckets.get(key);
      if (!b) { b = { buy: 0, sell: 0, x: 0, y: 0, count: 0 }; buckets.set(key, b); }
      if (p.side === 'buy') b.buy += p.quantity; else b.sell += p.quantity;
      b.x += timeToX(p.timestamp, l);
      b.y += priceToY(p.price, l);
      b.count++;
    }

    for (const b of buckets.values()) {
      if (b.count < 3) continue;
      const cx = b.x / b.count;
      const cy = b.y / b.count;
      const isBuy = b.buy > b.sell;
      const dir = isBuy ? -1 : 1; // up for buy, down for sell
      const sz = 6 * dpr;

      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = isBuy ? BUY_COLOR : SELL_COLOR;
      ctx.beginPath();
      ctx.moveTo(cx, cy + dir * sz * 2);
      ctx.lineTo(cx - sz, cy + dir * sz * 0.5);
      ctx.lineTo(cx + sz, cy + dir * sz * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Flow bar ─────────────────────────────────────────────

  function drawFlowBar(ctx: CanvasRenderingContext2D, l: ReturnType<typeof layout>) {
    const total = totalBuyVol + totalSellVol;
    if (total === 0) return;

    // Background
    ctx.fillStyle = 'rgba(10,14,24,0.9)';
    ctx.fillRect(l.flowX, l.flowY, l.flowW, l.flowH);

    const buyPct = totalBuyVol / total;
    const buyW = buyPct * l.flowW;

    // Buy side
    ctx.fillStyle = BUY_DIM;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(l.flowX, l.flowY + 2 * dpr, buyW, l.flowH - 4 * dpr);

    // Sell side
    ctx.fillStyle = SELL_DIM;
    ctx.fillRect(l.flowX + buyW, l.flowY + 2 * dpr, l.flowW - buyW, l.flowH - 4 * dpr);
    ctx.globalAlpha = 1;

    // Labels
    const fs = Math.round(8 * dpr);
    ctx.font = `bold ${fs}px monospace`;
    ctx.textBaseline = 'middle';
    const midY = l.flowY + l.flowH / 2;

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`BUY ${(buyPct * 100).toFixed(1)}%`, l.flowX + 4 * dpr, midY);
    ctx.textAlign = 'right';
    ctx.fillText(`${((1 - buyPct) * 100).toFixed(1)}% SELL`, l.flowX + l.flowW - 4 * dpr, midY);

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(l.flowX, l.flowY + l.flowH);
    ctx.lineTo(l.flowX + l.flowW, l.flowY + l.flowH);
    ctx.stroke();
  }

  // ── Axes ─────────────────────────────────────────────────

  function drawAxes(ctx: CanvasRenderingContext2D, l: ReturnType<typeof layout>) {
    const fs = Math.round(9 * dpr);
    const topP = centerPrice + opts.visibleLevels * opts.priceStep;
    const botP = centerPrice - opts.visibleLevels * opts.priceStep;

    // Price axis background
    ctx.fillStyle = 'rgba(3,6,8,0.92)';
    ctx.fillRect(l.paxX, 0, l.paxW, l.paxH);

    ctx.font = `${fs}px monospace`;
    ctx.fillStyle = opts.textColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const decimals = opts.priceStep >= 1 ? 0 : 2;
    const labelStep = Math.max(1, Math.round(opts.visibleLevels * 2 / 16)) * opts.priceStep;
    const roundedBot = Math.ceil(botP / labelStep) * labelStep;

    for (let p = roundedBot; p <= topP; p += labelStep) {
      const y = priceToY(p, l);
      ctx.fillStyle = opts.textColor;
      ctx.fillText(p.toFixed(decimals), l.paxX + l.paxW - 4 * dpr, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.025)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(l.chartX, y);
      ctx.lineTo(l.chartX + l.chartW, y);
      ctx.stroke();
    }

    // Current price marker
    const lastPrint = prints[prints.length - 1];
    if (lastPrint) {
      const curY = priceToY(lastPrint.price, l);
      const isBuy = lastPrint.side === 'buy';
      ctx.fillStyle = isBuy ? BUY_DIM : SELL_DIM;
      ctx.fillRect(l.paxX, curY - 9 * dpr, l.paxW, 18 * dpr);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fs}px monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(lastPrint.price.toFixed(decimals), l.paxX + l.paxW - 4 * dpr, curY);

      ctx.save();
      ctx.strokeStyle = isBuy ? 'rgba(0,229,204,0.3)' : 'rgba(255,107,107,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3 * dpr, 3 * dpr]);
      ctx.beginPath();
      ctx.moveTo(l.chartX, curY);
      ctx.lineTo(l.chartX + l.chartW, curY);
      ctx.stroke();
      ctx.restore();
    }

    // Time axis
    ctx.fillStyle = 'rgba(3,6,8,0.92)';
    ctx.fillRect(0, l.taxY, l.taxW, l.taxH);

    ctx.font = `${fs}px monospace`;
    ctx.fillStyle = opts.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const numLabels = Math.min(8, prints.length);
    if (numLabels > 1) {
      for (let i = 0; i < numLabels; i++) {
        const pi = Math.round((i / (numLabels - 1)) * (prints.length - 1));
        const x = timeToX(prints[pi].timestamp, l);
        const d = new Date(prints[pi].timestamp);
        const label = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
        ctx.fillText(label, x, l.taxY + 6 * dpr);
      }
    }

    // Axis borders
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(l.paxX, 0); ctx.lineTo(l.paxX, l.h);
    ctx.moveTo(0, l.taxY); ctx.lineTo(l.taxW, l.taxY);
    ctx.stroke();
  }

  // ── Summary panel ────────────────────────────────────────

  function drawSummaryPanel(ctx: CanvasRenderingContext2D, l: ReturnType<typeof layout>) {
    // Background
    ctx.fillStyle = 'rgba(3,6,8,0.95)';
    ctx.fillRect(l.sumX, l.sumY, l.sumW, l.sumH);

    // Separator
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(l.sumW, 0);
    ctx.lineTo(l.sumW, l.sumH);
    ctx.stroke();

    // Title
    const fsTitle = Math.round(9 * dpr);
    const fsBody  = Math.round(8 * dpr);
    const pad = 8 * dpr;
    ctx.font = `bold ${fsTitle}px monospace`;
    ctx.fillStyle = '#5a6a90';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('DARK POOL', pad, pad);
    ctx.fillText('PRINTS', pad, pad + fsTitle + 2 * dpr);

    // Recent large prints
    const large = prints.filter(p => p.quantity >= 40).slice(-12).reverse();
    ctx.font = `${fsBody}px monospace`;
    let yOff = pad + fsTitle * 2 + 12 * dpr;
    const lineH = fsBody + 4 * dpr;

    for (const p of large) {
      if (yOff + lineH > l.sumH - pad) break;
      const isBuy = p.side === 'buy';
      const sideTag = isBuy ? 'B' : 'S';
      const color = isBuy ? BUY_COLOR : SELL_COLOR;

      // Side indicator dot
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(pad + 3 * dpr, yOff + fsBody / 2, 2 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Text
      ctx.fillStyle = color;
      ctx.fillText(sideTag, pad + 8 * dpr, yOff);
      ctx.fillStyle = '#7a8ab0';
      const qty = p.quantity >= 1000 ? `${(p.quantity / 1000).toFixed(1)}k` : Math.round(p.quantity).toString();
      ctx.fillText(`${qty.padStart(5)} @ ${p.price.toFixed(0)}`, pad + 16 * dpr, yOff);
      yOff += lineH;
    }
  }

  // ── Data API ─────────────────────────────────────────────

  function addPrint(print: DarkPoolPrint) {
    prints.push(print);
    if (print.side === 'buy') totalBuyVol += print.quantity;
    else totalSellVol += print.quantity;

    if (prints.length > opts.maxPrints * 1.5) {
      // Recalculate totals after trimming
      const removed = prints.splice(0, prints.length - opts.maxPrints);
      for (const r of removed) {
        if (r.side === 'buy') totalBuyVol -= r.quantity;
        else totalSellVol -= r.quantity;
      }
      totalBuyVol  = Math.max(0, totalBuyVol);
      totalSellVol = Math.max(0, totalSellVol);
    }
    centerPrice = print.price;
    draw();
  }

  // ── Simulation ───────────────────────────────────────────

  function simTick() {
    // Momentum with mean reversion
    simTrend += (Math.random() - 0.5) * 0.35;
    simTrend *= 0.94;
    simTrend -= (simPrice - opts.basePrice) * 0.0008;

    simPrice += simTrend + (Math.random() - 0.5) * opts.priceStep * 0.9;
    simPrice = Math.round(simPrice * 100) / 100;

    // Shift institutional bias over time
    simBias += (Math.random() - 0.5) * 0.02;
    simBias = Math.max(-0.3, Math.min(0.3, simBias));
    const buyProb = 0.5 + simBias;

    // Generate 0-4 prints per tick
    const n = Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const side: 'buy' | 'sell' = Math.random() < buyProb ? 'buy' : 'sell';
      const offset = (Math.random() - 0.5) * opts.priceStep * 20;
      const price = Math.round((simPrice + offset) * 100) / 100;

      // Quantity distribution: most small, some medium, few large, rare mega
      let quantity: number;
      const roll = Math.random();
      if (roll < 0.55) {
        quantity = 1 + Math.random() * 19;                // small
      } else if (roll < 0.82) {
        quantity = 20 + Math.random() * 60;               // medium
      } else if (roll < 0.96) {
        quantity = 80 + Math.random() * 420;              // large block
      } else {
        quantity = 500 + Math.random() * 1500;            // mega
      }

      addPrint({ timestamp: Date.now(), price, quantity, side });
    }
  }

  function startSimulation() {
    if (simTimer) return;
    simPrice = opts.basePrice;
    simTrend = 0;
    simBias  = 0;
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
    addPrint,
    startSimulation,
    stopSimulation,
    setOptions(newOpts: Partial<DarkPoolOptions>) {
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
