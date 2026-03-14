// ---------------------------------------------------------------------------
// DiCharts – Market Profile (TPO) Chart
// ---------------------------------------------------------------------------
// Renders a Time Price Opportunity chart showing where price spent the most
// time during a session. Letters stack horizontally at each price level,
// creating the distinctive sideways bell-curve distribution that traders use
// to identify value areas and points of control.
// ---------------------------------------------------------------------------

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TPOPeriod {
  label: string;         // 'A', 'B', 'C', etc.
  priceLevels: number[]; // prices visited during this period
}

export interface MarketProfileData {
  periods: TPOPeriod[];
  priceStep: number;
  lastPrice: number;
}

export interface MarketProfileOptions {
  priceStep?: number;
  visibleLevels?: number;
  simulation?: boolean;
  simulationSpeed?: number;
  basePrice?: number;
  background?: string;
  textColor?: string;
}

export interface MarketProfileInstance {
  addPeriod(period: TPOPeriod): void;
  startSimulation(): void;
  stopSimulation(): void;
  setOptions(opts: Partial<MarketProfileOptions>): void;
  redraw(): void;
  resize(): void;
  dispose(): void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWX';

const COLORS = {
  background:   '#0c0f1a',
  tpoInside:    '#64b5f6',
  tpoOutside:   '#37474f',
  poc:          '#ffd600',
  pocGlow:      'rgba(255,214,0,0.35)',
  vaBackground: 'rgba(100,181,246,0.06)',
  vaLine:       'rgba(100,181,246,0.3)',
  ibBackground: 'rgba(255,171,64,0.08)',
  ibBorder:     '#ffab40',
  singlePrint:  'rgba(255,255,255,0.03)',
  text:         '#5a6b8a',
};

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createMarketProfile(
  container: HTMLElement,
  options: MarketProfileOptions = {},
): MarketProfileInstance {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  container.appendChild(canvas);
  const cs = getComputedStyle(container);
  if (cs.position === 'static') container.style.position = 'relative';

  let opts = {
    priceStep:       options.priceStep       ?? 1,
    visibleLevels:   options.visibleLevels   ?? 60,
    simulation:      options.simulation      ?? false,
    simulationSpeed: options.simulationSpeed ?? 80,
    basePrice:       options.basePrice       ?? 4500,
    background:      options.background      ?? COLORS.background,
    textColor:       options.textColor       ?? COLORS.text,
  };

  // ── State ──────────────────────────────────────────────
  const periods: TPOPeriod[] = [];
  const tpoGrid = new Map<number, string[]>(); // priceIndex -> period labels
  let lastPrice = opts.basePrice;
  let simTimer = 0;
  let simPrice = opts.basePrice;
  let simPeriodIdx = 0;
  let simTickInPeriod = 0;
  let simMean = opts.basePrice;
  let dpr = window.devicePixelRatio || 1;

  // ── Canvas sizing ──────────────────────────────────────
  function sizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    canvas.width  = Math.round(container.clientWidth  * dpr);
    canvas.height = Math.round(container.clientHeight * dpr);
  }
  sizeCanvas();
  const ro = new ResizeObserver(() => { sizeCanvas(); draw(); });
  ro.observe(container);

  // ── Layout ─────────────────────────────────────────────
  function layout() {
    const w = canvas.width, h = canvas.height;
    const headerH = Math.round(44 * dpr);
    const paxW = Math.round(70 * dpr);
    const left = Math.round(20 * dpr);
    return {
      headerW: w, headerH,
      profileX: left, profileY: headerH, profileW: w - left - paxW, profileH: h - headerH,
      paxX: w - paxW, paxW, paxY: headerH, paxH: h - headerH,
      w, h,
    };
  }

