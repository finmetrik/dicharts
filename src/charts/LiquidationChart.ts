// ---------------------------------------------------------------------------
// DiCharts – Liquidation Heatmap Chart
// ---------------------------------------------------------------------------
// Visualizes predicted liquidation clusters above and below current price.
// Short liquidation zones (above price) glow magenta/pink, long liquidation
// zones (below price) glow cyan/teal. Includes magnetic pull indicators,
// liquidation volume bars, and a built-in simulation mode.
// ---------------------------------------------------------------------------

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LiquidationLevel {
  price: number;
  longLiquidation: number;
  shortLiquidation: number;
}

export interface LiquidationSnapshot {
  timestamp: number;
  levels: LiquidationLevel[];
  lastPrice: number;
}

export interface LiquidationChartOptions {
  priceStep?: number;
  maxColumns?: number;
  visibleLevels?: number;
  showLiquidationBars?: boolean;
  simulation?: boolean;
  simulationSpeed?: number;
  basePrice?: number;
  background?: string;
  textColor?: string;
}

export interface LiquidationChartInstance {
  addSnapshot(snapshot: LiquidationSnapshot): void;
  startSimulation(): void;
  stopSimulation(): void;
  setOptions(opts: Partial<LiquidationChartOptions>): void;
  redraw(): void;
  resize(): void;
  dispose(): void;
}

// ─── Color helper ────────────────────────────────────────────────────────────

