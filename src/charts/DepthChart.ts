export interface DepthLevel {
  price: number;
  quantity: number;
}

export interface DepthAnimationConfig {
  duration?: number;
  easing?: 'linear' | 'easeOut' | 'easeInOut';
}

export interface DepthChartOptions {
  bids?: DepthLevel[];
  asks?: DepthLevel[];
  bidColor?: string;
  askColor?: string;
  bidFillColor?: string;
  askFillColor?: string;
  midPrice?: number;
  background?: string;
  textColor?: string;
  gridColor?: string;
  showLabels?: boolean;
  animation?: DepthAnimationConfig;
}

export interface DepthChartInstance {
  update(bids: DepthLevel[], asks: DepthLevel[]): void;
  setOptions(opts: Partial<DepthChartOptions>): void;
  redraw(): void;
  resize(): void;
  dispose(): void;
}

function hexLuminance(bg: string): boolean {
  if (bg.startsWith('#')) {
    const hex = bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  }
  return false;
}

function parseLuminance(color: string): boolean {
  if (color.startsWith('#')) return hexLuminance(color);
  const m = color.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    const r = +m[1], g = +m[2], b = +m[3];
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  }
  return false;
}

function isLightBg(bg: string, el?: HTMLElement): boolean {
  if (bg === 'transparent' && el) {
    let node: HTMLElement | null = el;
    while (node) {
      const cs = getComputedStyle(node);
      const c = cs.backgroundColor;
      if (c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)') {
        return parseLuminance(c);
      }
      node = node.parentElement;
    }
    return false;
  }
  return hexLuminance(bg);
}

function ease(t: number, type: string): number {
  if (type === 'easeOut') return 1 - Math.pow(1 - t, 3);
  if (type === 'easeInOut') return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  return t;
}

