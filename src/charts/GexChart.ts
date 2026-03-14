// ---------------------------------------------------------------------------
// DiCharts – Options Gamma Exposure (GEX) Chart
// ---------------------------------------------------------------------------
// Visualizes dealer gamma exposure across strike prices, showing where market
// makers are forced to buy/sell as hedging pressure. Highlights the GEX flip
// zone, call/put walls, and the net GEX curve.
// ---------------------------------------------------------------------------

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GexStrike {
  strike: number;
  callGamma: number;
  putGamma: number;
  netGamma: number;
  callOI: number;
  putOI: number;
}

export interface GexData {
  spotPrice: number;
  strikes: GexStrike[];
  flipLevel: number;
  callWall: number;
  putWall: number;
  totalGex: number;
}

export interface GexChartOptions {
  strikeInterval?: number;
  simulation?: boolean;
  simulationSpeed?: number;
  basePrice?: number;
  background?: string;
  textColor?: string;
}

export interface GexChartInstance {
  setData(data: GexData): void;
  startSimulation(): void;
  stopSimulation(): void;
  setOptions(opts: Partial<GexChartOptions>): void;
  redraw(): void;
  resize(): void;
  dispose(): void;
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const COL = {
  bg:           '#0a0e1a',
  posBar0:      '#00c853',
  posBar1:      '#00e676',
  negBar0:      '#d500f9',
  negBar1:      '#ff1744',
  flipZone:     '#ffd600',
  callWall:     '#00e5ff',
  putWall:      '#ff4081',
  priceLine:    '#ffffff',
  netCurve:     '#7c4dff',
  zeroLine:     'rgba(255,255,255,0.15)',
  text:         '#6b7db3',
  statText:     '#e0e6f0',
  axisBorder:   'rgba(255,255,255,0.08)',
};

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createGexChart(container: HTMLElement, options: GexChartOptions = {}): GexChartInstance {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  container.appendChild(canvas);
  const cs = getComputedStyle(container);
  if (cs.position === 'static') container.style.position = 'relative';

  let opts = {
    strikeInterval:  options.strikeInterval  ?? 25,
    simulation:      options.simulation      ?? false,
    simulationSpeed: options.simulationSpeed ?? 200,
    basePrice:       options.basePrice       ?? 4500,
    background:      options.background      ?? COL.bg,
    textColor:       options.textColor       ?? COL.text,
  };

  // ── Internal state ───────────────────────────────────────

  let data: GexData | null = null;
  let simTimer = 0;
  let simSpot = opts.basePrice;
  let simDrift = 0;
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
    const statsH  = Math.round(50 * dpr);
    const axisB   = Math.round(28 * dpr);
    const axisL   = Math.round(70 * dpr);
    const marginR = Math.round(20 * dpr);
    return {
      w, h,
      statsX: 0,     statsY: 0,     statsW: w,               statsH,
      chartX: axisL,  chartY: statsH, chartW: w - axisL - marginR, chartH: h - statsH - axisB,
      axisLX: 0,      axisLW: axisL,
      axisBY: h - axisB, axisBH: axisB,
    };
  }

  // ── Mapping helpers ──────────────────────────────────────

  function strikeToX(strike: number, strikes: GexStrike[], l: ReturnType<typeof layout>): number {
    const first = strikes[0].strike;
    const last  = strikes[strikes.length - 1].strike;
    const range = last - first || 1;
    return l.chartX + ((strike - first) / range) * l.chartW;
  }

  function gammaToY(gamma: number, maxAbs: number, l: ReturnType<typeof layout>): number {
    const mid = l.chartY + l.chartH / 2;
    return mid - (gamma / maxAbs) * (l.chartH / 2) * 0.88;
  }

  // ── Draw ─────────────────────────────────────────────────

  function draw() {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const l = layout();

    // Background
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, l.w, l.h);

    if (!data || data.strikes.length === 0) {
      drawEmpty(ctx, l);
      return;
    }

    const strikes = data.strikes;
    const maxAbs  = strikes.reduce((m, s) => Math.max(m, Math.abs(s.netGamma)), 0) || 1;
    const barW    = Math.max(2, (l.chartW / strikes.length) * 0.65);
    const zeroY   = gammaToY(0, maxAbs, l);