function lerpColor(a: string, b: string, t: number): string {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  return `rgb(${Math.round(pa[0] + (pb[0] - pa[0]) * t)},${Math.round(pa[1] + (pb[1] - pa[1]) * t)},${Math.round(pa[2] + (pb[2] - pa[2]) * t)})`;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createLiquidationChart(
  container: HTMLElement, options: LiquidationChartOptions = {},
): LiquidationChartInstance {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  container.appendChild(canvas);
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

  let opts = {
    priceStep: options.priceStep ?? 1,
    maxColumns: options.maxColumns ?? 200,
    visibleLevels: options.visibleLevels ?? 50,
    showLiquidationBars: options.showLiquidationBars !== false,
    simulation: options.simulation ?? false,
    simulationSpeed: options.simulationSpeed ?? 120,
    basePrice: options.basePrice ?? 30150,
    background: options.background ?? '#050810',
    textColor: options.textColor ?? '#4a5578',
  };

  interface Column { timestamp: number; cells: Map<number, { long: number; short: number }>; lastPrice: number }
  const columns: Column[] = [];
  let centerPrice = opts.basePrice, maxLiqVol = 100;
  let simTimer = 0, simPrice = opts.basePrice, simTrend = 0;
  let dpr = window.devicePixelRatio || 1;

  // ── Canvas sizing ──────────────────────────────────────────
  function sizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(container.clientWidth * dpr);
    canvas.height = Math.round(container.clientHeight * dpr);
  }
  sizeCanvas();
  const ro = new ResizeObserver(() => { sizeCanvas(); draw(); });
  ro.observe(container);

  // ── Layout ─────────────────────────────────────────────────
  function layout() {
    const w = canvas.width, h = canvas.height;
    const liqBarW = opts.showLiquidationBars ? Math.round(w * 0.07) : 0;
    const paxW = Math.round(62 * dpr), taxH = Math.round(24 * dpr);
    return {
      chartX: 0, chartY: 0, chartW: w - liqBarW - paxW, chartH: h - taxH,
      liqX: w - liqBarW - paxW, liqW: liqBarW, liqH: h - taxH,
      paxX: w - paxW, paxW, paxH: h - taxH,
      taxY: h - taxH, taxW: w - paxW, taxH, w, h,
    };
  }

  function priceToY(price: number, l: ReturnType<typeof layout>) {
    const top = centerPrice + opts.visibleLevels * opts.priceStep;
    return l.chartY + ((top - price) / (opts.visibleLevels * 2 * opts.priceStep)) * l.chartH;
  }
  function cellH(l: ReturnType<typeof layout>) { return l.chartH / (opts.visibleLevels * 2); }

  // ── Draw ───────────────────────────────────────────────────
  function draw() {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const l = layout();
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, l.w, l.h);

    if (columns.length === 0) {
      const fs = Math.round(10 * dpr);
      ctx.fillStyle = opts.textColor; ctx.font = `${fs}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Waiting for data\u2026', l.w / 2, l.h / 2);
      return;
    }

    const colW = l.chartW / opts.maxColumns, ch = cellH(l);
    const topPrice = centerPrice + opts.visibleLevels * opts.priceStep;
    const botPrice = centerPrice - opts.visibleLevels * opts.priceStep;
    const startCol = Math.max(0, columns.length - opts.maxColumns);

    // ── Liquidation heat bands ──
    ctx.save();
    for (let ci = startCol; ci < columns.length; ci++) {
      const col = columns[ci];
      const x = (ci - startCol) * colW + l.chartX;
      const age = (ci - startCol) / Math.max(1, columns.length - startCol - 1);
      const fadeIn = 0.5 + age * 0.5;

      for (const [priceIdx, vol] of col.cells) {
        const price = priceIdx * opts.priceStep;
        if (price < botPrice || price > topPrice) continue;
        const isAbove = price > col.lastPrice;
        const liqVol = isAbove ? vol.short : vol.long;
        if (liqVol < 0.5) continue;
        const intensity = Math.min(1, liqVol / maxLiqVol);
        if (intensity < 0.01) continue;

        const color = isAbove
          ? lerpColor('#ff0080', '#ff00ff', intensity)
          : lerpColor('#00d4ff', '#00ffcc', intensity);
        const y = priceToY(price, l);
        ctx.globalAlpha = fadeIn * (0.15 + intensity * 0.7);
        ctx.shadowColor = color; ctx.shadowBlur = (4 + intensity * 14) * dpr;
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x), Math.round(y - ch / 2), Math.ceil(colW) + 1, Math.ceil(ch) + 1);
      }
    }
    ctx.restore();

    // ── Price line ──
    if (columns.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5 * dpr;
      ctx.shadowColor = 'rgba(255,255,255,0.5)'; ctx.shadowBlur = 8 * dpr;
      ctx.beginPath();
      let first = true;
      for (let ci = startCol; ci < columns.length; ci++) {
        const x = (ci - startCol) * colW + l.chartX + colW / 2;
        const y = priceToY(columns[ci].lastPrice, l);
        first ? (ctx.moveTo(x, y), first = false) : ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.restore();
    }

    // ── Magnetic pull arrows ──
    const lastCol = columns[columns.length - 1];
    if (lastCol) {
      let bestAbove = { price: 0, vol: 0 }, bestBelow = { price: 0, vol: 0 };
      for (const [priceIdx, vol] of lastCol.cells) {
        const price = priceIdx * opts.priceStep, total = vol.short + vol.long;
        if (price < botPrice || price > topPrice) continue;
        if (price > lastCol.lastPrice && total > bestAbove.vol) bestAbove = { price, vol: total };
        if (price < lastCol.lastPrice && total > bestBelow.vol) bestBelow = { price, vol: total };
      }
      const ax = l.chartX + l.chartW - 20 * dpr, as = 5 * dpr;
      for (const [best, color, dir] of [[bestAbove, '#ff0080', -1], [bestBelow, '#00d4ff', 1]] as const) {
        if (best.vol > maxLiqVol * 0.2) {
          const y = priceToY(best.price, l);
          ctx.save();
          ctx.globalAlpha = 0.5 + Math.min(1, best.vol / maxLiqVol) * 0.5;
          ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 6 * dpr;
          ctx.beginPath();
          ctx.moveTo(ax, y + dir * as);
          ctx.lineTo(ax - as * 0.6, y - dir * as * 0.5);
          ctx.lineTo(ax + as * 0.6, y - dir * as * 0.5);
          ctx.closePath(); ctx.fill(); ctx.restore();
        }
      }
    }

    // ── Liquidation volume bars ──
    if (opts.showLiquidationBars && lastCol) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(l.liqX, 0); ctx.lineTo(l.liqX, l.liqH); ctx.stroke();

      let localMax = 1;
      for (const [, vol] of lastCol.cells) localMax = Math.max(localMax, vol.long + vol.short);
      for (const [priceIdx, vol] of lastCol.cells) {
        const price = priceIdx * opts.priceStep;
        if (price < botPrice || price > topPrice) continue;
        const total = vol.long + vol.short;
        if (total < 0.5) continue;
        const color = price > lastCol.lastPrice ? '#ff0080' : '#00d4ff';
        ctx.save();
        ctx.globalAlpha = 0.4 + (total / localMax) * 0.5;
        ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 3 * dpr;
        ctx.fillRect(l.liqX + 2 * dpr, Math.round(priceToY(price, l) - ch / 2),
          (total / localMax) * l.liqW * 0.9, Math.ceil(ch));
        ctx.restore();
      }
    }

    // ── Axes ──
    const fs = Math.round(9 * dpr);
    const decimals = opts.priceStep >= 1 ? 0 : 2;

    // Price axis
    ctx.fillStyle = 'rgba(5,8,16,0.92)';
    ctx.fillRect(l.paxX, 0, l.paxW, l.paxH);
    ctx.font = `${fs}px monospace`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const labelStep = Math.max(1, Math.round(opts.visibleLevels * 2 / 16)) * opts.priceStep;
    for (let p = Math.ceil(botPrice / labelStep) * labelStep; p <= topPrice; p += labelStep) {
      const y = priceToY(p, l);
      ctx.fillStyle = opts.textColor;
      ctx.fillText(p.toFixed(decimals), l.paxX + l.paxW - 4 * dpr, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(l.chartX, y); ctx.lineTo(l.chartX + l.chartW, y); ctx.stroke();
    }

    // Current price marker
    if (lastCol) {
      const curY = priceToY(lastCol.lastPrice, l);
      ctx.save(); ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(255,255,255,0.6)'; ctx.shadowBlur = 6 * dpr;
      ctx.fillRect(l.paxX, curY - 9 * dpr, l.paxW, 18 * dpr); ctx.restore();
      ctx.fillStyle = opts.background; ctx.font = `bold ${fs}px monospace`;
      ctx.fillText(lastCol.lastPrice.toFixed(decimals), l.paxX + l.paxW - 4 * dpr, curY);
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
      ctx.setLineDash([3 * dpr, 3 * dpr]);
      ctx.beginPath(); ctx.moveTo(l.chartX, curY); ctx.lineTo(l.chartX + l.chartW, curY);
      ctx.stroke(); ctx.restore();
    }

    // Time axis
    ctx.fillStyle = 'rgba(5,8,16,0.92)'; ctx.fillRect(0, l.taxY, l.taxW, l.taxH);
    ctx.font = `${fs}px monospace`; ctx.fillStyle = opts.textColor;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const numLabels = Math.min(8, columns.length - startCol);
    if (numLabels > 1) {
      for (let i = 0; i < numLabels; i++) {
        const ci = startCol + Math.round((i / (numLabels - 1)) * (columns.length - startCol - 1));
        if (ci < 0 || ci >= columns.length) continue;
        const x = (ci - startCol) * colW + l.chartX + colW / 2;
        const d = new Date(columns[ci].timestamp);
        ctx.fillText(
          `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`,
          x, l.taxY + 6 * dpr,
        );
      }
    }
    // Axis borders
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(l.paxX, 0); ctx.lineTo(l.paxX, l.h);
    ctx.moveTo(0, l.taxY); ctx.lineTo(l.taxW, l.taxY);
    ctx.stroke();
  }

  // ── Data API ───────────────────────────────────────────────
  function addSnapshot(snapshot: LiquidationSnapshot) {
    const cells = new Map<number, { long: number; short: number }>();
    for (const lvl of snapshot.levels) {
      const idx = Math.round(lvl.price / opts.priceStep);
      const e = cells.get(idx) || { long: 0, short: 0 };
      e.long += lvl.longLiquidation; e.short += lvl.shortLiquidation;
      cells.set(idx, e);
      const vol = Math.max(e.long, e.short);
      if (vol > maxLiqVol * 0.4) maxLiqVol = Math.max(maxLiqVol, vol * 1.3);
    }
    columns.push({ timestamp: snapshot.timestamp, cells, lastPrice: snapshot.lastPrice });
    if (columns.length > opts.maxColumns * 1.5) columns.splice(0, columns.length - opts.maxColumns);
    centerPrice = snapshot.lastPrice;
    draw();
  }

  // ── Simulation ─────────────────────────────────────────────
  interface SimPool { price: number; longVol: number; shortVol: number; life: number }
  const simPools: SimPool[] = [];

  function initSimPools() {
    simPools.length = 0;
    const base = Math.round(opts.basePrice / 50) * 50;
    for (let i = -50; i <= 50; i++) {
      const price = base + i * opts.priceStep;
      if (Math.abs(i) < 3) continue;
      const bonus = (price % 100 === 0) ? 3.5 : (price % 50 === 0) ? 2.0 : 1.0;
      const vol = (8 + Math.random() * 40) * bonus;
      const life = 0.6 + Math.random() * 0.4;
      price > opts.basePrice
        ? simPools.push({ price, longVol: 0, shortVol: vol, life })
        : simPools.push({ price, longVol: vol, shortVol: 0, life });
    }
  }

  function simTick() {
    simTrend += (Math.random() - 0.5) * 0.4;
    simTrend *= 0.93;
    simTrend -= (simPrice - opts.basePrice) * 0.0006;

    // Magnetic pull toward nearby liquidation pools
    let pull = 0;
    for (const p of simPools) {
      const d = p.price - simPrice, ad = Math.abs(d), vol = p.longVol + p.shortVol;
      if (ad < opts.priceStep * 15 && ad > opts.priceStep * 0.5 && vol > 20)
        pull += Math.sign(d) * (vol / (ad * ad)) * 0.08;
    }
    simTrend += pull;
    simPrice = Math.round((simPrice + simTrend + (Math.random() - 0.5) * opts.priceStep * 0.8) * 100) / 100;

    // Consume/decay pools
    for (const p of simPools) {
      if (Math.abs(p.price - simPrice) < opts.priceStep * 2) {
        p.longVol *= 0.6; p.shortVol *= 0.6; p.life *= 0.7;
      }
      p.life -= 0.003; p.longVol *= 0.997; p.shortVol *= 0.997;
    }

    // Cull dead pools
    for (let i = simPools.length - 1; i >= 0; i--)
      if (simPools[i].life <= 0 || simPools[i].longVol + simPools[i].shortVol < 0.5) simPools.splice(i, 1);

    // Spawn new pools
    if (Math.random() < 0.15 || simPools.length < 30) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      const price = Math.round((simPrice + dir * (5 + Math.random() * 45) * opts.priceStep) / opts.priceStep) * opts.priceStep;
      const bonus = (price % 100 === 0) ? 3.0 : (price % 50 === 0) ? 2.0 : 1.0;
      const vol = (10 + Math.random() * 50) * bonus, life = 0.5 + Math.random() * 0.5;
      price > simPrice
        ? simPools.push({ price, longVol: 0, shortVol: vol, life })
        : simPools.push({ price, longVol: vol, shortVol: 0, life });
    }

    const levels: LiquidationLevel[] = simPools.map(p => ({
      price: p.price, longLiquidation: p.longVol * p.life, shortLiquidation: p.shortVol * p.life,
    }));
    addSnapshot({ timestamp: Date.now(), levels, lastPrice: simPrice });
  }

  function startSimulation() {
    if (simTimer) return;
    initSimPools(); simPrice = opts.basePrice; simTrend = 0;
    simTimer = window.setInterval(simTick, opts.simulationSpeed);
  }
  function stopSimulation() { if (simTimer) { clearInterval(simTimer); simTimer = 0; } }

  if (opts.simulation) startSimulation();
  draw();

  // ── Public API ─────────────────────────────────────────────
  return {
    addSnapshot,
    startSimulation,
    stopSimulation,
    setOptions(newOpts: Partial<LiquidationChartOptions>) { opts = { ...opts, ...newOpts }; draw(); },
    redraw: draw,
    resize() { sizeCanvas(); draw(); },
    dispose() { stopSimulation(); ro.disconnect(); canvas.remove(); },
  };
}