  // ── Analysis ───────────────────────────────────────────
  function computeAnalysis() {
    const counts = new Map<number, number>();
    let totalTPOs = 0;
    for (const [idx, letters] of tpoGrid) { counts.set(idx, letters.length); totalTPOs += letters.length; }
    if (counts.size === 0) return null;

    // POC: price index with the most TPOs
    let pocIdx = 0, pocCount = 0;
    for (const [idx, c] of counts) if (c > pocCount) { pocCount = c; pocIdx = idx; }

    // Value Area: 70% of TPOs centered around POC, expanding outward
    const target = Math.round(totalTPOs * 0.7);
    let vaTPOs = pocCount, vaHighIdx = pocIdx, vaLowIdx = pocIdx;
    const sorted = [...counts.keys()].sort((a, b) => a - b);
    let above = sorted.indexOf(pocIdx) + 1, below = sorted.indexOf(pocIdx) - 1;
    while (vaTPOs < target && (above < sorted.length || below >= 0)) {
      const ac = above < sorted.length ? (counts.get(sorted[above]) || 0) : 0;
      const bc = below >= 0 ? (counts.get(sorted[below]) || 0) : 0;
      if (ac >= bc && above < sorted.length) { vaTPOs += ac; vaHighIdx = sorted[above++]; }
      else if (below >= 0) { vaTPOs += bc; vaLowIdx = sorted[below--]; }
      else break;
    }
    if (vaHighIdx < vaLowIdx) [vaHighIdx, vaLowIdx] = [vaLowIdx, vaHighIdx];

    // Initial Balance: range of periods A and B
    let ibHigh = -Infinity, ibLow = Infinity;
    for (const p of periods) {
      if (p.label !== 'A' && p.label !== 'B') continue;
      for (const price of p.priceLevels) {
        const idx = Math.round(price / opts.priceStep);
        ibHigh = Math.max(ibHigh, idx); ibLow = Math.min(ibLow, idx);
      }
    }
    if (ibHigh === -Infinity) { ibHigh = pocIdx; ibLow = pocIdx; }

    const singlePrints = new Set<number>();
    for (const [idx, c] of counts) if (c === 1) singlePrints.add(idx);

    return { pocIdx, pocCount, vaHighIdx, vaLowIdx, ibHigh, ibLow, counts, singlePrints };
  }

  // ── Price / Y helpers ──────────────────────────────────
  type Range = { minIdx: number; maxIdx: number };
  type L = ReturnType<typeof layout>;

  function priceRange(): Range {
    if (tpoGrid.size === 0) {
      const c = Math.round(lastPrice / opts.priceStep);
      return { minIdx: c - opts.visibleLevels, maxIdx: c + opts.visibleLevels };
    }
    const idxs = [...tpoGrid.keys()];
    const min = Math.min(...idxs), max = Math.max(...idxs);
    const pad = Math.max(5, Math.round((max - min) * 0.12));
    return { minIdx: min - pad, maxIdx: max + pad };
  }

  function idxToY(idx: number, l: L, r: Range) {
    return l.profileY + l.profileH - ((idx - r.minIdx) / (r.maxIdx - r.minIdx || 1)) * l.profileH;
  }

  function levelH(l: L, r: Range) { return l.profileH / (r.maxIdx - r.minIdx || 1); }

  // ── Draw ───────────────────────────────────────────────
  function draw() {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const l = layout();
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, l.w, l.h);

