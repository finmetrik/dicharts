// ---------------------------------------------------------------------------
// DiCharts – Cumulative Volume Delta + Absorption / Exhaustion Chart
// ---------------------------------------------------------------------------
// Two-panel Canvas2D chart tracking aggressive buyers vs sellers on every
// trade.  Top panel: price line with absorption dots, exhaustion markers and
// divergence arrows.  Bottom panel: CVD oscillator with delta bars, SMA trend
// line and pulse-spike highlights.  Built-in simulation included.
// ---------------------------------------------------------------------------

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DeltaTick {
  timestamp: number;
  price: number;
  buyVolume: number;
  sellVolume: number;
  delta: number;
  cvd: number;
}

export interface AbsorptionEvent {
  timestamp: number;
  price: number;
  volume: number;
  side: 'buy' | 'sell';
}

export interface CumulativeDeltaOptions {
  maxColumns?: number;
  visibleLevels?: number;
  showAbsorption?: boolean;
  showExhaustion?: boolean;
  showDivergence?: boolean;
  simulation?: boolean;
  simulationSpeed?: number;
  basePrice?: number;
  background?: string;
  textColor?: string;
}

export interface CumulativeDeltaInstance {
  addTick(tick: DeltaTick): void;
  startSimulation(): void;
  stopSimulation(): void;
  setOptions(opts: Partial<CumulativeDeltaOptions>): void;
  redraw(): void;
  resize(): void;
  dispose(): void;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createCumulativeDelta(
  container: HTMLElement, options: CumulativeDeltaOptions = {},
): CumulativeDeltaInstance {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  container.appendChild(canvas);
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

  let opts = {
    maxColumns: options.maxColumns ?? 200, visibleLevels: options.visibleLevels ?? 50,
    showAbsorption: options.showAbsorption !== false, showExhaustion: options.showExhaustion !== false,
    showDivergence: options.showDivergence !== false, simulation: options.simulation ?? false,
    simulationSpeed: options.simulationSpeed ?? 120, basePrice: options.basePrice ?? 30150,
    background: options.background ?? '#060a12', textColor: options.textColor ?? '#4a5578',
  };

  // ── Internal state ──────────────────────────────────────────
  interface Marker { index: number; price: number; }
  interface ExhaustionMarker extends Marker { side: 'buy' | 'sell'; }
  interface DivergenceArrow extends Marker { type: 'bullish' | 'bearish'; }

  const ticks: DeltaTick[] = [];
  const absorptions: AbsorptionEvent[] = [];
  const exhaustions: ExhaustionMarker[] = [];
  const divergences: DivergenceArrow[] = [];
  let simTimer = 0, simPrice = opts.basePrice, simTrend = 0, simCvd = 0;
  let simBias = 0, simBiasTimer = 0, simTickCount = 0;
  let dpr = window.devicePixelRatio || 1;

  // ── Canvas sizing ───────────────────────────────────────────
  function sizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    canvas.width  = Math.round(container.clientWidth  * dpr);
    canvas.height = Math.round(container.clientHeight * dpr);
  }
  sizeCanvas();
  const ro = new ResizeObserver(() => { sizeCanvas(); draw(); });
  ro.observe(container);

  // ── Layout ──────────────────────────────────────────────────
  function layout() {
    const w = canvas.width, h = canvas.height;
    const axisW = Math.round(62 * dpr), timeH = Math.round(24 * dpr);
    const chartH = h - timeH, topH = Math.round(chartH * 0.6), botH = chartH - topH;
    return {
      topX: 0, topY: 0, topW: w - axisW, topH,
      botX: 0, botY: topH, botW: w - axisW, botH,
      paxX: w - axisW, paxW: axisW, paxH: topH,
      daxX: w - axisW, daxY: topH, daxW: axisW, daxH: botH,
      taxY: h - timeH, taxW: w - axisW, taxH: timeH, w, h,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────
  function sma(data: number[], period: number): (number | null)[] {
    const out: (number | null)[] = []; let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i]; if (i >= period) sum -= data[i - period];
      out.push(i >= period - 1 ? sum / period : null);
    }
    return out;
  }

