export interface SparklineAnimationConfig {
  duration?: number;
  easing?: 'linear' | 'easeOut' | 'easeInOut';
}

export interface SparklineOptions {
  data?: number[];
  lineColor?: string;
  fillColor?: string;
  lineWidth?: number;
  upColor?: string;
  downColor?: string;
  background?: string;
  animation?: SparklineAnimationConfig;
}

export interface SparklineInstance {
  setData(data: number[]): void;
  setOptions(opts: Partial<SparklineOptions>): void;
  redraw(): void;
  resize(): void;
  dispose(): void;
}

function ease(t: number, type: string): number {
  if (type === 'easeOut') return 1 - Math.pow(1 - t, 3);
  if (type === 'easeInOut') return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  return t;
}

export function createSparkline(container: HTMLElement, options: SparklineOptions = {}): SparklineInstance {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  container.appendChild(canvas);

  let opts: Required<Omit<SparklineOptions, 'animation'>> & { animation?: SparklineAnimationConfig } = {
    data: options.data ?? [],
    lineColor: options.lineColor ?? '',
    fillColor: options.fillColor ?? '',
    lineWidth: options.lineWidth ?? 1.5,
    upColor: options.upColor ?? '#26a69a',
    downColor: options.downColor ?? '#ef5350',
    background: options.background ?? 'transparent',
    animation: options.animation,
  };

  let dpr = window.devicePixelRatio || 1;
  let animFrame = 0;
  let animStartTime = 0;

  function sizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(container.clientWidth * dpr);
    canvas.height = Math.round(container.clientHeight * dpr);
  }

  sizeCanvas();

  const ro = new ResizeObserver(() => {
    sizeCanvas();
    draw(1);
  });
  ro.observe(container);

  function draw(clipProgress: number = 1) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    if (opts.background !== 'transparent') {
      ctx.fillStyle = opts.background;
      ctx.fillRect(0, 0, w, h);
    }

    const data = opts.data;
    if (data.length < 2) return;

    const isUp = data[data.length - 1] >= data[0];
    const lineColor = opts.lineColor || (isUp ? opts.upColor : opts.downColor);

    let vMin = Infinity, vMax = -Infinity;
    for (const v of data) {
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
    const range = vMax - vMin || 1;

    const padX = 2 * dpr;
    const padY = 2 * dpr;
    const plotW = w - padX * 2;
    const plotH = h - padY * 2;
    const toX = (i: number) => padX + (i / (data.length - 1)) * plotW;
    const toY = (v: number) => padY + (1 - (v - vMin) / range) * plotH;

    const clipW = plotW * clipProgress;
    if (clipProgress < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(padX, 0, clipW + padX, h);
      ctx.clip();
    }

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(data[0]));
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(toX(i), toY(data[i]));
    }

    const fillColor = opts.fillColor || (lineColor + '30');
    if (fillColor !== 'none') {
      ctx.save();
      const fillPath = new Path2D();
      fillPath.moveTo(toX(0), toY(data[0]));
      for (let i = 1; i < data.length; i++) {
        fillPath.lineTo(toX(i), toY(data[i]));
      }
      fillPath.lineTo(toX(data.length - 1), h);
      fillPath.lineTo(toX(0), h);
      fillPath.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, fillColor);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fill(fillPath);
      ctx.restore();
    }

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = opts.lineWidth * dpr;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    if (clipProgress < 1) {
      ctx.restore();
    }
  }

  function runAnimation() {
    const anim = opts.animation;
    if (!anim || (anim.duration ?? 500) <= 0) {
      draw(1);
      return;
    }
    const duration = anim.duration ?? 500;
    const easingType = anim.easing ?? 'easeOut';
    if (animFrame) cancelAnimationFrame(animFrame);
    animStartTime = performance.now();

    function tick() {
      animFrame = requestAnimationFrame(() => {
        animFrame = 0;
        const elapsed = performance.now() - animStartTime;
        const t = Math.min(1, elapsed / duration);
        const prog = ease(t, easingType);
        draw(prog);
        if (t < 1) tick();
      });
    }
    tick();
  }

  runAnimation();

  return {
    setData(data: number[]) {
      opts.data = data;
      runAnimation();
    },
    setOptions(newOpts: Partial<SparklineOptions>) {
      opts = { ...opts, ...newOpts };
      runAnimation();
    },
    redraw: () => runAnimation(),
    resize() {
      sizeCanvas();
      runAnimation();
    },
    dispose() {
      ro.disconnect();
      if (animFrame) cancelAnimationFrame(animFrame);
      canvas.remove();
    },
  };
}