    // ── Zero line ──
    ctx.strokeStyle = COL.zeroLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(l.chartX, zeroY);
    ctx.lineTo(l.chartX + l.chartW, zeroY);
    ctx.stroke();

    // ── GEX flip zone ──
    const flipX = strikeToX(data.flipLevel, strikes, l);
    const bandW = Math.max(barW * 2.5, 24 * dpr);
    ctx.save();
    const flipGrad = ctx.createLinearGradient(flipX - bandW / 2, 0, flipX + bandW / 2, 0);
    flipGrad.addColorStop(0,   'rgba(255,214,0,0)');
    flipGrad.addColorStop(0.3, 'rgba(255,214,0,0.12)');
    flipGrad.addColorStop(0.5, 'rgba(255,214,0,0.22)');
    flipGrad.addColorStop(0.7, 'rgba(255,214,0,0.12)');
    flipGrad.addColorStop(1,   'rgba(255,214,0,0)');
    ctx.fillStyle = flipGrad;
    ctx.fillRect(flipX - bandW / 2, l.chartY, bandW, l.chartH);
    // Bright center line
    ctx.strokeStyle = 'rgba(255,214,0,0.5)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.shadowColor = COL.flipZone;
    ctx.shadowBlur = 10 * dpr;
    ctx.beginPath();
    ctx.moveTo(flipX, l.chartY);
    ctx.lineTo(flipX, l.chartY + l.chartH);
    ctx.stroke();
    ctx.restore();

    // ── GEX bars ──
    for (const s of strikes) {
      const x  = strikeToX(s.strike, strikes, l);
      const yB = gammaToY(s.netGamma, maxAbs, l);
      const barH = Math.abs(yB - zeroY);

      ctx.save();
      if (s.netGamma >= 0) {
        const grad = ctx.createLinearGradient(0, zeroY, 0, yB);
        grad.addColorStop(0, COL.posBar0);
        grad.addColorStop(1, COL.posBar1);
        ctx.fillStyle = grad;
        ctx.shadowColor = COL.posBar0;
        ctx.shadowBlur = 6 * dpr;
        ctx.fillRect(x - barW / 2, yB, barW, barH);
      } else {
        const grad = ctx.createLinearGradient(0, zeroY, 0, yB);
        grad.addColorStop(0, COL.negBar0);
        grad.addColorStop(1, COL.negBar1);
        ctx.fillStyle = grad;
        ctx.shadowColor = COL.negBar0;
        ctx.shadowBlur = 6 * dpr;
        ctx.fillRect(x - barW / 2, zeroY, barW, barH);
      }
      ctx.restore();
    }

    // ── Net GEX curve ──
    ctx.save();
    ctx.strokeStyle = COL.netCurve;
    ctx.lineWidth = 2 * dpr;
    ctx.shadowColor = COL.netCurve;
    ctx.shadowBlur = 8 * dpr;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let cumGamma = 0;
    const cumValues: number[] = [];
    for (const s of strikes) {
      cumGamma += s.netGamma;
      cumValues.push(cumGamma);
    }
    const maxCum = cumValues.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
    for (let i = 0; i < strikes.length; i++) {
      const x = strikeToX(strikes[i].strike, strikes, l);
      const y = gammaToY(cumValues[i], maxCum, l);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // ── Current price line ──
    const priceX = strikeToX(data.spotPrice, strikes, l);
    ctx.save();
    ctx.strokeStyle = COL.priceLine;
    ctx.lineWidth = 1.5 * dpr;
    ctx.setLineDash([6 * dpr, 4 * dpr]);
    ctx.shadowColor = 'rgba(255,255,255,0.3)';
    ctx.shadowBlur = 4 * dpr;
    ctx.beginPath();
    ctx.moveTo(priceX, l.chartY);
    ctx.lineTo(priceX, l.chartY + l.chartH);
    ctx.stroke();
    ctx.restore();

    // ── Call wall marker ──
    drawWallMarker(ctx, l, strikes, data.callWall, maxAbs, COL.callWall, 'C');

    // ── Put wall marker ──
    drawWallMarker(ctx, l, strikes, data.putWall, maxAbs, COL.putWall, 'P');

    // ── Axes ──
    drawAxes(ctx, l, strikes, maxAbs);

    // ── Stats panel ──
    drawStats(ctx, l);
  }