  function niceStep(range: number, maxLabels: number): number {
    const raw = range / maxLabels, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    return n <= 1.5 ? mag : n <= 3.5 ? 2 * mag : n <= 7.5 ? 5 * mag : 10 * mag;
  }

  function fmtDelta(v: number): string {
    const a = Math.abs(v);
    return a >= 1e6 ? (v/1e6).toFixed(1)+'M' : a >= 1e3 ? (v/1e3).toFixed(1)+'K' : v.toFixed(0);
  }

  // ── Draw ────────────────────────────────────────────────────
  function draw() {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const l = layout();
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, l.w, l.h);

    if (ticks.length === 0) {
      const fs = Math.round(10 * dpr);
      ctx.fillStyle = opts.textColor; ctx.font = `${fs}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Waiting for data\u2026', l.w / 2, l.h / 2);
      return;
    }

    const start = Math.max(0, ticks.length - opts.maxColumns);
    const vis = ticks.slice(start), colW = l.topW / opts.maxColumns;

    // Price range
    let minP = Infinity, maxP = -Infinity;
    for (const t of vis) { minP = Math.min(minP, t.price); maxP = Math.max(maxP, t.price); }
    const pPad = Math.max(1, (maxP - minP) * 0.12);
    minP -= pPad; maxP += pPad;
    const pRange = maxP - minP || 1;
    const priceY = (p: number) => l.topY + (1 - (p - minP) / pRange) * l.topH;

    // CVD range – always include zero
    let minC = Infinity, maxC = -Infinity;
    for (const t of vis) { minC = Math.min(minC, t.cvd); maxC = Math.max(maxC, t.cvd); }
    const cPad = Math.max(1, (maxC - minC) * 0.15);
    minC -= cPad; maxC += cPad;
    if (minC > 0) minC = 0; if (maxC < 0) maxC = 0;
    const cRange = maxC - minC || 1;
    const cvdY = (c: number) => l.botY + (1 - (c - minC) / cRange) * l.botH;
    const zeroY = cvdY(0);

    // Panel separator + zero line
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, l.botY); ctx.lineTo(l.topW, l.botY); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.moveTo(l.botX, zeroY); ctx.lineTo(l.botX + l.botW, zeroY); ctx.stroke();

    // ── Delta bars ──
    const barW = Math.max(1, colW * 0.4);
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < vis.length; i++) {
      const t = vis[i], x = l.botX + i * colW + colW / 2;
      const bh = Math.abs(t.delta) / cRange * l.botH;
      ctx.fillStyle = t.delta >= 0 ? '#00c853' : '#ff5252';
      ctx.fillRect(x - barW / 2, t.delta >= 0 ? zeroY - bh : zeroY, barW, bh);
    }
    ctx.globalAlpha = 1;

    // ── CVD filled area (positive then negative via clip) ──
    for (const [clipY, clipH, fill] of [
      [l.botY, zeroY - l.botY, 'rgba(0,200,83,0.25)'],
      [zeroY, l.botY + l.botH - zeroY, 'rgba(255,82,82,0.25)'],
    ] as [number, number, string][]) {
      ctx.save();
      ctx.beginPath(); ctx.rect(l.botX, clipY, l.botW, clipH); ctx.clip();
      ctx.beginPath(); ctx.moveTo(l.botX + colW / 2, zeroY);
      for (let i = 0; i < vis.length; i++) ctx.lineTo(l.botX + i * colW + colW / 2, cvdY(vis[i].cvd));
      ctx.lineTo(l.botX + (vis.length - 1) * colW + colW / 2, zeroY); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); ctx.restore();
    }

    // CVD line
    ctx.save();
    ctx.strokeStyle = '#00c853'; ctx.lineWidth = 1.5 * dpr;
    ctx.shadowColor = 'rgba(0,200,83,0.4)'; ctx.shadowBlur = 6 * dpr;
    ctx.beginPath();
    for (let i = 0; i < vis.length; i++) {
      const x = l.botX + i * colW + colW / 2, y = cvdY(vis[i].cvd);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.restore();

    // CVD SMA (20-period)
    const smaVals = sma(vis.map(t => t.cvd), 20);
    ctx.save();
    ctx.strokeStyle = '#7c4dff'; ctx.lineWidth = 1.2 * dpr;
    ctx.shadowColor = 'rgba(124,77,255,0.35)'; ctx.shadowBlur = 4 * dpr;
    ctx.beginPath(); let smaStarted = false;
    for (let i = 0; i < vis.length; i++) {
      if (smaVals[i] === null) continue;
      const x = l.botX + i * colW + colW / 2, y = cvdY(smaVals[i]!);
      smaStarted ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), smaStarted = true);
    }
    ctx.stroke(); ctx.restore();

    // Pulse spikes
    const maxDelta = Math.max(1, ...vis.map(t => Math.abs(t.delta)));
    for (let i = 0; i < vis.length; i++) {
      if (Math.abs(vis[i].delta) / maxDelta < 0.75) continue;
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 12 * dpr;
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath();
      ctx.arc(l.botX + i * colW + colW / 2, cvdY(vis[i].cvd), 3 * dpr, 0, Math.PI * 2);
      ctx.fill(); ctx.restore();
    }

    // ── Price line ──
    ctx.save();
    ctx.strokeStyle = '#c8d6e5'; ctx.lineWidth = 1.5 * dpr;
    ctx.shadowColor = 'rgba(200,214,229,0.35)'; ctx.shadowBlur = 5 * dpr;
    ctx.beginPath();
    for (let i = 0; i < vis.length; i++) {
      const x = l.topX + i * colW + colW / 2, y = priceY(vis[i].price);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.restore();

    // ── Absorption dots ──
    if (opts.showAbsorption) {
      const t0 = vis[0].timestamp, tR = (vis[vis.length-1].timestamp - t0) || 1;
      for (const ab of absorptions) {
        if (ab.timestamp < t0 || ab.timestamp > t0 + tR) continue;
        const x = l.topX + ((ab.timestamp - t0) / tR) * l.topW, y = priceY(ab.price);
        const r = Math.max(3*dpr, Math.min(10*dpr, Math.sqrt(ab.volume) * 0.7 * dpr));
        const buy = ab.side === 'buy';
        ctx.save(); ctx.globalAlpha = 0.8;
        ctx.fillStyle = buy ? '#00e676' : '#ff5252';
        ctx.shadowColor = buy ? 'rgba(0,230,118,0.6)' : 'rgba(255,82,82,0.6)';
        ctx.shadowBlur = 8 * dpr; ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }

    // ── Exhaustion triangles ──
    if (opts.showExhaustion) {
      for (const ex of exhaustions) {
        const vi = ex.index - start; if (vi < 0 || vi >= vis.length) continue;
        const x = l.topX + vi * colW + colW / 2, y = priceY(ex.price), s = 5 * dpr;
        ctx.save(); ctx.fillStyle = '#ffd600';
        ctx.shadowColor = 'rgba(255,214,0,0.5)'; ctx.shadowBlur = 6 * dpr;
        ctx.beginPath();
        if (ex.side === 'buy') { ctx.moveTo(x,y+s); ctx.lineTo(x-s,y-s); ctx.lineTo(x+s,y-s); }
        else { ctx.moveTo(x,y-s); ctx.lineTo(x-s,y+s); ctx.lineTo(x+s,y+s); }
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }

    // ── Divergence arrows ──
    if (opts.showDivergence) {
      for (const dv of divergences) {
        const vi = dv.index - start; if (vi < 0 || vi >= vis.length) continue;
        const x = l.topX + vi * colW + colW / 2, s = 5 * dpr;
        const y = priceY(dv.type === 'bearish' ? maxP - pPad * 0.5 : minP + pPad * 0.5);
        ctx.save(); ctx.fillStyle = '#ffa000';
        ctx.shadowColor = 'rgba(255,160,0,0.5)'; ctx.shadowBlur = 6 * dpr;
        ctx.beginPath();
        if (dv.type === 'bearish') { ctx.moveTo(x,y+s); ctx.lineTo(x-s*0.6,y-s); ctx.lineTo(x+s*0.6,y-s); }
        else { ctx.moveTo(x,y-s); ctx.lineTo(x-s*0.6,y+s); ctx.lineTo(x+s*0.6,y+s); }
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }

    drawAxes(ctx, l, minP, maxP, pRange, minC, maxC, cRange, vis, colW);
  }

  // ── Axes ────────────────────────────────────────────────────
  function drawAxes(
    ctx: CanvasRenderingContext2D, l: ReturnType<typeof layout>,
    minP: number, maxP: number, pRange: number,
    minC: number, maxC: number, cRange: number,
    vis: DeltaTick[], colW: number,
  ) {
    const fs = Math.round(9 * dpr);
    ctx.font = `${fs}px monospace`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';

    // Price axis background
    ctx.fillStyle = 'rgba(6,10,18,0.92)';
    ctx.fillRect(l.paxX, 0, l.paxW, l.paxH);

    const pStep = niceStep(pRange, 8), pStart = Math.ceil(minP / pStep) * pStep;
    for (let p = pStart; p <= maxP; p += pStep) {
      const y = l.topY + (1 - (p - minP) / pRange) * l.topH;
      ctx.fillStyle = opts.textColor;
      ctx.fillText(p.toFixed(0), l.paxX + l.paxW - 4 * dpr, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(l.topW, y); ctx.stroke();
    }

    // Current price marker
    const last = vis[vis.length - 1];
    const curY = l.topY + (1 - (last.price - minP) / pRange) * l.topH;
    ctx.fillStyle = last.delta >= 0 ? '#00c853' : '#ff5252';
    ctx.fillRect(l.paxX, curY - 8 * dpr, l.paxW, 16 * dpr);
    ctx.fillStyle = '#ffffff'; ctx.font = `bold ${fs}px monospace`;
    ctx.fillText(last.price.toFixed(0), l.paxX + l.paxW - 4 * dpr, curY);
    ctx.font = `${fs}px monospace`;

    // Delta axis
    ctx.fillStyle = 'rgba(6,10,18,0.92)';
    ctx.fillRect(l.daxX, l.daxY, l.daxW, l.daxH);
    const cStep = niceStep(cRange, 6), cStart = Math.ceil(minC / cStep) * cStep;
    for (let c = cStart; c <= maxC; c += cStep) {
      const y = l.botY + (1 - (c - minC) / cRange) * l.botH;
      ctx.fillStyle = opts.textColor;
      ctx.fillText(fmtDelta(c), l.daxX + l.daxW - 4 * dpr, y);
    }

    // Time axis
    ctx.fillStyle = 'rgba(6,10,18,0.92)'; ctx.fillRect(0, l.taxY, l.taxW, l.taxH);
    ctx.fillStyle = opts.textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const numLabels = Math.min(6, vis.length);
    if (numLabels > 1) {
      for (let i = 0; i < numLabels; i++) {
        const ci = Math.round((i / (numLabels - 1)) * (vis.length - 1));
        const d = new Date(vis[ci].timestamp);
        ctx.fillText(
          `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`,
          ci * colW + colW / 2, l.taxY + 6 * dpr,
        );
      }
    }

    // Borders
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(l.paxX, 0); ctx.lineTo(l.paxX, l.h);
    ctx.moveTo(0, l.taxY); ctx.lineTo(l.taxW, l.taxY);
    ctx.stroke();
  }

  // ── Data API ────────────────────────────────────────────────
  function addTick(tick: DeltaTick) {
    ticks.push(tick);
    if (ticks.length > opts.maxColumns * 1.5) ticks.splice(0, ticks.length - opts.maxColumns);
    detectAbsorption(tick); detectExhaustion(); detectDivergence();
    draw();
  }

  // ── Detection logic ─────────────────────────────────────────
  function detectAbsorption(tick: DeltaTick) {
    if (ticks.length < 3) return;
    const prev = ticks[ticks.length - 2];
    const totalVol = tick.buyVolume + tick.sellVolume;
    if (totalVol > 60 && Math.abs(tick.price - prev.price) < 0.5) {
      absorptions.push({ timestamp: tick.timestamp, price: tick.price, volume: totalVol,
        side: tick.buyVolume > tick.sellVolume ? 'buy' : 'sell' });
      if (absorptions.length > 200) absorptions.splice(0, absorptions.length - 150);
    }
  }

  function detectExhaustion() {
    if (ticks.length < 6) return;
    const end = ticks.length - 1;
    const deltas = ticks.slice(end - 5, end + 1).map(t => t.delta);
    const allPos = deltas.every(d => d > 0), allNeg = deltas.every(d => d < 0);
    if (!allPos && !allNeg) return;
    let ok = true;
    for (let i = 1; i < deltas.length; i++) if (Math.abs(deltas[i]) >= Math.abs(deltas[i-1])) { ok = false; break; }
    if (!ok) return;
    const lastEx = exhaustions[exhaustions.length - 1];
    if (!lastEx || end - lastEx.index > 8) {
      exhaustions.push({ index: end, price: ticks[end].price, side: allPos ? 'buy' : 'sell' });
      if (exhaustions.length > 100) exhaustions.splice(0, exhaustions.length - 80);
    }
  }

  function detectDivergence() {
    if (ticks.length < 40) return;
    const end = ticks.length - 1, slice = ticks.slice(end - 30, end + 1);
    let pHi = -Infinity, pLo = Infinity, cHi = -Infinity, cLo = Infinity;
    let pHiI = 0, pLoI = 0, cHiI = 0, cLoI = 0;
    for (let i = 0; i < slice.length; i++) {
      if (slice[i].price > pHi) { pHi = slice[i].price; pHiI = i; }
      if (slice[i].price < pLo) { pLo = slice[i].price; pLoI = i; }
      if (slice[i].cvd > cHi)   { cHi = slice[i].cvd;   cHiI = i; }
      if (slice[i].cvd < cLo)   { cLo = slice[i].cvd;   cLoI = i; }
    }
    const tip = slice.length - 1;
    const check = (priceI: number, cvdI: number, type: 'bearish' | 'bullish') => {
      if (priceI > tip - 3 && cvdI < tip - 8) {
        const last = divergences[divergences.length - 1];
        if (!last || end - last.index > 15)
          divergences.push({ index: end, price: ticks[end].price, type });
      }
    };
    check(pHiI, cHiI, 'bearish');
    check(pLoI, cLoI, 'bullish');
    if (divergences.length > 60) divergences.splice(0, divergences.length - 40);
  }

  // ── Simulation ──────────────────────────────────────────────
  function simTick() {
    simTickCount++;
    if (--simBiasTimer <= 0) { simBias = (Math.random()-0.5)*30; simBiasTimer = 30+Math.floor(Math.random()*30); }

    simTrend += (Math.random()-0.5)*0.4; simTrend *= 0.92;
    simTrend -= (simPrice - opts.basePrice) * 0.001;
    simPrice += simTrend + (Math.random()-0.5)*0.8;
    simPrice = Math.round(simPrice * 100) / 100;

    let buyVol = Math.max(0, 5+Math.random()*40+simBias);
    let sellVol = Math.max(0, 5+Math.random()*40-simBias);
    if (Math.random() < 0.07) { const sp = 60+Math.random()*120; Math.random()>0.5 ? buyVol+=sp : sellVol+=sp; }

    const delta = buyVol - sellVol; simCvd += delta;
    addTick({ timestamp: Date.now(), price: simPrice,
      buyVolume: Math.round(buyVol), sellVolume: Math.round(sellVol),
      delta: Math.round(delta), cvd: Math.round(simCvd) });
  }

  function startSimulation() {
    if (simTimer) return;
    simPrice = opts.basePrice; simTrend = 0; simCvd = 0;
    simBias = 0; simBiasTimer = 0; simTickCount = 0;
    simTimer = window.setInterval(simTick, opts.simulationSpeed);
  }

  function stopSimulation() { if (simTimer) { clearInterval(simTimer); simTimer = 0; } }

  if (opts.simulation) startSimulation();
  draw();

  // ── Public API ──────────────────────────────────────────────
  return {
    addTick, startSimulation, stopSimulation,
    setOptions(newOpts: Partial<CumulativeDeltaOptions>) { opts = { ...opts, ...newOpts }; draw(); },
    redraw: draw,
    resize() { sizeCanvas(); draw(); },
    dispose() { stopSimulation(); ro.disconnect(); canvas.remove(); },
  };
}