export function createDepthChart(container: HTMLElement, options: DepthChartOptions = {}): DepthChartInstance {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  container.appendChild(canvas);
  const cs = getComputedStyle(container);
  if (cs.position === 'static')
    container.style.position = 'relative';

  const animCfg = options.animation;
  const animDuration = animCfg?.duration ?? 600;
  const animEasing = animCfg?.easing ?? 'easeOut';
  const animEnabled = !!animCfg;

  const bg = options.background ?? 'transparent';
  const light = isLightBg(bg, container);
  let opts: Required<Omit<DepthChartOptions, 'animation'>> & { animation?: DepthAnimationConfig } = {
    bids: options.bids ?? [],
    asks: options.asks ?? [],
    bidColor: options.bidColor ?? '#26a69a',
    askColor: options.askColor ?? '#ef5350',
    bidFillColor: options.bidFillColor ?? 'rgba(38, 166, 154, 0.15)',
    askFillColor: options.askFillColor ?? 'rgba(239, 83, 80, 0.15)',
    midPrice: options.midPrice ?? 0,
    background: bg,
    textColor: options.textColor ?? (light ? '#334155' : '#787b86'),
    gridColor: options.gridColor ?? (light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'),
    showLabels: options.showLabels ?? true,
    animation: options.animation,
  };

  let dpr = window.devicePixelRatio || 1;

  function resolveTextGridColors(explicitOpts?: Partial<DepthChartOptions>): void {
    if (opts.background !== 'transparent') return;
    const isLight = isLightBg(opts.background, container);
    if (explicitOpts?.textColor === undefined) {
      opts.textColor = isLight ? '#334155' : '#787b86';
    }
    if (explicitOpts?.gridColor === undefined) {
      opts.gridColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
    }
  }

  function sizeCanvas(): void {
    dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  sizeCanvas();

  const ro = new ResizeObserver(() => {
    sizeCanvas();
    if (!animating) draw();
  });
  ro.observe(container);

  let animating = false;
  let animId = 0;

  function draw(animProg: number = 1): void {
    const ctx = canvas.getContext('2d');
    if (!ctx)
      return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (opts.background !== 'transparent') {
      ctx.fillStyle = opts.background;
      ctx.fillRect(0, 0, w, h);
    }

    const bids = opts.bids;
    const asks = opts.asks;
    if (bids.length === 0 && asks.length === 0)
      return;

    const bidCum: { price: number; cum: number }[] = [];
    let cumB = 0;
    for (const b of bids) {
      cumB += b.quantity;
      bidCum.push({ price: b.price, cum: cumB });
    }
    const askCum: { price: number; cum: number }[] = [];
    let cumA = 0;
    for (const a of asks) {
      cumA += a.quantity;
      askCum.push({ price: a.price, cum: cumA });
    }
    const maxCum = Math.max(cumB, cumA) || 1;

    const allPrices = [...bids.map(b => b.price), ...asks.map(a => a.price)];
    const pMin = Math.min(...allPrices);
    const pMax = Math.max(...allPrices);
    const pRange = pMax - pMin || 1;

    const marginLeft = 10 * dpr;
    const marginRight = 10 * dpr;
    const marginTop = 10 * dpr;
    const marginBottom = opts.showLabels ? 28 * dpr : 10 * dpr;
    const plotW = w - marginLeft - marginRight;
    const plotH = h - marginTop - marginBottom;
    const toX = (price: number) => marginLeft + ((price - pMin) / pRange) * plotW;
    const toY = (cum: number, growProg: number = 1) => {
      const scaledCum = cum * growProg;
      return marginTop + plotH - (scaledCum / maxCum) * plotH;
    };

    const fadeAlpha = animProg;
    const growProg = animProg;
    ctx.globalAlpha = fadeAlpha;

    ctx.strokeStyle = opts.gridColor;
    ctx.lineWidth = dpr * 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = marginTop + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(marginLeft + plotW, y);
      ctx.stroke();
    }

    if (bidCum.length > 0) {
      ctx.fillStyle = opts.bidFillColor;
      ctx.beginPath();
      ctx.moveTo(toX(bidCum[0].price), toY(0, growProg));
      for (let i = 0; i < bidCum.length; i++) {
        const x = toX(bidCum[i].price);
        const y = toY(bidCum[i].cum, growProg);
        if (i > 0) {
          ctx.lineTo(x, toY(bidCum[i - 1].cum, growProg));
        }
        ctx.lineTo(x, y);
      }
      const lastBid = bidCum[bidCum.length - 1];
      ctx.lineTo(toX(lastBid.price), toY(0, growProg));
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = opts.bidColor;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      for (let i = 0; i < bidCum.length; i++) {
        const x = toX(bidCum[i].price);
        const y = toY(bidCum[i].cum, growProg);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, toY(bidCum[i - 1].cum, growProg));
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    if (askCum.length > 0) {
      ctx.fillStyle = opts.askFillColor;
      ctx.beginPath();
      ctx.moveTo(toX(askCum[0].price), toY(0, growProg));
      for (let i = 0; i < askCum.length; i++) {
        const x = toX(askCum[i].price);
        const y = toY(askCum[i].cum, growProg);
        if (i > 0) {
          ctx.lineTo(x, toY(askCum[i - 1].cum, growProg));
        }
        ctx.lineTo(x, y);
      }
      const lastAsk = askCum[askCum.length - 1];
      ctx.lineTo(toX(lastAsk.price), toY(0, growProg));
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = opts.askColor;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      for (let i = 0; i < askCum.length; i++) {
        const x = toX(askCum[i].price);
        const y = toY(askCum[i].cum, growProg);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, toY(askCum[i - 1].cum, growProg));
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    const mid = opts.midPrice || (bids.length && asks.length ? (bids[0].price + asks[0].price) / 2 : 0);
    if (mid > pMin && mid < pMax) {
      ctx.strokeStyle = opts.textColor;
      ctx.lineWidth = dpr;
      ctx.setLineDash([4 * dpr, 3 * dpr]);
      const mx = toX(mid);
      ctx.beginPath();
      ctx.moveTo(mx, marginTop);
      ctx.lineTo(mx, marginTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (opts.showLabels) {
      ctx.fillStyle = opts.textColor;
      ctx.font = `${10 * dpr}px sans-serif`;
      ctx.textAlign = 'center';
      const labelCount = 7;
      for (let i = 0; i <= labelCount; i++) {
        const p = pMin + (pRange / labelCount) * i;
        const x = toX(p);
        ctx.fillText(p.toFixed(2), x, marginTop + plotH + 16 * dpr);
      }
    }

    ctx.globalAlpha = 1;
  }

  function startAnimation(): void {
    animating = true;
    const start = performance.now();
    const loop = (now: number) => {
      const elapsed = now - start;
      const prog = Math.min(elapsed / animDuration, 1);
      const easedProg = ease(prog, animEasing);
      draw(easedProg);
      if (prog < 1) {
        animId = requestAnimationFrame(loop);
      } else {
        animating = false;
      }
    };
    animId = requestAnimationFrame(loop);
  }

  if (animEnabled) {
    startAnimation();
  } else {
    draw();
  }

  return {
    update(bids: DepthLevel[], asks: DepthLevel[]) {
      opts.bids = bids;
      opts.asks = asks;
      if (animating) return;
      draw();
    },
    setOptions(newOpts: Partial<DepthChartOptions>) {
      opts = { ...opts, ...newOpts };
      resolveTextGridColors(newOpts);
      if (animating) return;
      draw();
    },
    redraw: () => { if (!animating) draw(); },
    resize() { sizeCanvas(); if (!animating) draw(); },
    dispose() {
      cancelAnimationFrame(animId);
      ro.disconnect();
      canvas.remove();
    },
  };
}