    const analysis = computeAnalysis();
    if (!analysis) {
      const fs = Math.round(10 * dpr);
      ctx.fillStyle = opts.textColor; ctx.font = `${fs}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Waiting for data\u2026', l.w / 2, l.h / 2);
      return;
    }

    const range = priceRange();
    const lh = levelH(l, range);
    const fs = Math.round(Math.min(10 * dpr, Math.max(6 * dpr, lh * 0.85)));
    const letterW = fs * 0.62;

    // Value Area background band
    const vaTopY = idxToY(analysis.vaHighIdx, l, range) - lh / 2;
    const vaBotY = idxToY(analysis.vaLowIdx, l, range) + lh / 2;
    ctx.fillStyle = COLORS.vaBackground;
    ctx.fillRect(l.profileX, vaTopY, l.profileW, vaBotY - vaTopY);

    // Initial Balance band
    const ibTopY = idxToY(analysis.ibHigh, l, range) - lh / 2;
    const ibBotY = idxToY(analysis.ibLow, l, range) + lh / 2;
    ctx.fillStyle = COLORS.ibBackground;
    ctx.fillRect(l.profileX, ibTopY, l.profileW, ibBotY - ibTopY);
    ctx.save();
    ctx.strokeStyle = COLORS.ibBorder; ctx.lineWidth = 1;
    ctx.setLineDash([4 * dpr, 3 * dpr]);
    ctx.beginPath();
    ctx.moveTo(l.profileX, ibTopY); ctx.lineTo(l.profileX + l.profileW, ibTopY);
    ctx.moveTo(l.profileX, ibBotY); ctx.lineTo(l.profileX + l.profileW, ibBotY);
    ctx.stroke(); ctx.restore();

    // Single print highlights
    for (const idx of analysis.singlePrints) {
      ctx.fillStyle = COLORS.singlePrint;
      ctx.fillRect(l.profileX, idxToY(idx, l, range) - lh / 2, l.profileW, lh);
    }

    // TPO Letters
    ctx.font = `${fs}px monospace`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    for (const [idx, letters] of tpoGrid) {
      const y = idxToY(idx, l, range);
      ctx.fillStyle = (idx >= analysis.vaLowIdx && idx <= analysis.vaHighIdx) ? COLORS.tpoInside : COLORS.tpoOutside;
      for (let i = 0; i < letters.length; i++) {
        const x = l.profileX + i * letterW;
        if (x + letterW > l.profileX + l.profileW) break;
        ctx.fillText(letters[i], x, y);
      }
    }

    // VA High / VA Low dashed lines
    ctx.save();
    ctx.strokeStyle = COLORS.vaLine; ctx.lineWidth = 1 * dpr;
    ctx.setLineDash([6 * dpr, 4 * dpr]);
    ctx.beginPath();
    ctx.moveTo(l.profileX, vaTopY); ctx.lineTo(l.profileX + l.profileW, vaTopY);
    ctx.moveTo(l.profileX, vaBotY); ctx.lineTo(l.profileX + l.profileW, vaBotY);
    ctx.stroke(); ctx.restore();

    // POC line with glow
    const pocY = idxToY(analysis.pocIdx, l, range);
    ctx.save();
    ctx.strokeStyle = COLORS.poc; ctx.lineWidth = 2 * dpr;
    ctx.shadowColor = COLORS.pocGlow; ctx.shadowBlur = 12 * dpr;
    ctx.beginPath(); ctx.moveTo(l.profileX, pocY); ctx.lineTo(l.profileX + l.profileW, pocY);
    ctx.stroke(); ctx.stroke(); // double-stroke for stronger glow
    ctx.restore();

    drawPriceAxis(ctx, l, range, analysis);
    drawHeader(ctx, l, analysis);
  }

  // ── Price Axis ─────────────────────────────────────────
  function drawPriceAxis(
    ctx: CanvasRenderingContext2D, l: L, range: Range,
    analysis: NonNullable<ReturnType<typeof computeAnalysis>>,
  ) {
    const fs = Math.round(9 * dpr);
    const dec = opts.priceStep >= 1 ? 0 : 2;
    const rx = l.paxX + l.paxW - 4 * dpr;

    // Background + separator
    ctx.fillStyle = 'rgba(12,15,26,0.92)';
    ctx.fillRect(l.paxX, l.paxY, l.paxW, l.paxH);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(l.paxX, l.paxY); ctx.lineTo(l.paxX, l.paxY + l.paxH); ctx.stroke();

    // Price labels + grid
    ctx.font = `${fs}px monospace`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const step = Math.max(1, Math.round((range.maxIdx - range.minIdx) / 20));
    for (let idx = range.minIdx; idx <= range.maxIdx; idx += step) {
      const y = idxToY(idx, l, range);
      ctx.fillStyle = opts.textColor;
      ctx.fillText((idx * opts.priceStep).toFixed(dec), rx, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.025)';
      ctx.beginPath(); ctx.moveTo(l.profileX, y); ctx.lineTo(l.profileX + l.profileW, y); ctx.stroke();
    }

    // POC label on axis
    ctx.fillStyle = COLORS.poc; ctx.font = `bold ${fs}px monospace`;
    ctx.fillText((analysis.pocIdx * opts.priceStep).toFixed(dec), rx, idxToY(analysis.pocIdx, l, range));

    // Current price marker with arrow
    const curY = idxToY(Math.round(lastPrice / opts.priceStep), l, range);
    const mh = Math.round(16 * dpr);
    ctx.fillStyle = '#26a69a';
    ctx.fillRect(l.paxX, curY - mh / 2, l.paxW, mh);
    ctx.beginPath(); ctx.moveTo(l.paxX, curY);
    ctx.lineTo(l.paxX + 6 * dpr, curY - 5 * dpr);
    ctx.lineTo(l.paxX + 6 * dpr, curY + 5 * dpr);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = `bold ${fs}px monospace`;
    ctx.fillText(lastPrice.toFixed(dec), rx, curY);
  }

  // ── Session Header ─────────────────────────────────────
  function drawHeader(
    ctx: CanvasRenderingContext2D, l: L,
    analysis: NonNullable<ReturnType<typeof computeAnalysis>>,
  ) {
    const fs = Math.round(10 * dpr), sfs = Math.round(9 * dpr);
    const dec = opts.priceStep >= 1 ? 0 : 2;
    const fmt = (idx: number) => (idx * opts.priceStep).toFixed(dec);

    ctx.fillStyle = 'rgba(12,15,26,0.95)';
    ctx.fillRect(0, 0, l.headerW, l.headerH);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, l.headerH); ctx.lineTo(l.headerW, l.headerH); ctx.stroke();

    const y = l.headerH / 2;
    let x = Math.round(12 * dpr);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';

    // Date
    ctx.font = `bold ${fs}px monospace`; ctx.fillStyle = '#8899b4';
    const d = new Date();
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    ctx.fillText(ds, x, y);
    x += ctx.measureText(ds).width + 20 * dpr;

    // Stats: POC, VAH, VAL, IB
    const stats: [string, string, string][] = [
      ['POC', fmt(analysis.pocIdx), COLORS.poc],
      ['VAH', fmt(analysis.vaHighIdx), COLORS.tpoInside],
      ['VAL', fmt(analysis.vaLowIdx), COLORS.tpoInside],
      ['IB', `${fmt(analysis.ibLow)}-${fmt(analysis.ibHigh)}`, COLORS.ibBorder],
    ];
    for (const [label, value, color] of stats) {
      ctx.font = `${sfs}px monospace`; ctx.fillStyle = opts.textColor;
      ctx.fillText(label, x, y);
      x += ctx.measureText(label).width + 4 * dpr;
      ctx.fillStyle = color; ctx.font = `bold ${sfs}px monospace`;
      ctx.fillText(value, x, y);
      x += ctx.measureText(value).width + 16 * dpr;
    }
  }

  // ── Data API ───────────────────────────────────────────
  function addPeriod(period: TPOPeriod) {
    periods.push(period);
    for (const price of period.priceLevels) {
      const idx = Math.round(price / opts.priceStep);
      let letters = tpoGrid.get(idx);
      if (!letters) { letters = []; tpoGrid.set(idx, letters); }
      letters.push(period.label);
    }
    if (period.priceLevels.length > 0) lastPrice = period.priceLevels[period.priceLevels.length - 1];
    draw();
  }

  // Incremental: place a single letter at a price level (for developing profile)
  function addTPOTick(label: string, price: number) {
    const idx = Math.round(price / opts.priceStep);
    let letters = tpoGrid.get(idx);
    if (!letters) { letters = []; tpoGrid.set(idx, letters); }
    if (!letters.includes(label)) letters.push(label);
    let period = periods.find(p => p.label === label);
    if (!period) { period = { label, priceLevels: [] }; periods.push(period); }
    if (!period.priceLevels.includes(price)) period.priceLevels.push(price);
    lastPrice = price;
  }

  // ── Simulation ─────────────────────────────────────────
  function resetSimState() {
    periods.length = 0; tpoGrid.clear();
    simPrice = opts.basePrice; simPeriodIdx = 0;
    simTickInPeriod = 0; simMean = opts.basePrice; lastPrice = opts.basePrice;
  }

  function simTick() {
    if (simPeriodIdx >= ALPHABET.length) resetSimState();

    const label = ALPHABET[simPeriodIdx];
    const ticksPerPeriod = 18;

    // Price movement with bell-curve tendency
    const meanPull = -(simPrice - simMean) * 0.06;
    const noise = (Math.random() - 0.5) * opts.priceStep * 2.8;
    let drift = 0;

    // First two periods (A, B): establish range more aggressively
    if (simPeriodIdx < 2) {
      drift = (Math.random() - 0.5) * opts.priceStep * 3.5;
    } else if (Math.random() < 0.08) {
      drift = (Math.random() - 0.5) * opts.priceStep * 6; // breakout
    }

    simPrice += meanPull + noise + drift;
    simPrice = Math.round(simPrice / opts.priceStep) * opts.priceStep;

    // Slowly shift mean (trend)
    if (Math.random() < 0.03) simMean += (Math.random() - 0.5) * opts.priceStep * 4;

    addTPOTick(label, simPrice);
    simTickInPeriod++;
    if (simTickInPeriod >= ticksPerPeriod) { simTickInPeriod = 0; simPeriodIdx++; }
    draw();
  }

  function startSimulation() {
    if (simTimer) return;
    resetSimState();
    simTimer = window.setInterval(simTick, opts.simulationSpeed);
  }

  function stopSimulation() {
    if (simTimer) { clearInterval(simTimer); simTimer = 0; }
  }

  // Auto-start if configured
  if (opts.simulation) startSimulation();
  draw();

  // ── Public API ─────────────────────────────────────────
  return {
    addPeriod,
    startSimulation,
    stopSimulation,
    setOptions(newOpts: Partial<MarketProfileOptions>) { opts = { ...opts, ...newOpts }; draw(); },
    redraw: draw,
    resize() { sizeCanvas(); draw(); },
    dispose() { stopSimulation(); ro.disconnect(); canvas.remove(); },
  };
}