  function drawWallMarker(
    ctx: CanvasRenderingContext2D,
    l: ReturnType<typeof layout>,
    strikes: GexStrike[],
    wallStrike: number,
    maxAbs: number,
    color: string,
    label: string,
  ) {
    const x = strikeToX(wallStrike, strikes, l);
    const s = strikes.find(s => s.strike === wallStrike);
    if (!s) return;
    const y = gammaToY(s.netGamma, maxAbs, l);

    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 * dpr;
    ctx.beginPath();
    ctx.arc(x, y, 5 * dpr, 0, Math.PI * 2);
    ctx.fill();
    // Outer glow ring
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(x, y, 10 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Label
    const fs = Math.round(9 * dpr);
    ctx.font = `bold ${fs}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = color;
    ctx.fillText(`${label} ${wallStrike}`, x, y - 12 * dpr);
    ctx.restore();
  }

  function drawAxes(
    ctx: CanvasRenderingContext2D,
    l: ReturnType<typeof layout>,
    strikes: GexStrike[],
    maxAbs: number,
  ) {
    const fs = Math.round(9 * dpr);
    ctx.font = `${fs}px monospace`;

    // ── Left axis (gamma values) ──
    ctx.fillStyle = 'rgba(10,14,26,0.92)';
    ctx.fillRect(0, l.chartY, l.axisLW, l.chartH);

    ctx.fillStyle = opts.textColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const val  = maxAbs - frac * 2 * maxAbs;
      const y    = l.chartY + frac * l.chartH;
      const label = (val / 1e9).toFixed(2) + 'B';
      ctx.fillStyle = opts.textColor;
      ctx.fillText(label, l.axisLW - 6 * dpr, y);
      // Grid line
      ctx.strokeStyle = COL.axisBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(l.chartX, y);
      ctx.lineTo(l.chartX + l.chartW, y);
      ctx.stroke();
    }

    // ── Bottom axis (strike prices) ──
    ctx.fillStyle = 'rgba(10,14,26,0.92)';
    ctx.fillRect(l.chartX, l.axisBY, l.chartW, l.axisBH);

    ctx.fillStyle = opts.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const labelEvery = Math.max(1, Math.floor(strikes.length / 10));
    for (let i = 0; i < strikes.length; i += labelEvery) {
      const x = strikeToX(strikes[i].strike, strikes, l);
      ctx.fillText(strikes[i].strike.toString(), x, l.axisBY + 6 * dpr);
    }

    // Axis borders
    ctx.strokeStyle = COL.axisBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(l.chartX, l.chartY);
    ctx.lineTo(l.chartX, l.axisBY);
    ctx.moveTo(l.chartX, l.axisBY);
    ctx.lineTo(l.chartX + l.chartW, l.axisBY);
    ctx.stroke();
  }

  function drawStats(ctx: CanvasRenderingContext2D, l: ReturnType<typeof layout>) {
    if (!data) return;

    // Stats background
    ctx.fillStyle = 'rgba(10,14,26,0.94)';
    ctx.fillRect(0, 0, l.statsW, l.statsH);
    ctx.strokeStyle = COL.axisBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, l.statsH);
    ctx.lineTo(l.statsW, l.statsH);
    ctx.stroke();

    const fsLabel = Math.round(9 * dpr);
    const fsValue = Math.round(11 * dpr);
    const items = [
      { label: 'SPOT',      value: data.spotPrice.toFixed(2),                     color: COL.statText   },
      { label: 'GEX FLIP',  value: data.flipLevel.toFixed(0),                     color: COL.flipZone   },
      { label: 'CALL WALL', value: data.callWall.toFixed(0),                      color: COL.callWall   },
      { label: 'PUT WALL',  value: data.putWall.toFixed(0),                       color: COL.putWall    },
      { label: 'TOTAL GEX', value: (data.totalGex / 1e9).toFixed(2) + 'B',       color: COL.statText   },
    ];

    const spacing = l.statsW / items.length;
    const midY    = l.statsH / 2;

    for (let i = 0; i < items.length; i++) {
      const cx = spacing * i + spacing / 2;
      // Label
      ctx.font = `${fsLabel}px monospace`;
      ctx.fillStyle = opts.textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(items[i].label, cx, midY - 2 * dpr);
      // Value
      ctx.font = `bold ${fsValue}px monospace`;
      ctx.fillStyle = items[i].color;
      ctx.textBaseline = 'top';
      ctx.fillText(items[i].value, cx, midY + 1 * dpr);
    }
  }

  function drawEmpty(ctx: CanvasRenderingContext2D, l: ReturnType<typeof layout>) {
    const fs = Math.round(10 * dpr);
    ctx.fillStyle = opts.textColor;
    ctx.font = `${fs}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Waiting for GEX data\u2026', l.w / 2, l.h / 2);
  }

  // ── Data API ─────────────────────────────────────────────

  function setData(newData: GexData) {
    data = newData;
    draw();
  }

  // ── Simulation ───────────────────────────────────────────

  function generateGexData(spot: number): GexData {
    const interval  = opts.strikeInterval;
    const numAbove  = 18;
    const numBelow  = 18;
    const firstStrike = Math.round((spot - numBelow * interval) / interval) * interval;
    const strikes: GexStrike[] = [];

    let maxCallGamma = 0;
    let maxPutGamma  = 0;
    let callWallStrike = firstStrike;
    let putWallStrike  = firstStrike;
    let totalGex = 0;

    for (let i = 0; i < numAbove + numBelow + 1; i++) {
      const strike = firstStrike + i * interval;
      const dist   = strike - spot;
      const normD  = dist / (interval * 8);

      // Bell-curve shape: gamma peaks near ATM, decays OTM
      const atmFactor = Math.exp(-normD * normD * 0.5);
      // Calls dominate above spot, puts dominate below
      const callBias = 0.5 + 0.5 * Math.tanh(normD * 0.8);
      const putBias  = 1 - callBias;

      const baseMag   = (1.5 + Math.random() * 3.5) * 1e9;
      const callGamma = baseMag * atmFactor * (0.3 + callBias * 0.7) * (0.85 + Math.random() * 0.3);
      const putGamma  = baseMag * atmFactor * (0.3 + putBias  * 0.7) * (0.85 + Math.random() * 0.3);
      const netGamma  = callGamma - putGamma;

      const callOI = Math.round(callGamma / 1e6 * (8 + Math.random() * 4));
      const putOI  = Math.round(putGamma  / 1e6 * (8 + Math.random() * 4));

      strikes.push({ strike, callGamma, putGamma, netGamma, callOI, putOI });
      totalGex += netGamma;

      if (callGamma > maxCallGamma) { maxCallGamma = callGamma; callWallStrike = strike; }
      if (putGamma  > maxPutGamma)  { maxPutGamma  = putGamma;  putWallStrike  = strike; }
    }

    // Find flip level: where netGamma crosses zero (scan from low to high)
    let flipLevel = spot;
    for (let i = 1; i < strikes.length; i++) {
      if (strikes[i - 1].netGamma < 0 && strikes[i].netGamma >= 0) {
        // Linear interpolation
        const s0 = strikes[i - 1], s1 = strikes[i];
        const t  = -s0.netGamma / (s1.netGamma - s0.netGamma + 1e-12);
        flipLevel = s0.strike + t * (s1.strike - s0.strike);
        break;
      }
    }

    return { spotPrice: spot, strikes, flipLevel, callWall: callWallStrike, putWall: putWallStrike, totalGex };
  }

  function simTick() {
    // Gentle random walk with mean reversion
    simDrift += (Math.random() - 0.5) * 1.2;
    simDrift *= 0.92;
    simDrift -= (simSpot - opts.basePrice) * 0.002;
    simSpot += simDrift + (Math.random() - 0.5) * 2;
    simSpot = Math.round(simSpot * 100) / 100;

    setData(generateGexData(simSpot));
  }

  function startSimulation() {
    if (simTimer) return;
    simSpot  = opts.basePrice;
    simDrift = 0;
    simTick();
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
    setData,
    startSimulation,
    stopSimulation,
    setOptions(newOpts: Partial<GexChartOptions>) {
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
