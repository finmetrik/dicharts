async function et(t) {
  if (!navigator.gpu)
    throw new Error(
      "DiCharts: WebGPU is not supported in this browser. Please use Chrome 113+, Edge 113+, or Safari 18+."
    );
  const e = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance"
  });
  if (!e)
    throw new Error("DiCharts: Failed to obtain a WebGPU adapter.");
  const n = await e.requestDevice(), c = t.getContext("webgpu");
  if (!c)
    throw new Error("DiCharts: Could not get a WebGPU canvas context.");
  const i = navigator.gpu.getPreferredCanvasFormat();
  let s = window.devicePixelRatio || 1;
  const f = n.limits.maxTextureDimension2D;
  function l() {
    s = window.devicePixelRatio || 1;
    const d = t.clientWidth, h = t.clientHeight, y = Math.max(1, Math.min(Math.floor(d * s), f)), v = Math.max(1, Math.min(Math.floor(h * s), f));
    return t.width = y, t.height = v, { pw: y, ph: v };
  }
  l(), c.configure({
    device: n,
    format: i,
    alphaMode: "premultiplied"
  });
  let a = !1;
  const o = [];
  return n.lost.then((d) => {
    a = !0;
    const h = d.reason === "destroyed" ? "destroyed" : `GPU device lost: ${d.message || "unknown reason"}`;
    for (const y of o)
      try {
        y(h);
      } catch {
      }
  }), {
    device: n,
    context: c,
    format: i,
    canvas: t,
    get pixelWidth() {
      return t.width;
    },
    get pixelHeight() {
      return t.height;
    },
    get dpr() {
      return s;
    },
    get isDeviceLost() {
      return a;
    },
    resize() {
      a || (l(), c.configure({ device: n, format: i, alphaMode: "premultiplied" }));
    },
    onDeviceLost(d) {
      o.push(d), a && d("GPU device was already lost");
    },
    destroy() {
      n.destroy();
    }
  };
}
function tt(t) {
  let e = null, n = !1, c = !1, i = 0, s = 0, f = 0, l = 0;
  function a(r) {
    e = requestAnimationFrame(a);
    const d = i === 0 ? 0.016 : Math.min((r - i) / 1e3, 0.1);
    i = r, f += d, l++, f >= 0.5 && (s = Math.round(l / f), f = 0, l = 0), n && (n = !1, t(d));
  }
  return {
    requestRender() {
      n = !0, c && e === null && (i = 0, e = requestAnimationFrame(a));
    },
    start() {
      c || (c = !0, n = !0, i = 0, e = requestAnimationFrame(a));
    },
    stop() {
      c = !1, e !== null && (cancelAnimationFrame(e), e = null);
    },
    get running() {
      return c;
    },
    get fps() {
      return s;
    }
  };
}
const We = 70, nt = 28, ot = 10, it = 4;
function st(t, e, n, c) {
  const i = ot, s = c.timeAxis.visible ? nt : 4, f = c.priceAxis.position === "left" && c.priceAxis.visible ? We : it, l = c.priceAxis.position === "right" && c.priceAxis.visible ? We : 4, a = { top: i, right: l, bottom: s, left: f }, o = Math.max(1, t - f - l), r = Math.max(1, e - i - s), d = { x: f, y: i, width: o, height: r }, h = {
    x: Math.round(f * n),
    y: Math.round(i * n),
    width: Math.round(o * n),
    height: Math.round(r * n)
  };
  return {
    cssWidth: t,
    cssHeight: e,
    pixelWidth: Math.round(t * n),
    pixelHeight: Math.round(e * n),
    dpr: n,
    margins: a,
    plot: d,
    plotDevice: h
  };
}
function Pe(t, e, n, c) {
  return { domainMin: t, domainMax: e, rangeStart: n, rangeEnd: c };
}
function he(t, e) {
  const n = t.domainMax - t.domainMin;
  if (n === 0) return (t.rangeStart + t.rangeEnd) / 2;
  const c = (e - t.domainMin) / n;
  return t.rangeStart + c * (t.rangeEnd - t.rangeStart);
}
function $e(t, e) {
  const n = t.rangeEnd - t.rangeStart;
  if (n === 0) return (t.domainMin + t.domainMax) / 2;
  const c = (e - t.rangeStart) / n;
  return t.domainMin + c * (t.domainMax - t.domainMin);
}
function ce(t, e, n) {
  return he(t, e) / n * 2 - 1;
}
function le(t, e, n) {
  return 1 - he(t, e) / n * 2;
}
const rt = {
  background: "#131722",
  gridColor: "rgba(255, 255, 255, 0.06)",
  axisTextColor: "#787b86",
  axisBorderColor: "#363a45",
  crosshairColor: "#787b86",
  tooltipBackground: "#1e222d",
  tooltipBorder: "#363a45",
  tooltipText: "#d1d4dc",
  candleUpColor: "#26a69a",
  candleDownColor: "#ef5350",
  candleUpBorderColor: "#26a69a",
  candleDownBorderColor: "#ef5350",
  textColor: "#d1d4dc",
  textSecondary: "#787b86"
}, lt = {
  background: "#ffffff",
  gridColor: "rgba(0, 0, 0, 0.06)",
  axisTextColor: "#787b86",
  axisBorderColor: "#e0e3eb",
  crosshairColor: "#9598a1",
  tooltipBackground: "#ffffff",
  tooltipBorder: "#e0e3eb",
  tooltipText: "#131722",
  candleUpColor: "#26a69a",
  candleDownColor: "#ef5350",
  candleUpBorderColor: "#26a69a",
  candleDownBorderColor: "#ef5350",
  textColor: "#131722",
  textSecondary: "#787b86"
}, at = {
  dark: rt,
  light: lt
};
function Ae(t) {
  return at[t];
}
function ct(t) {
  let e = Math.max(256, t);
  return e--, e |= e >> 1, e |= e >> 2, e |= e >> 4, e |= e >> 8, e |= e >> 16, e++, e;
}
function ft(t) {
  return t + 3 & -4;
}
function de(t, e, n, c, i) {
  const s = ft(Math.max(4, n));
  if (e && e.capacityBytes >= s)
    return e;
  e == null || e.buffer.destroy();
  const f = ct(s);
  return { buffer: t.createBuffer({
    label: i ?? "dicharts-buffer",
    size: f,
    usage: c
  }), capacityBytes: f, usedBytes: 0 };
}
const dt = `// ---------------------------------------------------------------------------
// DiCharts – Candlestick Shader (instanced rendering)
// ---------------------------------------------------------------------------
// Each instance encodes one candlestick.  The vertex shader procedurally
// generates the body rectangle and two wick rectangles from per‑instance
// attributes.  18 vertices per instance (3 quads × 2 triangles × 3 verts).
// ---------------------------------------------------------------------------

struct Uniforms {
  wickWidth : f32,  // wick half‑width in clip‑space units
  _pad0     : f32,
  _pad1     : f32,
  _pad2     : f32,
};

@group(0) @binding(0) var<uniform> uni : Uniforms;

struct VsIn {
  // Per‑instance attributes (step mode = instance)
  @location(0) xClip       : f32,
  @location(1) openClip    : f32,
  @location(2) closeClip   : f32,
  @location(3) highClip    : f32,
  @location(4) lowClip     : f32,
  @location(5) bodyHalfW   : f32,
  @location(6) color       : vec4<f32>,
};

struct VsOut {
  @builtin(position) pos   : vec4<f32>,
  @location(0)       vColor : vec4<f32>,
};

@vertex
fn vs_main(
  ins : VsIn,
  @builtin(vertex_index) vid : u32,
) -> VsOut {
  // Determine body top / bottom (higher clip‑y is *up*).
  let bodyTop    = max(ins.openClip, ins.closeClip);
  let bodyBottom = min(ins.openClip, ins.closeClip);

  let bodyLeft  = ins.xClip - ins.bodyHalfW;
  let bodyRight = ins.xClip + ins.bodyHalfW;

  let wickLeft  = ins.xClip - uni.wickWidth;
  let wickRight = ins.xClip + uni.wickWidth;

  var x : f32 = 0.0;
  var y : f32 = 0.0;

  // --- Body quad (vertices 0–5) ---
  switch vid {
    case 0u: { x = bodyLeft;  y = bodyTop;    }  // TL
    case 1u: { x = bodyRight; y = bodyTop;    }  // TR
    case 2u: { x = bodyLeft;  y = bodyBottom; }  // BL
    case 3u: { x = bodyRight; y = bodyTop;    }  // TR
    case 4u: { x = bodyRight; y = bodyBottom; }  // BR
    case 5u: { x = bodyLeft;  y = bodyBottom; }  // BL

    // --- Upper wick (vertices 6–11) ---
    case 6u:  { x = wickLeft;  y = ins.highClip; }
    case 7u:  { x = wickRight; y = ins.highClip; }
    case 8u:  { x = wickLeft;  y = bodyTop;      }
    case 9u:  { x = wickRight; y = ins.highClip; }
    case 10u: { x = wickRight; y = bodyTop;      }
    case 11u: { x = wickLeft;  y = bodyTop;      }

    // --- Lower wick (vertices 12–17) ---
    case 12u: { x = wickLeft;  y = bodyBottom;  }
    case 13u: { x = wickRight; y = bodyBottom;  }
    case 14u: { x = wickLeft;  y = ins.lowClip; }
    case 15u: { x = wickRight; y = bodyBottom;  }
    case 16u: { x = wickRight; y = ins.lowClip; }
    case 17u: { x = wickLeft;  y = ins.lowClip; }

    default: {}
  }

  var out : VsOut;
  out.pos = vec4<f32>(x, y, 0.0, 1.0);
  out.vColor = ins.color;
  return out;
}

@fragment
fn fs_main(inp : VsOut) -> @location(0) vec4<f32> {
  return inp.vColor;
}
`, Ce = 10, ut = Ce * 4, ht = 18, pt = 6;
function ye(t) {
  let e = t.replace("#", "");
  e.length === 3 && (e = e[0] + e[0] + e[1] + e[1] + e[2] + e[2]);
  const n = parseInt(e, 16);
  return [(n >> 16) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, 1];
}
function Se(t) {
  if (Array.isArray(t)) return t;
  const e = t;
  return [e.timestamp, e.open, e.high, e.low, e.close];
}
function gt(t) {
  const { device: e, format: n } = t, c = e.createBuffer({
    label: "candle-uniforms",
    size: 16,
    // vec4 aligned
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  }), i = e.createShaderModule({
    label: "candle-shader",
    code: dt
  }), s = e.createRenderPipeline({
    label: "candle-pipeline",
    layout: "auto",
    vertex: {
      module: i,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: ut,
          stepMode: "instance",
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32" },
            // xClip
            { shaderLocation: 1, offset: 4, format: "float32" },
            // openClip
            { shaderLocation: 2, offset: 8, format: "float32" },
            // closeClip
            { shaderLocation: 3, offset: 12, format: "float32" },
            // highClip
            { shaderLocation: 4, offset: 16, format: "float32" },
            // lowClip
            { shaderLocation: 5, offset: 20, format: "float32" },
            // bodyHalfW
            { shaderLocation: 6, offset: 24, format: "float32x4" }
            // color
          ]
        }
      ]
    },
    fragment: {
      module: i,
      entryPoint: "fs_main",
      targets: [
        {
          format: n,
          blend: {
            color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }
          }
        }
      ]
    },
    primitive: { topology: "triangle-list" }
  }), f = e.createBindGroup({
    layout: s.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: c } }]
  });
  let l = null, a = null, o = 0, r = 0, d = !1, h = 0, y = 0, v = 1, x = 1, g = new Float32Array(0), w = new Float32Array(0);
  function T(A, G, Y, U, I, $) {
    const W = A.length;
    if (o = 0, r = 0, d = G.style === "hollow", W === 0) return;
    const q = ye(G.upColor || $.candleUpColor), p = ye(G.downColor || $.candleDownColor), u = ye(G.upBorderColor || $.candleUpBorderColor), M = ye(G.downBorderColor || $.candleDownBorderColor), m = ye($.background), b = I.pixelWidth, C = I.pixelHeight, k = 2 / b * I.dpr;
    let P;
    if (typeof G.bodyWidth == "string" && G.bodyWidth.endsWith("%")) {
      const j = parseFloat(G.bodyWidth) / 100;
      let Z;
      if (W > 1) {
        const z = Se(A[0])[0], K = Se(A[W - 1])[0];
        Z = Math.abs(ce(Y, K, b) - ce(Y, z, b)) / (W - 1);
      } else
        Z = 8 * k;
      P = Z * j / 2;
    } else
      P = (typeof G.bodyWidth == "number" ? G.bodyWidth : 8) * k / 2;
    P = Math.max(k * 0.5, Math.min(P, 0.5));
    const E = k / 2, H = new Float32Array([E, 0, 0, 0]);
    e.queue.writeBuffer(c, 0, H);
    const N = W * Ce;
    g.length < N && (g = new Float32Array(N));
    let _ = 0;
    if (d)
      for (let j = 0; j < W; j++) {
        const Z = Se(A[j]);
        Z[4] >= Z[1] && _++;
      }
    const V = _ * Ce;
    w.length < V && (w = new Float32Array(Math.max(V, 64)));
    let L = 0, O = 0;
    for (let j = 0; j < W; j++) {
      const Z = Se(A[j]), [z, K, J, ee, oe] = Z;
      if (!isFinite(K) || !isFinite(J) || !isFinite(ee) || !isFinite(oe)) continue;
      const ae = ce(Y, z, b), ne = le(U, K, C), X = le(U, oe, C), ie = le(U, J, C), te = le(U, ee, C), se = oe >= K;
      let fe;
      if (d ? fe = se ? u : M : fe = se ? q : p, g[L++] = ae, g[L++] = ne, g[L++] = X, g[L++] = ie, g[L++] = te, g[L++] = P, g[L++] = fe[0], g[L++] = fe[1], g[L++] = fe[2], g[L++] = fe[3], o++, d && se) {
        const pe = k * 1.5, we = Math.max(0, P - pe);
        we > 0 && (w[O++] = ae, w[O++] = ne, w[O++] = X, w[O++] = ie, w[O++] = te, w[O++] = we, w[O++] = m[0], w[O++] = m[1], w[O++] = m[2], w[O++] = m[3], r++);
      }
    }
    const S = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, D = g.subarray(0, o * Ce);
    if (l = de(e, l, D.byteLength, S, "candle-instances"), e.queue.writeBuffer(l.buffer, 0, D.buffer, D.byteOffset, D.byteLength), d && r > 0) {
      const j = w.subarray(0, r * Ce);
      a = de(e, a, j.byteLength, S, "candle-hollow"), e.queue.writeBuffer(a.buffer, 0, j.buffer, j.byteOffset, j.byteLength);
    }
    h = I.plotDevice.x, y = I.plotDevice.y, v = I.plotDevice.width, x = I.plotDevice.height;
  }
  function F(A) {
    o === 0 || !l || (A.setPipeline(s), A.setBindGroup(0, f), A.setScissorRect(h, y, v, x), A.setVertexBuffer(0, l.buffer), A.draw(ht, o), d && r > 0 && a && (A.setVertexBuffer(0, a.buffer), A.draw(pt, r)), A.setScissorRect(0, 0, t.pixelWidth, t.pixelHeight));
  }
  function B() {
    l == null || l.buffer.destroy(), a == null || a.buffer.destroy(), c.destroy(), l = null, a = null;
  }
  return { prepare: T, render: F, dispose: B };
}
const mt = `// ---------------------------------------------------------------------------
// DiCharts – Grid / Line Shader
// ---------------------------------------------------------------------------
// Draws line‑list primitives.  Vertices are pre‑computed in clip space on
// the CPU.  This shader is also reused by the crosshair renderer.
// ---------------------------------------------------------------------------

struct Uniforms {
  color : vec4<f32>,
};

@group(0) @binding(0) var<uniform> uni : Uniforms;

struct VsOut {
  @builtin(position) pos   : vec4<f32>,
  @location(0)       vColor : vec4<f32>,
};

@vertex
fn vs_main(@location(0) position : vec2<f32>) -> VsOut {
  var out : VsOut;
  out.pos = vec4<f32>(position, 0.0, 1.0);
  out.vColor = uni.color;
  return out;
}

@fragment
fn fs_main(inp : VsOut) -> @location(0) vec4<f32> {
  return inp.vColor;
}
`;
function xt(t) {
  const e = t.match(/rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (e)
    return [
      parseFloat(e[1]) / 255,
      parseFloat(e[2]) / 255,
      parseFloat(e[3]) / 255,
      e[4] !== void 0 ? parseFloat(e[4]) : 1
    ];
  let n = t.replace("#", "");
  n.length === 3 && (n = n[0] + n[0] + n[1] + n[1] + n[2] + n[2]);
  const c = parseInt(n, 16);
  return [(c >> 16) / 255, (c >> 8 & 255) / 255, (c & 255) / 255, 1];
}
function bt(t) {
  const { device: e, format: n } = t, c = e.createShaderModule({
    label: "grid-shader",
    code: mt
  }), i = e.createBuffer({
    label: "grid-uniforms",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  }), s = e.createRenderPipeline({
    label: "grid-pipeline",
    layout: "auto",
    vertex: {
      module: c,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 8,
          // vec2<f32>
          stepMode: "vertex",
          attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }]
        }
      ]
    },
    fragment: {
      module: c,
      entryPoint: "fs_main",
      targets: [
        {
          format: n,
          blend: {
            color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }
          }
        }
      ]
    },
    primitive: { topology: "line-list" }
  }), f = e.createBindGroup({
    layout: s.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: i } }]
  });
  let l = null, a = 0;
  function o(h, y, v, x) {
    const g = xt(y.gridColor);
    e.queue.writeBuffer(i, 0, new Float32Array(g));
    const w = h.pixelWidth, T = h.pixelHeight, F = h.plotDevice, B = F.x / w * 2 - 1, A = (F.x + F.width) / w * 2 - 1, G = 1 - F.y / T * 2, Y = 1 - (F.y + F.height) / T * 2, U = v + x, I = U * 4, $ = new Float32Array(I);
    let W = 0;
    for (let p = 0; p < v; p++) {
      const u = v === 1 ? 0.5 : p / (v - 1), M = G + u * (Y - G);
      $[W++] = B, $[W++] = M, $[W++] = A, $[W++] = M;
    }
    for (let p = 0; p < x; p++) {
      const u = x === 1 ? 0.5 : p / (x - 1), M = B + u * (A - B);
      $[W++] = M, $[W++] = G, $[W++] = M, $[W++] = Y;
    }
    a = U * 2;
    const q = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
    l = de(e, l, $.byteLength, q, "grid-verts"), e.queue.writeBuffer(l.buffer, 0, $);
  }
  function r(h) {
    a === 0 || !l || (h.setPipeline(s), h.setBindGroup(0, f), h.setVertexBuffer(0, l.buffer), h.draw(a));
  }
  function d() {
    l == null || l.buffer.destroy(), i.destroy(), l = null;
  }
  return { prepare: o, render: r, dispose: d };
}
const yt = `// ---------------------------------------------------------------------------
// DiCharts – Crosshair Shader
// ---------------------------------------------------------------------------
// Identical to the grid shader – thin lines rendered as line‑list.
// Separated for clarity / future customisation.
// ---------------------------------------------------------------------------

struct Uniforms {
  color : vec4<f32>,
};

@group(0) @binding(0) var<uniform> uni : Uniforms;

struct VsOut {
  @builtin(position) pos   : vec4<f32>,
  @location(0)       vColor : vec4<f32>,
};

@vertex
fn vs_main(@location(0) position : vec2<f32>) -> VsOut {
  var out : VsOut;
  out.pos = vec4<f32>(position, 0.0, 1.0);
  out.vColor = uni.color;
  return out;
}

@fragment
fn fs_main(inp : VsOut) -> @location(0) vec4<f32> {
  return inp.vColor;
}
`;
function vt(t) {
  const { device: e, format: n } = t, c = e.createShaderModule({
    label: "crosshair-shader",
    code: yt
  }), i = e.createBuffer({
    label: "crosshair-uniforms",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  }), s = e.createRenderPipeline({
    label: "crosshair-pipeline",
    layout: "auto",
    vertex: {
      module: c,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 8,
          stepMode: "vertex",
          attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }]
        }
      ]
    },
    fragment: {
      module: c,
      entryPoint: "fs_main",
      targets: [
        {
          format: n,
          blend: {
            color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }
          }
        }
      ]
    },
    primitive: { topology: "line-list" }
  }), f = e.createBindGroup({
    layout: s.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: i } }]
  });
  let l = null, a = 0;
  function o(h, y, v, x, g = 6, w = 4) {
    if (e.queue.writeBuffer(i, 0, new Float32Array(y)), v === null && x === null) {
      a = 0;
      return;
    }
    const T = h.pixelWidth, F = h.pixelHeight, B = h.plotDevice, A = B.x / T * 2 - 1, G = (B.x + B.width) / T * 2 - 1, Y = 1 - B.y / F * 2, U = 1 - (B.y + B.height) / F * 2, I = [];
    if (v !== null) {
      const q = v / T * 2 - 1, p = B.height, u = g + w;
      let M = 0;
      for (; M < p; ) {
        const m = Math.min(M + g, p), b = M / p, C = m / p, R = Y + b * (U - Y), k = Y + C * (U - Y);
        I.push(q, R, q, k), M += u;
      }
    }
    if (x !== null) {
      const q = 1 - x / F * 2, p = B.width, u = g + w;
      let M = 0;
      for (; M < p; ) {
        const m = Math.min(M + g, p), b = M / p, C = m / p, R = A + b * (G - A), k = A + C * (G - A);
        I.push(R, q, k, q), M += u;
      }
    }
    const $ = new Float32Array(I);
    a = $.length / 2;
    const W = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
    l = de(e, l, $.byteLength, W, "crosshair-verts"), e.queue.writeBuffer(l.buffer, 0, $);
  }
  function r(h) {
    a === 0 || !l || (h.setPipeline(s), h.setBindGroup(0, f), h.setVertexBuffer(0, l.buffer), h.draw(a));
  }
  function d() {
    l == null || l.buffer.destroy(), i.destroy(), l = null;
  }
  return { prepare: o, render: r, dispose: d };
}
function _e(t, e, n) {
  if (!isFinite(t) || !isFinite(e) || t >= e) return [];
  const i = (e - t) / Math.max(1, n), s = Math.pow(10, Math.floor(Math.log10(i))), f = i / s;
  let l;
  f <= 1.5 ? l = 1 * s : f <= 3 ? l = 2 * s : f <= 7 ? l = 5 * s : l = 10 * s;
  const a = Math.ceil(t / l) * l, o = [];
  for (let r = a; r <= e + l * 1e-3; r += l)
    o.push(r);
  return o;
}
function Ct(t) {
  return t >= 1 ? 0 : Math.max(0, -Math.floor(Math.log10(t)) + 1);
}
function wt(t) {
  const e = new Date(t), n = String(e.getHours()).padStart(2, "0"), c = String(e.getMinutes()).padStart(2, "0"), i = String(e.getMonth() + 1).padStart(2, "0"), s = String(e.getDate()).padStart(2, "0");
  return `${i}/${s} ${n}:${c}`;
}
function Mt(t) {
  const e = document.createElement("div");
  e.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;", t.appendChild(e);
  const n = [];
  let c = 0;
  function i() {
    if (c < n.length) {
      const d = n[c++];
      return d.style.display = "", d;
    }
    const r = document.createElement("div");
    return r.style.cssText = "position:absolute;font-size:11px;line-height:1;white-space:nowrap;pointer-events:none;", e.appendChild(r), n.push(r), c++, r;
  }
  function s() {
    for (let r = c; r < n.length; r++)
      n[r].style.display = "none";
    c = 0;
  }
  const f = document.createElement("div");
  f.style.cssText = "position:absolute;top:0;width:1px;pointer-events:none;", e.appendChild(f);
  const l = document.createElement("div");
  l.style.cssText = "position:absolute;left:0;height:1px;pointer-events:none;", e.appendChild(l);
  function a(r, d, h, y, v) {
    s();
    const x = r.plot, g = r.dpr, w = v.axisTextColor, T = v.axisBorderColor, F = Math.max(2, Math.floor(x.height / 60)), B = _e(h.domainMin, h.domainMax, F), A = B.length > 1 ? Ct(B[1] - B[0]) : 2;
    if (y.priceAxis.visible) {
      const U = y.priceAxis.position === "right";
      f.style.display = "", f.style.height = `${x.height}px`, f.style.top = `${x.y}px`, f.style.left = U ? `${x.x + x.width}px` : `${x.x}px`, f.style.backgroundColor = T;
      for (const I of B) {
        const $ = he(h, I) / g;
        if ($ < x.y - 5 || $ > x.y + x.height + 5) continue;
        const W = i();
        W.textContent = I.toFixed(A), W.style.color = w, W.style.top = `${$ - 6}px`, U ? (W.style.left = `${x.x + x.width + 6}px`, W.style.right = "") : (W.style.right = `${r.cssWidth - x.x + 6}px`, W.style.left = "");
      }
    } else
      f.style.display = "none";
    const G = Math.max(2, Math.floor(x.width / 120)), Y = _e(d.domainMin, d.domainMax, G);
    if (y.timeAxis.visible) {
      l.style.display = "", l.style.width = `${x.width}px`, l.style.top = `${x.y + x.height}px`, l.style.left = `${x.x}px`, l.style.backgroundColor = T;
      for (const U of Y) {
        const I = he(d, U) / g;
        if (I < x.x - 20 || I > x.x + x.width + 20) continue;
        const $ = i();
        $.textContent = wt(U), $.style.color = w, $.style.top = `${x.y + x.height + 6}px`, $.style.left = `${I - 30}px`;
      }
    } else
      l.style.display = "none";
    return { priceTicks: B, timeTicks: Y };
  }
  function o() {
    e.remove();
  }
  return { update: a, dispose: o };
}
const Pt = `// ---------------------------------------------------------------------------
// DiCharts – Volume Bar Shader (instanced)
// ---------------------------------------------------------------------------
// Each instance is one volume bar. 6 vertices per instance (1 quad).
// Per-instance: xClip, topClip, bottomClip, halfWidth, r, g, b, a
// ---------------------------------------------------------------------------

struct VsIn {
  @location(0) xClip     : f32,
  @location(1) topClip   : f32,
  @location(2) bottomClip: f32,
  @location(3) halfWidth : f32,
  @location(4) color     : vec4<f32>,
};

struct VsOut {
  @builtin(position) pos   : vec4<f32>,
  @location(0)       vColor : vec4<f32>,
};

@vertex
fn vs_main(
  ins : VsIn,
  @builtin(vertex_index) vid : u32,
) -> VsOut {
  let left  = ins.xClip - ins.halfWidth;
  let right = ins.xClip + ins.halfWidth;

  var x : f32 = 0.0;
  var y : f32 = 0.0;

  switch vid {
    case 0u: { x = left;  y = ins.topClip;    }
    case 1u: { x = right; y = ins.topClip;    }
    case 2u: { x = left;  y = ins.bottomClip; }
    case 3u: { x = right; y = ins.topClip;    }
    case 4u: { x = right; y = ins.bottomClip; }
    case 5u: { x = left;  y = ins.bottomClip; }
    default: {}
  }

  var out : VsOut;
  out.pos = vec4<f32>(x, y, 0.0, 1.0);
  out.vColor = ins.color;
  return out;
}

@fragment
fn fs_main(inp : VsOut) -> @location(0) vec4<f32> {
  return inp.vColor;
}
`, Le = 8, St = 6;
function Ve(t) {
  let e = t.replace("#", "");
  e.length === 3 && (e = e[0] + e[0] + e[1] + e[1] + e[2] + e[2]);
  const n = parseInt(e, 16);
  return [(n >> 16) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, 1];
}
function Tt(t) {
  const { device: e, format: n } = t, c = e.createShaderModule({
    label: "volume-shader",
    code: Pt
  }), i = e.createRenderPipeline({
    label: "volume-pipeline",
    layout: "auto",
    vertex: {
      module: c,
      entryPoint: "vs_main",
      buffers: [{
        arrayStride: Le * 4,
        stepMode: "instance",
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32" },
          // xClip
          { shaderLocation: 1, offset: 4, format: "float32" },
          // topClip
          { shaderLocation: 2, offset: 8, format: "float32" },
          // bottomClip
          { shaderLocation: 3, offset: 12, format: "float32" },
          // halfWidth
          { shaderLocation: 4, offset: 16, format: "float32x4" }
          // color
        ]
      }]
    },
    fragment: {
      module: c,
      entryPoint: "fs_main",
      targets: [{
        format: n,
        blend: {
          color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      }]
    },
    primitive: { topology: "triangle-list" }
  });
  let s = null, f = 0, l = new Float32Array(0);
  function a(d, h, y, v, x, g, w) {
    const T = Math.min(d.length, h.length);
    if (f = 0, T === 0) return;
    const F = v.pixelWidth, B = v.pixelHeight, A = v.plotDevice, Y = 2 / F * v.dpr, U = A.y + A.height, I = A.y + A.height * 0.8, $ = 1 - U / B * 2, W = Math.abs(1 - I / B * 2 - $);
    let q = 0;
    for (let P = 0; P < T; P++)
      h[P] > q && (q = h[P]);
    q === 0 && (q = 1);
    let p = 0;
    T > 1 ? p = Math.abs(ce(y, d[T - 1][0], F) - ce(y, d[0][0], F)) / (T - 1) : p = 8 * Y;
    const u = p * 0.7 / 2, M = Ve(g), m = Ve(w);
    M[3] = 0.35, m[3] = 0.35;
    const b = T * Le;
    l.length < b && (l = new Float32Array(b));
    let C = 0;
    for (let P = 0; P < T; P++) {
      const E = d[P], H = h[P];
      if (!isFinite(H) || H <= 0) continue;
      const N = ce(y, E[0], F), _ = H / q * W, V = $ + _, L = E[4] >= E[1];
      l[C++] = N, l[C++] = V, l[C++] = $, l[C++] = u;
      const O = L ? M : m;
      l[C++] = O[0], l[C++] = O[1], l[C++] = O[2], l[C++] = O[3], f++;
    }
    const R = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, k = l.subarray(0, f * Le);
    s = de(e, s, k.byteLength, R, "volume-instances"), e.queue.writeBuffer(s.buffer, 0, k.buffer, k.byteOffset, k.byteLength);
  }
  function o(d) {
    f === 0 || !s || (d.setPipeline(i), d.setVertexBuffer(0, s.buffer), d.draw(St, f));
  }
  function r() {
    s == null || s.buffer.destroy(), s = null;
  }
  return { prepare: a, render: o, dispose: r };
}
const Je = `// ---------------------------------------------------------------------------
// DiCharts – Line Overlay Shader
// ---------------------------------------------------------------------------
// Draws line-strip or line-list primitives. Each vertex has position + color.
// Used for line overlays (MA, EMA, Bollinger), order lines, price line.
// ---------------------------------------------------------------------------

struct VsOut {
  @builtin(position) pos   : vec4<f32>,
  @location(0)       vColor : vec4<f32>,
};

@vertex
fn vs_main(
  @location(0) position : vec2<f32>,
  @location(1) color    : vec4<f32>,
) -> VsOut {
  var out : VsOut;
  out.pos = vec4<f32>(position, 0.0, 1.0);
  out.vColor = color;
  return out;
}

@fragment
fn fs_main(inp : VsOut) -> @location(0) vec4<f32> {
  return inp.vColor;
}
`;
function Ie(t) {
  let e = t.replace("#", "");
  e.length === 3 && (e = e[0] + e[0] + e[1] + e[1] + e[2] + e[2]);
  const n = parseInt(e, 16);
  return [(n >> 16) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, 1];
}
const Te = 6;
function Rt(t) {
  const { device: e, format: n } = t, c = e.createShaderModule({
    label: "line-overlay-shader",
    code: Je
  }), i = e.createRenderPipeline({
    label: "line-overlay-pipeline",
    layout: "auto",
    vertex: {
      module: c,
      entryPoint: "vs_main",
      buffers: [{
        arrayStride: Te * 4,
        stepMode: "vertex",
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x2" },
          // position
          { shaderLocation: 1, offset: 8, format: "float32x4" }
          // color
        ]
      }]
    },
    fragment: {
      module: c,
      entryPoint: "fs_main",
      targets: [{
        format: n,
        blend: {
          color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      }]
    },
    primitive: { topology: "line-strip" }
  }), s = e.createRenderPipeline({
    label: "line-list-pipeline",
    layout: "auto",
    vertex: {
      module: c,
      entryPoint: "vs_main",
      buffers: [{
        arrayStride: Te * 4,
        stepMode: "vertex",
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x2" },
          { shaderLocation: 1, offset: 8, format: "float32x4" }
        ]
      }]
    },
    fragment: {
      module: c,
      entryPoint: "fs_main",
      targets: [{
        format: n,
        blend: {
          color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      }]
    },
    primitive: { topology: "line-list" }
  });
  let f = [], l = [], a = null, o = 0, r = 0, d = 0, h = 1, y = 1;
  function v(w, T, F, B, A) {
    var M;
    const G = A.pixelWidth, Y = A.pixelHeight, U = A.plotDevice;
    r = U.x, d = U.y, h = U.width, y = U.height;
    const I = U.x / G * 2 - 1, $ = (U.x + U.width) / G * 2 - 1;
    for (; f.length > w.length; )
      (M = f.pop()) == null || M.buffer.destroy(), l.pop();
    for (let m = 0; m < w.length; m++) {
      const b = w[m], C = b.points, R = Ie(b.color);
      R[3] = b.opacity ?? 1;
      const k = new Float32Array(C.length * Te);
      let P = 0;
      for (const [_, V] of C)
        k[P++] = ce(F, _, G), k[P++] = le(B, V, Y), k[P++] = R[0], k[P++] = R[1], k[P++] = R[2], k[P++] = R[3];
      const E = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, H = m < f.length ? f[m] : null, N = de(e, H, k.byteLength, E, `overlay-strip-${m}`);
      e.queue.writeBuffer(N.buffer, 0, k), m < f.length ? (f[m] = N, l[m] = C.length) : (f.push(N), l.push(C.length));
    }
    const W = 6, q = 4, p = [];
    for (const m of T) {
      const b = le(B, m.price, Y), C = Ie(m.color);
      if (C[3] = m.opacity ?? 1, m.dashed) {
        const R = U.width, k = W + q;
        let P = 0;
        for (; P < R; ) {
          const E = Math.min(P + W, R), H = P / R, N = E / R, _ = I + H * ($ - I), V = I + N * ($ - I);
          p.push(_, b, C[0], C[1], C[2], C[3]), p.push(V, b, C[0], C[1], C[2], C[3]), P += k;
        }
      } else
        p.push(I, b, C[0], C[1], C[2], C[3]), p.push($, b, C[0], C[1], C[2], C[3]);
    }
    const u = new Float32Array(p);
    if (o = u.length / Te, o > 0) {
      const m = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
      a = de(e, a, u.byteLength, m, "overlay-list"), e.queue.writeBuffer(a.buffer, 0, u);
    }
  }
  function x(w) {
    if (w.setScissorRect(r, d, h, y), f.length > 0) {
      w.setPipeline(i);
      for (let T = 0; T < f.length; T++)
        l[T] < 2 || (w.setVertexBuffer(0, f[T].buffer), w.draw(l[T]));
    }
    o > 0 && a && (w.setPipeline(s), w.setVertexBuffer(0, a.buffer), w.draw(o)), w.setScissorRect(0, 0, t.pixelWidth, t.pixelHeight);
  }
  function g() {
    for (const w of f) w.buffer.destroy();
    f = [], l = [], a == null || a.buffer.destroy(), a = null;
  }
  return { prepare: v, render: x, dispose: g };
}
const Lt = `// ---------------------------------------------------------------------------
// DiCharts – OHLC Bar Shader (instanced)
// ---------------------------------------------------------------------------
// Each instance is one OHLC bar: a vertical high-low line, plus
// a small horizontal tick on the left for open and on the right for close.
// 18 vertices per instance (3 quads: stem, open tick, close tick).
// ---------------------------------------------------------------------------

struct Uniforms {
  wickWidth : f32,
  tickLen   : f32,
  _pad1     : f32,
  _pad2     : f32,
};

@group(0) @binding(0) var<uniform> uni : Uniforms;

struct VsIn {
  @location(0) xClip       : f32,
  @location(1) openClip    : f32,
  @location(2) closeClip   : f32,
  @location(3) highClip    : f32,
  @location(4) lowClip     : f32,
  @location(5) bodyHalfW   : f32, // used as tick length here
  @location(6) color       : vec4<f32>,
};

struct VsOut {
  @builtin(position) pos   : vec4<f32>,
  @location(0)       vColor : vec4<f32>,
};

@vertex
fn vs_main(
  ins : VsIn,
  @builtin(vertex_index) vid : u32,
) -> VsOut {
  let ww = uni.wickWidth;
  let tl = ins.bodyHalfW; // tick length (half of body width)

  var x : f32 = 0.0;
  var y : f32 = 0.0;

  // --- Vertical stem: high to low (vertices 0–5) ---
  switch vid {
    case 0u: { x = ins.xClip - ww; y = ins.highClip; }
    case 1u: { x = ins.xClip + ww; y = ins.highClip; }
    case 2u: { x = ins.xClip - ww; y = ins.lowClip;  }
    case 3u: { x = ins.xClip + ww; y = ins.highClip; }
    case 4u: { x = ins.xClip + ww; y = ins.lowClip;  }
    case 5u: { x = ins.xClip - ww; y = ins.lowClip;  }

    // --- Open tick: horizontal bar on the LEFT (vertices 6–11) ---
    case 6u:  { x = ins.xClip - tl; y = ins.openClip + ww; }
    case 7u:  { x = ins.xClip;      y = ins.openClip + ww; }
    case 8u:  { x = ins.xClip - tl; y = ins.openClip - ww; }
    case 9u:  { x = ins.xClip;      y = ins.openClip + ww; }
    case 10u: { x = ins.xClip;      y = ins.openClip - ww; }
    case 11u: { x = ins.xClip - tl; y = ins.openClip - ww; }

    // --- Close tick: horizontal bar on the RIGHT (vertices 12–17) ---
    case 12u: { x = ins.xClip;      y = ins.closeClip + ww; }
    case 13u: { x = ins.xClip + tl; y = ins.closeClip + ww; }
    case 14u: { x = ins.xClip;      y = ins.closeClip - ww; }
    case 15u: { x = ins.xClip + tl; y = ins.closeClip + ww; }
    case 16u: { x = ins.xClip + tl; y = ins.closeClip - ww; }
    case 17u: { x = ins.xClip;      y = ins.closeClip - ww; }

    default: {}
  }

  var out : VsOut;
  out.pos = vec4<f32>(x, y, 0.0, 1.0);
  out.vColor = ins.color;
  return out;
}

@fragment
fn fs_main(inp : VsOut) -> @location(0) vec4<f32> {
  return inp.vColor;
}
`, kt = `// ---------------------------------------------------------------------------
// DiCharts – Area Fill Shader
// ---------------------------------------------------------------------------
// Draws filled triangles for area / baseline chart styles.
// Each vertex has position + color (with alpha for gradient effect).
// Uses triangle-list topology.
// ---------------------------------------------------------------------------

struct VsOut {
  @builtin(position) pos   : vec4<f32>,
  @location(0)       vColor : vec4<f32>,
};

@vertex
fn vs_main(
  @location(0) position : vec2<f32>,
  @location(1) color    : vec4<f32>,
) -> VsOut {
  var out : VsOut;
  out.pos = vec4<f32>(position, 0.0, 1.0);
  out.vColor = color;
  return out;
}

@fragment
fn fs_main(inp : VsOut) -> @location(0) vec4<f32> {
  return inp.vColor;
}
`;
function xe(t) {
  let e = t.replace("#", "");
  e.length === 3 && (e = e[0] + e[0] + e[1] + e[1] + e[2] + e[2]);
  const n = parseInt(e, 16);
  return [(n >> 16) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, 1];
}
const ke = 10, Bt = 18, be = 6;
function Ft(t) {
  const { device: e, format: n } = t, c = e.createShaderModule({ label: "bar-shader", code: Lt }), i = e.createBuffer({
    label: "bar-uniforms",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  }), s = e.createRenderPipeline({
    label: "bar-pipeline",
    layout: "auto",
    vertex: {
      module: c,
      entryPoint: "vs_main",
      buffers: [{
        arrayStride: ke * 4,
        stepMode: "instance",
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32" },
          { shaderLocation: 1, offset: 4, format: "float32" },
          { shaderLocation: 2, offset: 8, format: "float32" },
          { shaderLocation: 3, offset: 12, format: "float32" },
          { shaderLocation: 4, offset: 16, format: "float32" },
          { shaderLocation: 5, offset: 20, format: "float32" },
          { shaderLocation: 6, offset: 24, format: "float32x4" }
        ]
      }]
    },
    fragment: {
      module: c,
      entryPoint: "fs_main",
      targets: [{ format: n }]
    },
    primitive: { topology: "triangle-list" }
  }), f = e.createBindGroup({
    layout: s.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: i } }]
  }), l = e.createShaderModule({ label: "series-line-shader", code: Je }), a = e.createRenderPipeline({
    label: "series-line-pipeline",
    layout: "auto",
    vertex: {
      module: l,
      entryPoint: "vs_main",
      buffers: [{
        arrayStride: be * 4,
        stepMode: "vertex",
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x2" },
          { shaderLocation: 1, offset: 8, format: "float32x4" }
        ]
      }]
    },
    fragment: {
      module: l,
      entryPoint: "fs_main",
      targets: [{
        format: n,
        blend: {
          color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      }]
    },
    primitive: { topology: "line-strip" }
  }), o = e.createShaderModule({ label: "area-shader", code: kt }), r = e.createRenderPipeline({
    label: "area-pipeline",
    layout: "auto",
    vertex: {
      module: o,
      entryPoint: "vs_main",
      buffers: [{
        arrayStride: be * 4,
        stepMode: "vertex",
        attributes: [
          { shaderLocation: 0, offset: 0, format: "float32x2" },
          { shaderLocation: 1, offset: 8, format: "float32x4" }
        ]
      }]
    },
    fragment: {
      module: o,
      entryPoint: "fs_main",
      targets: [{
        format: n,
        blend: {
          color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }
        }
      }]
    },
    primitive: { topology: "triangle-list" }
  });
  let d = null, h = 0, y = null, v = 0, x = null, g = 0, w = "", T = 0, F = 0, B = 1, A = 1;
  function G(p, u, M, m, b, C) {
    const R = p.length;
    if (h = 0, v = 0, g = 0, w = u.style, R === 0) return;
    T = b.plotDevice.x, F = b.plotDevice.y, B = b.plotDevice.width, A = b.plotDevice.height;
    const k = b.pixelWidth, P = b.pixelHeight;
    if (u.style === "bar")
      Y(p, u, M, m, b, C, k, P);
    else if (u.style === "line")
      U(p, u, M, m, k, P);
    else if (u.style === "area")
      U(p, u, M, m, k, P), I(p, u, M, m, b, k, P);
    else if (u.style === "baseline") {
      const E = u.baselinePrice ?? p[0][4];
      $(p, u, M, m, b, k, P, E);
    }
  }
  function Y(p, u, M, m, b, C, R, k) {
    const P = p.length, H = 2 / R * b.dpr, N = H / 2;
    let _;
    P > 1 ? _ = Math.abs(ce(M, p[P - 1][0], R) - ce(M, p[0][0], R)) / (P - 1) * 0.35 : _ = 8 * H;
    const V = new Float32Array([N, _, 0, 0]);
    e.queue.writeBuffer(i, 0, V);
    const L = xe(u.upColor), O = xe(u.downColor), S = new Float32Array(P * ke);
    let D = 0;
    for (let z = 0; z < P; z++) {
      const [K, J, ee, oe, ae] = p[z];
      if (!isFinite(J)) continue;
      const ne = ce(M, K, R), X = le(m, J, k), ie = le(m, ae, k), te = le(m, ee, k), se = le(m, oe, k), pe = ae >= J ? L : O;
      S[D++] = ne, S[D++] = X, S[D++] = ie, S[D++] = te, S[D++] = se, S[D++] = _, S[D++] = pe[0], S[D++] = pe[1], S[D++] = pe[2], S[D++] = pe[3], h++;
    }
    const j = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, Z = S.subarray(0, h * ke);
    d = de(e, d, Z.byteLength, j, "bar-instances"), e.queue.writeBuffer(d.buffer, 0, Z.buffer, Z.byteOffset, Z.byteLength);
  }
  function U(p, u, M, m, b, C) {
    const R = p.length, k = xe(u.lineColor), P = new Float32Array(R * be);
    let E = 0;
    for (let N = 0; N < R; N++) {
      const [_, , , , V] = p[N];
      P[E++] = ce(M, _, b), P[E++] = le(m, V, C), P[E++] = k[0], P[E++] = k[1], P[E++] = k[2], P[E++] = k[3];
    }
    v = R;
    const H = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
    y = de(e, y, P.byteLength, H, "series-line"), e.queue.writeBuffer(y.buffer, 0, P);
  }
  function I(p, u, M, m, b, C, R, k) {
    const P = p.length;
    if (P < 2) return;
    const E = xe(u.lineColor), H = 0.35, N = 0.02, _ = le(m, m.domainMin, R), V = P - 1, L = new Float32Array(V * 6 * be);
    let O = 0;
    for (let D = 0; D < V; D++) {
      const j = ce(M, p[D][0], C), Z = le(m, p[D][4], R), z = ce(M, p[D + 1][0], C), K = le(m, p[D + 1][4], R);
      L[O++] = j, L[O++] = Z, L[O++] = E[0], L[O++] = E[1], L[O++] = E[2], L[O++] = H, L[O++] = z, L[O++] = K, L[O++] = E[0], L[O++] = E[1], L[O++] = E[2], L[O++] = H, L[O++] = j, L[O++] = _, L[O++] = E[0], L[O++] = E[1], L[O++] = E[2], L[O++] = N, L[O++] = z, L[O++] = K, L[O++] = E[0], L[O++] = E[1], L[O++] = E[2], L[O++] = H, L[O++] = z, L[O++] = _, L[O++] = E[0], L[O++] = E[1], L[O++] = E[2], L[O++] = N, L[O++] = j, L[O++] = _, L[O++] = E[0], L[O++] = E[1], L[O++] = E[2], L[O++] = N;
    }
    g = V * 6;
    const S = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
    x = de(e, x, L.byteLength, S, "area-fill"), e.queue.writeBuffer(x.buffer, 0, L.buffer, L.byteOffset, L.byteLength);
  }
  function $(p, u, M, m, b, C, R, k) {
    const P = p.length;
    if (P < 2) return;
    const E = xe(u.upColor), H = xe(u.downColor), N = le(m, k, R), _ = new Float32Array(P * be);
    let V = 0;
    for (let z = 0; z < P; z++) {
      const [K, , , , J] = p[z], ee = ce(M, K, C), oe = le(m, J, R), ne = J >= k ? E : H;
      _[V++] = ee, _[V++] = oe, _[V++] = ne[0], _[V++] = ne[1], _[V++] = ne[2], _[V++] = 1;
    }
    v = P;
    const L = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
    y = de(e, y, _.byteLength, L, "baseline-line"), e.queue.writeBuffer(y.buffer, 0, _);
    const O = P - 1, S = new Float32Array(O * 6 * be);
    let D = 0;
    const j = 0.2, Z = 0.02;
    for (let z = 0; z < O; z++) {
      const K = ce(M, p[z][0], C), J = le(m, p[z][4], R), ee = ce(M, p[z + 1][0], C), oe = le(m, p[z + 1][4], R), X = (p[z][4] + p[z + 1][4]) / 2 >= k ? E : H;
      S[D++] = K, S[D++] = J, S[D++] = X[0], S[D++] = X[1], S[D++] = X[2], S[D++] = j, S[D++] = ee, S[D++] = oe, S[D++] = X[0], S[D++] = X[1], S[D++] = X[2], S[D++] = j, S[D++] = K, S[D++] = N, S[D++] = X[0], S[D++] = X[1], S[D++] = X[2], S[D++] = Z, S[D++] = ee, S[D++] = oe, S[D++] = X[0], S[D++] = X[1], S[D++] = X[2], S[D++] = j, S[D++] = ee, S[D++] = N, S[D++] = X[0], S[D++] = X[1], S[D++] = X[2], S[D++] = Z, S[D++] = K, S[D++] = N, S[D++] = X[0], S[D++] = X[1], S[D++] = X[2], S[D++] = Z;
    }
    g = O * 6, x = de(e, x, S.byteLength, L, "baseline-fill"), e.queue.writeBuffer(x.buffer, 0, S.buffer, S.byteOffset, S.byteLength);
  }
  function W(p) {
    p.setScissorRect(T, F, B, A), w === "bar" && h > 0 && d && (p.setPipeline(s), p.setBindGroup(0, f), p.setVertexBuffer(0, d.buffer), p.draw(Bt, h)), (w === "area" || w === "baseline") && g > 0 && x && (p.setPipeline(r), p.setVertexBuffer(0, x.buffer), p.draw(g)), (w === "line" || w === "area" || w === "baseline") && v > 1 && y && (p.setPipeline(a), p.setVertexBuffer(0, y.buffer), p.draw(v)), p.setScissorRect(0, 0, t.pixelWidth, t.pixelHeight);
  }
  function q() {
    d == null || d.buffer.destroy(), y == null || y.buffer.destroy(), x == null || x.buffer.destroy(), i.destroy(), d = null, y = null, x = null;
  }
  return { prepare: G, render: W, dispose: q };
}
function At(t) {
  if (t.length === 0) return [];
  const e = [];
  let n, c;
  const [i, s, f, l, a] = t[0];
  c = (s + f + l + a) / 4, n = (s + a) / 2;
  const o = Math.max(f, n, c), r = Math.min(l, n, c);
  e.push([i, n, o, r, c]);
  for (let d = 1; d < t.length; d++) {
    const [h, y, v, x, g] = t[d], w = (y + v + x + g) / 4, T = (n + c) / 2, F = Math.max(v, T, w), B = Math.min(x, T, w);
    e.push([h, T, F, B, w]), n = T, c = w;
  }
  return e;
}
function Dt(t, e) {
  if (t.length === 0) return [];
  if (!e) {
    let l = 1 / 0, a = -1 / 0;
    for (const o of t)
      o[4] < l && (l = o[4]), o[4] > a && (a = o[4]);
    e = Math.max((a - l) / 20, 0.01);
  }
  const n = [];
  let c = Math.round(t[0][4] / e) * e;
  const i = t[0][0], s = t.length > 1 ? (t[t.length - 1][0] - t[0][0]) / t.length : 1e3;
  let f = 0;
  for (const l of t) {
    const a = l[4];
    for (; a >= c + e; ) {
      const o = c;
      c += e;
      const r = c;
      n.push([
        i + f * s,
        o,
        r,
        // high = close for up brick
        o,
        // low = open for up brick
        r
      ]), f++;
    }
    for (; a <= c - e; ) {
      const o = c;
      c -= e;
      const r = c;
      n.push([
        i + f * s,
        o,
        o,
        // high = open for down brick
        r,
        // low = close for down brick
        r
      ]), f++;
    }
  }
  return n;
}
function Qe(t, e, n = "close") {
  const c = n === "open" ? 1 : n === "high" ? 2 : n === "low" ? 3 : 4, i = [];
  if (t.length < e) return i;
  let s = 0;
  for (let f = 0; f < e; f++)
    s += t[f][c];
  i.push([t[e - 1][0], s / e]);
  for (let f = e; f < t.length; f++)
    s += t[f][c] - t[f - e][c], i.push([t[f][0], s / e]);
  return i;
}
function Fe(t, e, n = "close") {
  const c = n === "open" ? 1 : n === "high" ? 2 : n === "low" ? 3 : 4, i = [];
  if (t.length === 0) return i;
  const s = 2 / (e + 1);
  let f;
  if (t.length >= e) {
    let l = 0;
    for (let a = 0; a < e; a++)
      l += t[a][c];
    f = l / e, i.push([t[e - 1][0], f]);
    for (let a = e; a < t.length; a++)
      f = t[a][c] * s + f * (1 - s), i.push([t[a][0], f]);
  } else {
    f = t[0][c], i.push([t[0][0], f]);
    for (let l = 1; l < t.length; l++)
      f = t[l][c] * s + f * (1 - s), i.push([t[l][0], f]);
  }
  return i;
}
function Et(t, e = 20, n = 2) {
  const c = Qe(t, e), i = [], s = [];
  for (let f = 0; f < c.length; f++) {
    const l = f;
    let a = 0;
    const o = c[f][1];
    for (let h = l; h < l + e && h < t.length; h++) {
      const y = t[h][4] - o;
      a += y * y;
    }
    const r = Math.sqrt(a / e), d = c[f][0];
    i.push([d, o + n * r]), s.push([d, o - n * r]);
  }
  return { upper: i, middle: c, lower: s };
}
function Ot(t, e = 14) {
  const n = [];
  if (t.length < e + 1) return n;
  const c = [];
  for (let a = 1; a < t.length; a++)
    c.push(t[a][4] - t[a - 1][4]);
  let i = 0, s = 0;
  for (let a = 0; a < e; a++)
    c[a] > 0 ? i += c[a] : s -= c[a];
  i /= e, s /= e;
  let f = s === 0 ? 100 : i / s, l = 100 - 100 / (1 + f);
  n.push([t[e][0], l]);
  for (let a = e; a < c.length; a++) {
    const o = c[a] > 0 ? c[a] : 0, r = c[a] < 0 ? -c[a] : 0;
    i = (i * (e - 1) + o) / e, s = (s * (e - 1) + r) / e, f = s === 0 ? 100 : i / s, l = 100 - 100 / (1 + f), n.push([t[a + 1][0], l]);
  }
  return n;
}
function Ut(t, e = 12, n = 26, c = 9) {
  const i = Fe(t, e), s = Fe(t, n), f = e - 1, l = n - 1, a = Math.max(f, l), o = a - f, r = a - l, d = Math.min(i.length - o, s.length - r), h = [];
  for (let x = 0; x < d; x++) {
    const g = i[x + o][0], w = i[x + o][1] - s[x + r][1];
    h.push([g, w]);
  }
  const y = [], v = [];
  if (h.length >= c) {
    const x = 2 / (c + 1);
    let g = 0;
    for (let T = 0; T < c; T++)
      g += h[T][1];
    let w = g / c;
    y.push([h[c - 1][0], w]), v.push([h[c - 1][0], h[c - 1][1] - w]);
    for (let T = c; T < h.length; T++)
      w = h[T][1] * x + w * (1 - x), y.push([h[T][0], w]), v.push([h[T][0], h[T][1] - w]);
  }
  return { macd: h, signal: y, histogram: v };
}
function De(t) {
  let e = t.replace("#", "");
  e.length === 3 && (e = e[0] + e[0] + e[1] + e[1] + e[2] + e[2]);
  const n = parseInt(e, 16);
  return [(n >> 16) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, 1];
}
function Wt(t) {
  const e = t.match(/rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  return e ? [
    parseFloat(e[1]) / 255,
    parseFloat(e[2]) / 255,
    parseFloat(e[3]) / 255,
    e[4] !== void 0 ? parseFloat(e[4]) : 1
  ] : De(t);
}
const He = ["#FFD700", "#FF6B6B", "#4ECDC4", "#A78BFA", "#F472B6"];
function $t(t, e, n) {
  const c = gt(t), i = bt(t), s = vt(t), f = Mt(e), l = Tt(t), a = Rt(t), o = Ft(t);
  let r = /* @__PURE__ */ new Map(), d = /* @__PURE__ */ new Map(), h = null, y = null, v = null, x = [], g = 0, w = "", T = "", F = [], B = /* @__PURE__ */ new Map(), A = /* @__PURE__ */ new Map();
  function G(p) {
    if (p.length === 0) return "0";
    const u = p[0], M = p[p.length - 1];
    return `${p.length}:${u[0]}:${M[0]}:${M[4]}`;
  }
  function Y(p, u, M, m) {
    const b = Ae(u.theme), C = t.dpr, R = t.canvas.clientWidth, k = t.canvas.clientHeight, P = st(R, k, C, u);
    h = P;
    const E = p.length, H = Math.max(0, Math.floor(M.start * E)), N = Math.min(E, Math.ceil(Math.min(M.end, 1) * E)), _ = p.slice(H, N);
    if (x = _, g = H, _.length === 0) {
      _t(t, b), f.update(P, Pe(0, 1, 0, 1), Pe(0, 1, 0, 1), u, b);
      return;
    }
    let V = _;
    const L = u.candles.style;
    L === "heikin-ashi" ? V = At(V) : L === "renko" && (V = Dt(V));
    let O = 1 / 0, S = -1 / 0, D = 1 / 0, j = -1 / 0;
    for (const Q of V) {
      const re = Q[0], ge = Q[2], ue = Q[3];
      re < O && (O = re), re > S && (S = re), ue < D && (D = ue), ge > j && (j = ge);
    }
    const Z = j - D || 1;
    D -= Z * 0.05, j += Z * 0.05;
    const z = V.length > 1 ? (S - O) / (V.length - 1) : 1;
    if (O -= z * 0.5, M.end > 1 && E > 1) {
      const Q = (M.end - 1) * E;
      S += z * (0.5 + Q);
    } else
      S += z * 0.5;
    const K = P.plotDevice, J = Pe(O, S, K.x, K.x + K.width), ee = Pe(D, j, K.y + K.height, K.y);
    if (y = J, v = ee, i.prepare(P, b, 6, 8), u.volume.enabled && u.volume.data.length > 0) {
      const Q = u.volume.data.slice(H, N);
      l.prepare(V, Q, J, P, b, u.candles.upColor, u.candles.downColor);
    }
    const oe = L === "classic" || L === "hollow" || L === "heikin-ashi" || L === "renko";
    if (oe) {
      const Q = L === "heikin-ashi" || L === "renko" ? V : _;
      c.prepare(
        Q,
        u.candles,
        J,
        ee,
        P,
        b
      );
    } else
      o.prepare(
        V,
        u.candles,
        J,
        ee,
        P,
        b
      );
    const ae = G(p);
    ae !== w && (w = ae, B.clear(), A.clear());
    const ne = p, X = u.overlays.map((Q) => `${Q.type}:${Q.period ?? ""}:${Q.stdDev ?? ""}:${Q.visible}:${Q.color ?? ""}:${Q.bandColor ?? ""}`).join("|"), ie = `${ae}|${X}`;
    let te;
    if (ie === T)
      te = F;
    else {
      te = [];
      for (let Q = 0; Q < u.overlays.length; Q++) {
        const re = u.overlays[Q];
        if (re.visible === !1) continue;
        const ge = re.color ?? He[Q % He.length];
        if (re.type === "sma") {
          const ue = Qe(ne, re.period ?? 20);
          te.push({ points: ue, color: ge });
        } else if (re.type === "ema") {
          const ue = Fe(ne, re.period ?? 20);
          te.push({ points: ue, color: ge });
        } else if (re.type === "bollinger") {
          const ue = Et(ne, re.period ?? 20, re.stdDev ?? 2);
          te.push({ points: ue.middle, color: ge });
          const Ue = re.bandColor ?? "#8888FF";
          te.push({ points: ue.upper, color: Ue, opacity: 0.6 }), te.push({ points: ue.lower, color: Ue, opacity: 0.6 });
        }
      }
      F = te, T = ie;
    }
    const se = [];
    if (ne.length > 0) {
      const Q = ne[ne.length - 1], re = Q[4], ge = re >= Q[1];
      se.push({
        price: re,
        color: ge ? u.candles.upColor : u.candles.downColor,
        dashed: !0,
        opacity: 0.8
      });
    }
    for (const Q of u.orderLines)
      se.push({
        price: Q.price,
        color: Q.color ?? "#FFD700",
        dashed: Q.style === "dashed",
        opacity: 1
      });
    a.prepare(te, se, J, ee, P), m ? s.prepare(
      P,
      Wt(b.crosshairColor),
      m.x * C,
      m.y * C
    ) : s.prepare(P, [0, 0, 0, 0], null, null), f.update(P, J, ee, u, b), U(ne, V, H, N, u, P, J, b, C);
    const { device: fe, context: pe } = t, we = pe.getCurrentTexture().createView(), Me = De(b.background), Oe = fe.createCommandEncoder({ label: "dicharts-frame" }), me = Oe.beginRenderPass({
      colorAttachments: [
        {
          view: we,
          clearValue: { r: Me[0], g: Me[1], b: Me[2], a: Me[3] },
          loadOp: "clear",
          storeOp: "store"
        }
      ]
    });
    i.render(me), u.volume.enabled && l.render(me), oe ? c.render(me) : o.render(me), a.render(me), s.render(me), me.end(), fe.queue.submit([Oe.finish()]);
  }
  function U(p, u, M, m, b, C, R, k, P) {
    const E = new Set(b.subPanes.filter((H) => H.visible !== !1).map((H) => H.id));
    for (const [H, N] of d)
      if (!E.has(H)) {
        N.remove(), d.delete(H);
        const _ = r.get(H);
        _ && (_.dispose(), r.delete(H));
      }
    for (const H of b.subPanes) {
      if (H.visible === !1) continue;
      const N = H.height ?? 100;
      let _ = d.get(H.id);
      _ || (_ = document.createElement("div"), _.className = "dicharts-subpane", _.style.cssText = `position:relative;width:100%;overflow:hidden;border-top:1px solid ${k.gridColor};`, n.appendChild(_), d.set(H.id, _)), _.style.height = `${N}px`;
      let V = _.querySelector("canvas");
      V || (V = document.createElement("canvas"), V.style.cssText = "width:100%;height:100%;display:block;", _.appendChild(V));
      const L = _.clientWidth, O = N;
      V.width = Math.round(L * P), V.height = Math.round(O * P);
      const S = V.getContext("2d");
      if (!S) continue;
      S.clearRect(0, 0, V.width, V.height), S.fillStyle = k.background, S.fillRect(0, 0, V.width, V.height), S.strokeStyle = k.gridColor, S.lineWidth = P, S.beginPath(), S.moveTo(0, 0), S.lineTo(V.width, 0), S.stroke();
      const D = C.plotDevice.x;
      C.plotDevice.x + C.plotDevice.width;
      const j = C.plotDevice.width, Z = V.height, z = 0.1;
      H.type === "rsi" ? I(S, p, M, m, R, H, D, j, Z, P, k, z) : H.type === "macd" ? $(S, p, M, m, R, H, D, j, Z, P, k, z) : H.type === "volume" && W(S, p, M, m, R, b, D, j, Z, P), S.fillStyle = k.textColor, S.font = `${11 * P}px sans-serif`, S.fillText(H.type.toUpperCase() + (H.period ? `(${H.period})` : ""), D + 4 * P, 14 * P);
    }
  }
  function I(p, u, M, m, b, C, R, k, P, E, H, N) {
    const _ = C.period ?? 14, V = `rsi:${_}`;
    let L = B.get(V);
    if (L || (L = Ot(u, _), B.set(V, L)), L.length === 0) return;
    const O = P * N, S = P - O * 2, D = (z) => O + (1 - z / 100) * S;
    p.canvas.width;
    const j = (z) => {
      const K = b.domainMax - b.domainMin;
      if (K === 0) return R;
      const J = (z - b.domainMin) / K;
      return R + J * k;
    };
    p.strokeStyle = H.gridColor, p.lineWidth = E * 0.5, p.setLineDash([4 * E, 3 * E]);
    for (const z of [30, 50, 70]) {
      const K = D(z);
      p.beginPath(), p.moveTo(R, K), p.lineTo(R + k, K), p.stroke(), p.fillStyle = H.textSecondary, p.font = `${9 * E}px sans-serif`, p.fillText(String(z), R + k + 4 * E, K + 3 * E);
    }
    p.setLineDash([]), p.strokeStyle = "#A78BFA", p.lineWidth = 1.5 * E, p.beginPath();
    let Z = !1;
    for (const [z, K] of L) {
      const J = j(z), ee = D(K);
      Z ? p.lineTo(J, ee) : (p.moveTo(J, ee), Z = !0);
    }
    p.stroke(), p.globalAlpha = 0.08, p.fillStyle = "#FF6B6B", p.fillRect(R, D(100), k, D(70) - D(100)), p.fillStyle = "#4ECDC4", p.fillRect(R, D(30), k, D(0) - D(30)), p.globalAlpha = 1;
  }
  function $(p, u, M, m, b, C, R, k, P, E, H, N) {
    const _ = C.fastPeriod ?? 12, V = C.slowPeriod ?? 26, L = C.signalPeriod ?? 9, O = `macd:${_}:${V}:${L}`;
    let S = A.get(O);
    if (S || (S = Ut(u, _, V, L), A.set(O, S)), S.macd.length === 0) return;
    const D = P * N, j = P - D * 2, Z = D + j / 2;
    let z = 1 / 0, K = -1 / 0;
    for (const [, X] of S.macd)
      X < z && (z = X), X > K && (K = X);
    for (const [, X] of S.signal)
      X < z && (z = X), X > K && (K = X);
    for (const [, X] of S.histogram)
      X < z && (z = X), X > K && (K = X);
    const J = Math.max(Math.abs(z), Math.abs(K)) || 1, ee = (X) => Z - X / J * (j / 2), oe = (X) => {
      const ie = b.domainMax - b.domainMin;
      if (ie === 0) return R;
      const te = (X - b.domainMin) / ie;
      return R + te * k;
    };
    p.strokeStyle = H.gridColor, p.lineWidth = E * 0.5, p.setLineDash([4 * E, 3 * E]), p.beginPath(), p.moveTo(R, Z), p.lineTo(R + k, Z), p.stroke(), p.setLineDash([]);
    const ae = Math.max(1 * E, k / (S.histogram.length || 1) * 0.6);
    for (const [X, ie] of S.histogram) {
      const te = oe(X), se = ee(ie);
      p.fillStyle = ie >= 0 ? "#4ECDC480" : "#FF6B6B80";
      const fe = Math.abs(Z - se);
      ie >= 0 ? p.fillRect(te - ae / 2, se, ae, fe) : p.fillRect(te - ae / 2, Z, ae, fe);
    }
    p.strokeStyle = "#4ECDC4", p.lineWidth = 1.5 * E, p.beginPath();
    let ne = !1;
    for (const [X, ie] of S.macd) {
      const te = oe(X), se = ee(ie);
      ne ? p.lineTo(te, se) : (p.moveTo(te, se), ne = !0);
    }
    p.stroke(), p.strokeStyle = "#FF6B6B", p.lineWidth = 1.5 * E, p.beginPath(), ne = !1;
    for (const [X, ie] of S.signal) {
      const te = oe(X), se = ee(ie);
      ne ? p.lineTo(te, se) : (p.moveTo(te, se), ne = !0);
    }
    p.stroke();
  }
  function W(p, u, M, m, b, C, R, k, P, E, H) {
    const N = C.volume.data;
    if (N.length === 0) return;
    const _ = N.slice(M, m), V = u.slice(M, m);
    let L = 0;
    for (const Z of _) Z > L && (L = Z);
    L === 0 && (L = 1);
    const O = P * 0.05, S = P - O, D = (Z) => {
      const z = b.domainMax - b.domainMin;
      if (z === 0) return R;
      const K = (Z - b.domainMin) / z;
      return R + K * k;
    }, j = Math.max(1 * E, k / (_.length || 1) * 0.6);
    for (let Z = 0; Z < _.length && Z < V.length; Z++) {
      const z = _[Z];
      if (!z || z <= 0) continue;
      const K = V[Z], J = D(K[0]), ee = z / L * S, oe = K[4] >= K[1];
      p.fillStyle = oe ? C.candles.upColor + "80" : C.candles.downColor + "80", p.fillRect(J - j / 2, P - ee, j, ee);
    }
  }
  function q() {
    c.dispose(), i.dispose(), s.dispose(), f.dispose(), l.dispose(), a.dispose(), o.dispose();
    for (const p of r.values()) p.dispose();
    for (const p of d.values()) p.remove();
  }
  return {
    render: Y,
    get lastLayout() {
      return h;
    },
    get lastXScale() {
      return y;
    },
    get lastYScale() {
      return v;
    },
    get visibleData() {
      return x;
    },
    get visibleStartIndex() {
      return g;
    },
    dispose: q
  };
}
function _t(t, e) {
  const n = De(e.background), c = t.device.createCommandEncoder();
  c.beginRenderPass({
    colorAttachments: [
      {
        view: t.context.getCurrentTexture().createView(),
        clearValue: { r: n[0], g: n[1], b: n[2], a: n[3] },
        loadOp: "clear",
        storeOp: "store"
      }
    ]
  }).end(), t.device.queue.submit([c.finish()]);
}
const Vt = 2e-3, It = 1;
function Ge(t = 0, e = 1, n = 0) {
  return { start: ze(t), end: ze(e), rightPadding: n };
}
function Ee(t) {
  return t.end - t.start;
}
function Ht(t, e, n) {
  const c = Ee(t);
  let i = Gt(c / n);
  const s = c === 0 ? 0.5 : (e - t.start) / c;
  let f = e - s * i, l = f + i;
  const a = 1 + t.rightPadding;
  return f < 0 && (f = 0, l = Math.min(a, i)), l > a && (l = a, f = Math.max(0, a - i)), { start: f, end: l, rightPadding: t.rightPadding };
}
function qe(t, e) {
  const n = Ee(t);
  let c = t.start + e, i = t.end + e;
  const s = 1 + t.rightPadding;
  return c < 0 && (c = 0, i = n), i > s && (i = s, c = Math.max(0, s - n)), { start: c, end: i, rightPadding: t.rightPadding };
}
function Ye(t) {
  const e = Ee(t), n = Math.max(0, 1 - 0.75 * e), c = n + e;
  return { start: n, end: c, rightPadding: t.rightPadding };
}
function ze(t) {
  return Math.max(0, Math.min(1, t));
}
function Gt(t) {
  return Math.max(Vt, Math.min(It, t));
}
function qt(t) {
  let e = null, n = !1, c = 0, i = null;
  function s(d) {
    d.preventDefault();
    const h = t.getPlotArea();
    if (!h) return;
    const y = t.getViewport(), v = e.getBoundingClientRect(), x = d.clientX - v.left;
    if (!(x < h.x || x > h.x + h.width))
      if (Math.abs(d.deltaX) > Math.abs(d.deltaY)) {
        const g = y.end - y.start, w = d.deltaX / h.width * g * 0.5;
        t.setViewport(qe(y, w));
      } else {
        const g = Math.max(-200, Math.min(200, d.deltaY)), w = Math.exp(-g * 3e-3), T = y.start + (x - h.x) / h.width * (y.end - y.start);
        t.setViewport(Ht(y, T, w));
      }
  }
  function f(d) {
    if (!(d.button === 1 || d.button === 0 && d.shiftKey)) return;
    const h = t.getPlotArea();
    if (!h) return;
    const y = e.getBoundingClientRect(), v = d.clientX - y.left;
    v < h.x || v > h.x + h.width || (n = !0, c = d.clientX, i = { ...t.getViewport() }, e.setPointerCapture(d.pointerId), d.preventDefault());
  }
  function l(d) {
    if (!n || !i) return;
    const h = t.getPlotArea();
    if (!h) return;
    const y = d.clientX - c, v = i.end - i.start, x = -(y / h.width) * v;
    t.setViewport(qe(i, x));
  }
  function a(d) {
    n && (n = !1, i = null, e.releasePointerCapture(d.pointerId));
  }
  function o(d) {
    e = d, d.addEventListener("wheel", s, { passive: !1 }), d.addEventListener("pointerdown", f), d.addEventListener("pointermove", l), d.addEventListener("pointerup", a), d.addEventListener("pointercancel", a);
  }
  function r() {
    e && (e.removeEventListener("wheel", s), e.removeEventListener("pointerdown", f), e.removeEventListener("pointermove", l), e.removeEventListener("pointerup", a), e.removeEventListener("pointercancel", a), e = null);
  }
  return { attach: o, detach: r };
}
function Yt(t) {
  let e = null, n = null;
  function c(l) {
    const a = t.getPlotArea();
    if (!a) return;
    const o = e.getBoundingClientRect(), r = l.clientX - o.left, d = l.clientY - o.top;
    r >= a.x && r <= a.x + a.width && d >= a.y && d <= a.y + a.height ? n = { x: r, y: d } : n = null, t.onMove(n);
  }
  function i() {
    n = null, t.onMove(null);
  }
  function s(l) {
    e = l, l.addEventListener("pointermove", c), l.addEventListener("pointerleave", i);
  }
  function f() {
    e && (e.removeEventListener("pointermove", c), e.removeEventListener("pointerleave", i), e = null);
  }
  return {
    attach: s,
    detach: f,
    get position() {
      return n;
    }
  };
}
function Xe(t) {
  if (Array.isArray(t)) return t;
  const e = t;
  return [e.timestamp, e.open, e.high, e.low, e.close];
}
function zt(t, e, n, c, i, s, f) {
  if (t.length === 0) return null;
  const l = f / 2;
  let a = 0, o = t.length - 1;
  for (; a < o; ) {
    const h = a + o >> 1;
    he(i, Xe(t[h])[0]) < n ? a = h + 1 : o = h;
  }
  let r = null, d = 1 / 0;
  for (let h = Math.max(0, a - 2); h <= Math.min(t.length - 1, a + 2); h++) {
    const y = Xe(t[h]), v = he(i, y[0]), x = Math.abs(v - n);
    if (x > l) continue;
    const g = he(s, y[2]), w = he(s, y[3]), T = Math.min(g, w), F = Math.max(g, w);
    c >= T && c <= F && x < d && (d = x, r = { index: e + h, candle: y });
  }
  return r;
}
function Xt(t) {
  const e = document.createElement("div");
  e.style.cssText = `
    position: absolute;
    display: none;
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
    pointer-events: none;
    z-index: 10;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `, t.appendChild(e);
  function n(f) {
    return f.toFixed(f >= 100 ? 2 : f >= 1 ? 4 : 6);
  }
  function c(f, l, a, o) {
    const [r, d, h, y, v] = f, g = v >= d ? o.candleUpColor : o.candleDownColor, w = new Date(r), T = w.toLocaleDateString(void 0, {
      month: "short",
      day: "numeric",
      year: "numeric"
    }), F = w.toLocaleTimeString(void 0, {
      hour: "2-digit",
      minute: "2-digit"
    });
    e.style.backgroundColor = o.tooltipBackground, e.style.border = `1px solid ${o.tooltipBorder}`, e.style.color = o.tooltipText, e.innerHTML = `
      <div style="margin-bottom:4px;color:${o.axisTextColor}">${T} ${F}</div>
      <div>O <span style="color:${g}">${n(d)}</span></div>
      <div>H <span style="color:${g}">${n(h)}</span></div>
      <div>L <span style="color:${g}">${n(y)}</span></div>
      <div>C <span style="color:${g}">${n(v)}</span></div>
    `;
    const B = t.clientWidth, A = 160, G = l + 16 + A > B ? l - A - 8 : l + 16;
    e.style.left = `${Math.max(4, G)}px`, e.style.top = `${Math.max(4, a - 40)}px`, e.style.display = "";
  }
  function i() {
    e.style.display = "none";
  }
  function s() {
    e.remove();
  }
  return { show: c, hide: i, dispose: s };
}
function Nt(t) {
  const e = document.createElement("div");
  e.style.cssText = `
    position: absolute;
    display: none;
    padding: 2px 6px;
    font-size: 11px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    pointer-events: none;
    z-index: 9;
    white-space: nowrap;
    border-radius: 2px;
  `, t.appendChild(e);
  function n(f) {
    return f.toFixed(f >= 100 ? 2 : f >= 1 ? 4 : 6);
  }
  function c(f, l, a, o) {
    e.textContent = n(f), e.style.backgroundColor = o.crosshairColor, e.style.color = o.tooltipBackground, e.style.left = `${a}px`, e.style.top = `${l - 9}px`, e.style.display = "";
  }
  function i() {
    e.style.display = "none";
  }
  function s() {
    e.remove();
  }
  return { show: c, hide: i, dispose: s };
}
function Zt(t) {
  const e = document.createElement("div");
  e.style.cssText = `
    position: absolute;
    display: none;
    padding: 2px 6px;
    font-size: 11px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    pointer-events: none;
    z-index: 9;
    white-space: nowrap;
    border-radius: 2px;
  `, t.appendChild(e);
  function n(s, f, l, a) {
    const o = new Date(s), r = String(o.getHours()).padStart(2, "0"), d = String(o.getMinutes()).padStart(2, "0"), h = String(o.getSeconds()).padStart(2, "0"), y = String(o.getMonth() + 1).padStart(2, "0"), v = String(o.getDate()).padStart(2, "0");
    e.textContent = `${y}/${v} ${r}:${d}:${h}`, e.style.backgroundColor = a.crosshairColor, e.style.color = a.tooltipBackground, e.style.left = `${f - 40}px`, e.style.top = `${l}px`, e.style.display = "";
  }
  function c() {
    e.style.display = "none";
  }
  function i() {
    e.remove();
  }
  return { show: n, hide: c, dispose: i };
}
function ve(t) {
  if (Array.isArray(t)) return t;
  const e = t;
  return [e.timestamp, e.open, e.high, e.low, e.close];
}
function Kt(t) {
  let e = t ? t.map(ve) : [];
  return {
    get data() {
      return e;
    },
    get length() {
      return e.length;
    },
    setData(n) {
      e = n.map(ve);
    },
    append(n) {
      for (const c of n)
        e.push(ve(c));
    },
    updateLast(n) {
      e.length === 0 ? e.push(ve(n)) : e[e.length - 1] = ve(n);
    },
    trim(n) {
      e.length > n && (e = e.slice(e.length - n));
    }
  };
}
function Ne(t) {
  var c, i, s, f, l, a, o, r, d, h, y, v, x, g, w, T, F, B, A, G, Y;
  const e = t.theme ?? "dark", n = Ae(e);
  return {
    theme: e,
    candles: {
      data: ((c = t.candles) == null ? void 0 : c.data) ?? [],
      style: ((i = t.candles) == null ? void 0 : i.style) ?? "classic",
      upColor: ((s = t.candles) == null ? void 0 : s.upColor) ?? n.candleUpColor,
      downColor: ((f = t.candles) == null ? void 0 : f.downColor) ?? n.candleDownColor,
      upBorderColor: ((l = t.candles) == null ? void 0 : l.upBorderColor) ?? n.candleUpBorderColor,
      downBorderColor: ((a = t.candles) == null ? void 0 : a.downBorderColor) ?? n.candleDownBorderColor,
      bodyWidth: ((o = t.candles) == null ? void 0 : o.bodyWidth) ?? "70%",
      lineColor: ((r = t.candles) == null ? void 0 : r.lineColor) ?? n.candleUpColor,
      baselinePrice: ((d = t.candles) == null ? void 0 : d.baselinePrice) ?? null
    },
    volume: {
      enabled: ((h = t.volume) == null ? void 0 : h.enabled) ?? !1,
      data: ((y = t.volume) == null ? void 0 : y.data) ?? [],
      heightRatio: ((v = t.volume) == null ? void 0 : v.heightRatio) ?? 0.2
    },
    timeAxis: {
      visible: ((x = t.timeAxis) == null ? void 0 : x.visible) ?? !0
    },
    priceAxis: {
      visible: ((g = t.priceAxis) == null ? void 0 : g.visible) ?? !0,
      position: ((w = t.priceAxis) == null ? void 0 : w.position) ?? "right"
    },
    crosshair: {
      enabled: ((T = t.crosshair) == null ? void 0 : T.enabled) ?? !0,
      lineColor: ((F = t.crosshair) == null ? void 0 : F.lineColor) ?? n.crosshairColor,
      lineWidth: ((B = t.crosshair) == null ? void 0 : B.lineWidth) ?? 1,
      dashPattern: ((A = t.crosshair) == null ? void 0 : A.dashPattern) ?? [6, 4]
    },
    dataZoom: {
      enabled: ((G = t.dataZoom) == null ? void 0 : G.enabled) ?? !0,
      initialRange: ((Y = t.dataZoom) == null ? void 0 : Y.initialRange) ?? [0, 1]
    },
    overlays: t.overlays ?? [],
    orderLines: t.orderLines ?? [],
    subPanes: t.subPanes ?? [],
    autoScroll: t.autoScroll ?? !0,
    animation: t.animation ?? !1
  };
}
class on {
  /**
   * Create a new DiChart instance.
   *
   * ```ts
   * const chart = await DiChart.create(container, { theme: 'dark', candles: { data } });
   * ```
   */
  static async create(e, n = {}) {
    getComputedStyle(e).position === "static" && (e.style.position = "relative"), e.style.display = "flex", e.style.flexDirection = "column", e.style.overflow = "hidden";
    const i = document.createElement("div");
    i.style.cssText = "position:relative;flex:1;min-height:0;overflow:hidden;", e.appendChild(i);
    const s = document.createElement("canvas");
    s.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;display:block;", i.appendChild(s);
    const f = await et(s);
    let l = Ne(n), a = { ...n };
    const o = Kt(l.candles.data);
    let r = Ge(
      l.dataZoom.initialRange[0],
      l.dataZoom.initialRange[1],
      0.25
    );
    const d = $t(f, i, e), h = tt(G);
    let y = null;
    const v = qt({
      getViewport: () => r,
      getPlotArea: () => {
        var u;
        return ((u = d.lastLayout) == null ? void 0 : u.plot) ?? null;
      },
      setViewport(u) {
        r = u, h.requestRender();
      }
    }), x = Yt({
      getPlotArea: () => {
        var u;
        return ((u = d.lastLayout) == null ? void 0 : u.plot) ?? null;
      },
      onMove(u) {
        if (y = u, h.requestRender(), u && d.lastXScale && d.lastYScale) {
          const M = U(u.x, u.y);
          B("crosshairMove", { x: u.x, y: u.y, candle: M });
        } else
          B("crosshairMove", { x: 0, y: 0, candle: null });
      }
    }), g = Xt(i), w = Nt(i), T = Zt(i), F = {};
    function B(u, M) {
      for (const m of F[u] ?? []) m(M);
    }
    s.addEventListener("click", (u) => {
      const M = s.getBoundingClientRect(), m = u.clientX - M.left, b = u.clientY - M.top, C = U(m, b);
      B("click", { candle: C, x: m, y: b });
    });
    const A = new ResizeObserver(() => {
      f.resize(), h.requestRender();
    });
    A.observe(i), l.dataZoom.enabled && v.attach(s), l.crosshair.enabled && x.attach(s), f.onDeviceLost((u) => {
      B("deviceLost", { reason: u }), h.stop();
    }), h.start();
    function G() {
      if (!f.isDeviceLost)
        try {
          d.render(o.data, l, r, y), Y();
        } catch (u) {
          const M = u instanceof Error ? u.message : String(u);
          B("error", { message: M }), h.stop();
        }
    }
    function Y() {
      if (!y || !l.crosshair.enabled) {
        g.hide(), w.hide(), T.hide();
        return;
      }
      const u = d.lastLayout, M = d.lastXScale, m = d.lastYScale;
      if (!u || !M || !m) return;
      const b = Ae(l.theme), C = $e(m, y.y * u.dpr);
      if (l.priceAxis.visible) {
        const P = l.priceAxis.position === "right" ? u.plot.x + u.plot.width + 2 : 0;
        w.show(C, y.y, P, b);
      }
      const R = $e(M, y.x * u.dpr);
      l.timeAxis.visible && T.show(R, y.x, u.plot.y + u.plot.height + 2, b);
      const k = U(y.x, y.y);
      k ? g.show(k.candle, y.x, y.y, b) : g.hide();
    }
    function U(u, M) {
      const m = d.lastXScale, b = d.lastYScale;
      if (!m || !b) return null;
      const C = d.visibleData;
      if (C.length === 0) return null;
      const R = d.lastLayout, k = C.length > 1 ? Math.abs(he(m, C[1][0]) - he(m, C[0][0])) / R.dpr * 0.8 : 8;
      return zt(
        C,
        d.visibleStartIndex,
        u * R.dpr,
        // convert to device pixels to match scale
        M * R.dpr,
        m,
        b,
        k * R.dpr
      );
    }
    let I = l.volume.data.slice(), $ = l.overlays.slice(), W = l.orderLines.slice(), q = l.subPanes.slice();
    return {
      setOptions(u) {
        var M, m;
        a = {
          ...a,
          ...u,
          candles: { ...a.candles, ...u.candles },
          volume: { ...a.volume, ...u.volume },
          timeAxis: { ...a.timeAxis, ...u.timeAxis },
          priceAxis: { ...a.priceAxis, ...u.priceAxis },
          crosshair: { ...a.crosshair, ...u.crosshair },
          dataZoom: { ...a.dataZoom, ...u.dataZoom }
        }, l = Ne(a), (M = u.candles) != null && M.data && o.setData(u.candles.data), (m = u.volume) != null && m.data && (I = u.volume.data.slice()), u.overlays && ($ = u.overlays.slice()), u.orderLines && (W = u.orderLines.slice()), u.subPanes && (q = u.subPanes.slice()), h.requestRender();
      },
      appendCandles(u) {
        o.append(u), l.autoScroll && (r = Ye(r)), h.requestRender();
      },
      updateLastCandle(u) {
        o.updateLast(u), l.autoScroll && (r = Ye(r)), h.requestRender();
      },
      setData(u) {
        o.setData(u), h.requestRender();
      },
      setZoomRange(u, M) {
        r = Ge(u, M, r.rightPadding), h.requestRender();
      },
      // --- Volume ---
      setVolumes(u) {
        I = u.slice(), a.volume = { ...a.volume, enabled: !0, data: I }, l.volume.enabled = !0, l.volume.data = I, h.requestRender();
      },
      appendVolumes(u) {
        I.push(...u), a.volume = { ...a.volume, data: I }, l.volume.data = I, h.requestRender();
      },
      // --- Overlays ---
      addOverlay(u) {
        const M = $.findIndex((m) => m.id === u.id);
        M >= 0 ? $[M] = u : $.push(u), a.overlays = $, l.overlays = $, h.requestRender();
      },
      removeOverlay(u) {
        $ = $.filter((M) => M.id !== u), a.overlays = $, l.overlays = $, h.requestRender();
      },
      // --- Order lines ---
      addOrderLine(u) {
        const M = W.findIndex((m) => m.id === u.id);
        M >= 0 ? W[M] = u : W.push(u), a.orderLines = W, l.orderLines = W, h.requestRender();
      },
      removeOrderLine(u) {
        W = W.filter((M) => M.id !== u), a.orderLines = W, l.orderLines = W, h.requestRender();
      },
      clearOrderLines() {
        W = [], a.orderLines = W, l.orderLines = W, h.requestRender();
      },
      // --- Sub-panes ---
      addSubPane(u) {
        const M = q.findIndex((m) => m.id === u.id);
        M >= 0 ? q[M] = u : q.push(u), a.subPanes = q, l.subPanes = q, h.requestRender();
      },
      removeSubPane(u) {
        q = q.filter((M) => M.id !== u), a.subPanes = q, l.subPanes = q, h.requestRender();
      },
      // --- Events ---
      on(u, M) {
        (F[u] ?? (F[u] = [])).push(M);
      },
      off(u, M) {
        const m = F[u];
        if (m) {
          const b = m.indexOf(M);
          b >= 0 && m.splice(b, 1);
        }
      },
      get fps() {
        return h.fps;
      },
      get candleCount() {
        return o.length;
      },
      resize() {
        f.resize(), h.requestRender();
      },
      dispose() {
        h.stop(), A.disconnect(), v.detach(), x.detach(), d.dispose(), g.dispose(), w.dispose(), T.dispose(), f.destroy(), i.remove();
      }
    };
  }
}
function sn(t) {
  let e = t, n = 0, c = 0, i = -1 / 0, s = 1 / 0, f = 0, l = !1;
  function a(v) {
    return Math.floor(v / e) * e;
  }
  function o() {
    return [n, c, i, s, f];
  }
  function r(v) {
    const x = v.timestamp, g = v.price, w = a(x);
    if (!l)
      return n = w, c = g, i = g, s = g, f = g, l = !0, null;
    if (w > n) {
      const T = o();
      return n = w, c = g, i = g, s = g, f = g, T;
    }
    return g > i && (i = g), g < s && (s = g), f = g, null;
  }
  function d() {
    return l ? o() : null;
  }
  function h(v) {
    e = v, y();
  }
  function y() {
    l = !1, n = 0, c = 0, i = -1 / 0, s = 1 / 0, f = 0;
  }
  return { processTick: r, currentCandle: d, setInterval: h, reset: y };
}
function rn(t, e) {
  const n = t.length;
  if (n <= e || e < 2) return t;
  const c = [];
  c.push(t[0]);
  const i = (n - 1) / (e - 1);
  for (let s = 1; s < e - 1; s++) {
    const f = Math.round(s * i), l = Math.min(Math.round((s + 1) * i), n);
    let a = t[f][1], o = -1 / 0, r = 1 / 0, d = t[f][4], h = t[f][0];
    for (let y = f; y < l; y++) {
      const v = t[y];
      v[2] > o && (o = v[2]), v[3] < r && (r = v[3]), d = v[4];
    }
    c.push([h, a, o, r, d]);
  }
  return c.push(t[n - 1]), c;
}
function ln(t, e = {}) {
  const n = document.createElement("canvas");
  n.style.cssText = "width:100%;height:100%;display:block;", t.appendChild(n), getComputedStyle(t).position === "static" && (t.style.position = "relative");
  let i = {
    bids: e.bids ?? [],
    asks: e.asks ?? [],
    bidColor: e.bidColor ?? "#26a69a",
    askColor: e.askColor ?? "#ef5350",
    bidFillColor: e.bidFillColor ?? "rgba(38, 166, 154, 0.15)",
    askFillColor: e.askFillColor ?? "rgba(239, 83, 80, 0.15)",
    midPrice: e.midPrice ?? 0,
    background: e.background ?? "#131722",
    textColor: e.textColor ?? "#787b86",
    gridColor: e.gridColor ?? "rgba(255,255,255,0.06)",
    showLabels: e.showLabels ?? !0
  }, s = window.devicePixelRatio || 1;
  function f() {
    s = window.devicePixelRatio || 1;
    const o = t.clientWidth, r = t.clientHeight;
    n.width = Math.round(o * s), n.height = Math.round(r * s);
  }
  f();
  const l = new ResizeObserver(() => {
    f(), a();
  });
  l.observe(t);
  function a() {
    const o = n.getContext("2d");
    if (!o) return;
    const r = n.width, d = n.height;
    o.clearRect(0, 0, r, d), o.fillStyle = i.background, o.fillRect(0, 0, r, d);
    const h = i.bids, y = i.asks;
    if (h.length === 0 && y.length === 0) return;
    const v = [];
    let x = 0;
    for (const m of h)
      x += m.quantity, v.push({ price: m.price, cum: x });
    const g = [];
    let w = 0;
    for (const m of y)
      w += m.quantity, g.push({ price: m.price, cum: w });
    const T = Math.max(x, w) || 1, F = [...h.map((m) => m.price), ...y.map((m) => m.price)], B = Math.min(...F), A = Math.max(...F), G = A - B || 1, Y = 10 * s, U = 10 * s, I = 10 * s, $ = i.showLabels ? 28 * s : 10 * s, W = r - Y - U, q = d - I - $, p = (m) => Y + (m - B) / G * W, u = (m) => I + q - m / T * q;
    o.strokeStyle = i.gridColor, o.lineWidth = s * 0.5;
    for (let m = 0; m <= 4; m++) {
      const b = I + q / 4 * m;
      o.beginPath(), o.moveTo(Y, b), o.lineTo(Y + W, b), o.stroke();
    }
    if (v.length > 0) {
      o.fillStyle = i.bidFillColor, o.beginPath(), o.moveTo(p(v[0].price), u(0));
      for (let b = 0; b < v.length; b++) {
        const C = p(v[b].price), R = u(v[b].cum);
        b > 0 && o.lineTo(C, u(v[b - 1].cum)), o.lineTo(C, R);
      }
      const m = v[v.length - 1];
      o.lineTo(p(m.price), u(0)), o.closePath(), o.fill(), o.strokeStyle = i.bidColor, o.lineWidth = 2 * s, o.beginPath();
      for (let b = 0; b < v.length; b++) {
        const C = p(v[b].price), R = u(v[b].cum);
        b === 0 ? o.moveTo(C, R) : (o.lineTo(C, u(v[b - 1].cum)), o.lineTo(C, R));
      }
      o.stroke();
    }
    if (g.length > 0) {
      o.fillStyle = i.askFillColor, o.beginPath(), o.moveTo(p(g[0].price), u(0));
      for (let b = 0; b < g.length; b++) {
        const C = p(g[b].price), R = u(g[b].cum);
        b > 0 && o.lineTo(C, u(g[b - 1].cum)), o.lineTo(C, R);
      }
      const m = g[g.length - 1];
      o.lineTo(p(m.price), u(0)), o.closePath(), o.fill(), o.strokeStyle = i.askColor, o.lineWidth = 2 * s, o.beginPath();
      for (let b = 0; b < g.length; b++) {
        const C = p(g[b].price), R = u(g[b].cum);
        b === 0 ? o.moveTo(C, R) : (o.lineTo(C, u(g[b - 1].cum)), o.lineTo(C, R));
      }
      o.stroke();
    }
    const M = i.midPrice || (h.length && y.length ? (h[0].price + y[0].price) / 2 : 0);
    if (M > B && M < A) {
      o.strokeStyle = i.textColor, o.lineWidth = s, o.setLineDash([4 * s, 3 * s]);
      const m = p(M);
      o.beginPath(), o.moveTo(m, I), o.lineTo(m, I + q), o.stroke(), o.setLineDash([]);
    }
    if (i.showLabels) {
      o.fillStyle = i.textColor, o.font = `${10 * s}px sans-serif`, o.textAlign = "center";
      const m = 7;
      for (let b = 0; b <= m; b++) {
        const C = B + G / m * b, R = p(C);
        o.fillText(C.toFixed(2), R, I + q + 16 * s);
      }
    }
  }
  return a(), {
    update(o, r) {
      i.bids = o, i.asks = r, a();
    },
    setOptions(o) {
      i = { ...i, ...o }, a();
    },
    redraw: a,
    resize() {
      f(), a();
    },
    dispose() {
      l.disconnect(), n.remove();
    }
  };
}
function jt(t, e, n, c, i, s) {
  if (t.length === 0) return [];
  const f = t.slice().sort((o, r) => r.weight - o.weight), l = f.reduce((o, r) => o + r.weight, 0);
  if (l <= 0) return [];
  const a = [];
  return Re(f, [], e, n, c, i, l, a, s), a;
}
function Re(t, e, n, c, i, s, f, l, a) {
  if (t.length === 0) {
    Be(e, n, c, i, s, f, l, a);
    return;
  }
  const o = i * s, r = t[0], d = [...e, r];
  if (e.length === 0 || Ze(d, i, s, o, f) <= Ze(e, i, s, o, f))
    Re(t.slice(1), d, n, c, i, s, f, l, a);
  else {
    const h = e.reduce((x, g) => x + g.weight, 0), y = h / f;
    if (i >= s) {
      const x = y * i;
      Be(e, n, c, x, s, f, l, a), Re(t, [], n + x, c, i - x, s, f - h, l, a);
    } else {
      const x = y * s;
      Be(e, n, c, i, x, f, l, a), Re(t, [], n, c + x, i, s - x, f - h, l, a);
    }
  }
}
function Ze(t, e, n, c, i) {
  const s = t.reduce((r, d) => r + d.weight, 0), f = s / i, l = e >= n, a = l ? f * e : f * n;
  if (a <= 0) return 1 / 0;
  let o = 0;
  for (const r of t) {
    const d = r.weight / s, h = l ? d * n : d * e, y = Math.max(a / h, h / a);
    y > o && (o = y);
  }
  return o;
}
function Be(t, e, n, c, i, s, f, l) {
  if (t.length === 0) return;
  const a = t.reduce((d, h) => d + h.weight, 0), o = c >= i;
  let r = 0;
  for (const d of t) {
    const h = d.weight / a;
    let y, v, x, g;
    o ? (g = h * i, x = c, y = e, v = n + r, r += g) : (x = h * c, g = i, y = e + r, v = n, r += x);
    const w = l / 2;
    f.push({
      x: y + w,
      y: v + w,
      w: Math.max(0, x - l),
      h: Math.max(0, g - l),
      item: d
    });
  }
}
function Jt(t, e, n, c, i) {
  const s = Math.min(1, Math.abs(t) / e), f = t >= 0 ? n : c;
  return Qt(i, f, s);
}
function Qt(t, e, n) {
  const c = Ke(t), i = Ke(e), s = Math.round(c[0] + (i[0] - c[0]) * n), f = Math.round(c[1] + (i[1] - c[1]) * n), l = Math.round(c[2] + (i[2] - c[2]) * n);
  return `rgb(${s},${f},${l})`;
}
function Ke(t) {
  let e = t.replace("#", "");
  e.length === 3 && (e = e[0] + e[0] + e[1] + e[1] + e[2] + e[2]);
  const n = parseInt(e, 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function an(t, e = {}) {
  const n = document.createElement("canvas");
  n.style.cssText = "width:100%;height:100%;display:block;cursor:pointer;", t.appendChild(n), getComputedStyle(t).position === "static" && (t.style.position = "relative");
  let i = {
    data: e.data ?? [],
    maxChange: e.maxChange ?? 10,
    positiveColor: e.positiveColor ?? "#26a69a",
    negativeColor: e.negativeColor ?? "#ef5350",
    neutralColor: e.neutralColor ?? "#2a2e39",
    background: e.background ?? "#131722",
    textColor: e.textColor ?? "#e6edf3",
    borderColor: e.borderColor ?? "#131722",
    gap: e.gap ?? 2,
    borderRadius: e.borderRadius ?? 3,
    onClick: e.onClick ?? (() => {
    })
  }, s = window.devicePixelRatio || 1, f = [];
  function l() {
    s = window.devicePixelRatio || 1, n.width = Math.round(t.clientWidth * s), n.height = Math.round(t.clientHeight * s);
  }
  l();
  const a = new ResizeObserver(() => {
    l(), o();
  });
  a.observe(t), n.addEventListener("click", (r) => {
    const d = n.getBoundingClientRect(), h = (r.clientX - d.left) * s, y = (r.clientY - d.top) * s;
    for (const v of f)
      if (h >= v.x && h <= v.x + v.w && y >= v.y && y <= v.y + v.h) {
        i.onClick(v.item);
        break;
      }
  });
  function o() {
    const r = n.getContext("2d");
    if (!r) return;
    const d = n.width, h = n.height;
    r.clearRect(0, 0, d, h), r.fillStyle = i.background, r.fillRect(0, 0, d, h);
    const y = i.gap * s, v = i.borderRadius * s;
    f = jt(i.data, 0, 0, d, h, y);
    for (const x of f) {
      if (x.w < 1 || x.h < 1) continue;
      const g = Jt(
        x.item.change,
        i.maxChange,
        i.positiveColor,
        i.negativeColor,
        i.neutralColor
      );
      r.fillStyle = g, r.beginPath(), r.roundRect(x.x, x.y, x.w, x.h, v), r.fill(), r.fillStyle = i.textColor;
      const w = 40 * s, T = 28 * s;
      if (x.w >= w && x.h >= T) {
        const F = Math.min(14 * s, x.w / 4, x.h / 3);
        r.font = `bold ${F}px sans-serif`, r.textAlign = "center", r.textBaseline = "middle";
        const B = x.x + x.w / 2;
        let A = x.y + x.h / 2;
        const G = x.h >= T * 1.5;
        if (G && (A -= F * 0.4), r.fillText(x.item.label, B, A, x.w - 8 * s), G) {
          const Y = F * 0.7;
          r.font = `${Y}px sans-serif`;
          const U = x.item.change >= 0 ? "+" : "";
          r.fillText(
            `${U}${x.item.change.toFixed(2)}%`,
            B,
            A + F * 0.9,
            x.w - 8 * s
          );
        }
        if (x.item.sublabel && x.h >= T * 2) {
          const Y = F * 0.55;
          r.font = `${Y}px sans-serif`, r.globalAlpha = 0.7, r.fillText(x.item.sublabel, B, A + F * 1.6, x.w - 8 * s), r.globalAlpha = 1;
        }
      } else if (x.w >= 20 * s && x.h >= 14 * s) {
        const F = Math.min(9 * s, x.w / 3, x.h * 0.7);
        r.font = `bold ${F}px sans-serif`, r.textAlign = "center", r.textBaseline = "middle", r.fillText(x.item.label, x.x + x.w / 2, x.y + x.h / 2, x.w - 4 * s);
      }
    }
  }
  return o(), {
    setData(r) {
      i.data = r, o();
    },
    setOptions(r) {
      i = { ...i, ...r }, o();
    },
    redraw: o,
    resize() {
      l(), o();
    },
    dispose() {
      a.disconnect(), n.remove();
    }
  };
}
function cn(t, e = {}) {
  const n = document.createElement("canvas");
  n.style.cssText = "width:100%;height:100%;display:block;", t.appendChild(n);
  let c = {
    data: e.data ?? [],
    lineColor: e.lineColor ?? "",
    fillColor: e.fillColor ?? "",
    lineWidth: e.lineWidth ?? 1.5,
    upColor: e.upColor ?? "#26a69a",
    downColor: e.downColor ?? "#ef5350",
    background: e.background ?? "transparent"
  }, i = window.devicePixelRatio || 1;
  function s() {
    i = window.devicePixelRatio || 1, n.width = Math.round(t.clientWidth * i), n.height = Math.round(t.clientHeight * i);
  }
  s();
  const f = new ResizeObserver(() => {
    s(), l();
  });
  f.observe(t);
  function l() {
    const a = n.getContext("2d");
    if (!a) return;
    const o = n.width, r = n.height;
    a.clearRect(0, 0, o, r), c.background !== "transparent" && (a.fillStyle = c.background, a.fillRect(0, 0, o, r));
    const d = c.data;
    if (d.length < 2) return;
    const h = d[d.length - 1] >= d[0], y = c.lineColor || (h ? c.upColor : c.downColor);
    let v = 1 / 0, x = -1 / 0;
    for (const U of d)
      U < v && (v = U), U > x && (x = U);
    const g = x - v || 1, w = 2 * i, T = 2 * i, F = o - w * 2, B = r - T * 2, A = (U) => w + U / (d.length - 1) * F, G = (U) => T + (1 - (U - v) / g) * B;
    a.beginPath(), a.moveTo(A(0), G(d[0]));
    for (let U = 1; U < d.length; U++)
      a.lineTo(A(U), G(d[U]));
    const Y = c.fillColor || y + "30";
    if (Y !== "none") {
      a.save();
      const U = new Path2D();
      U.moveTo(A(0), G(d[0]));
      for (let $ = 1; $ < d.length; $++)
        U.lineTo(A($), G(d[$]));
      U.lineTo(A(d.length - 1), r), U.lineTo(A(0), r), U.closePath();
      const I = a.createLinearGradient(0, 0, 0, r);
      I.addColorStop(0, Y), I.addColorStop(1, "transparent"), a.fillStyle = I, a.fill(U), a.restore();
    }
    a.strokeStyle = y, a.lineWidth = c.lineWidth * i, a.lineJoin = "round", a.lineCap = "round", a.stroke();
  }
  return l(), {
    setData(a) {
      c.data = a, l();
    },
    setOptions(a) {
      c = { ...c, ...a }, l();
    },
    redraw: l,
    resize() {
      s(), l();
    },
    dispose() {
      f.disconnect(), n.remove();
    }
  };
}
const en = [
  "#2962ff",
  "#26a69a",
  "#ef5350",
  "#FFD700",
  "#A78BFA",
  "#F472B6",
  "#4ECDC4",
  "#FF6B6B",
  "#38bdf8",
  "#fb923c",
  "#a3e635",
  "#e879f9"
];
function fn(t, e = {}) {
  const n = document.createElement("canvas");
  n.style.cssText = "width:100%;height:100%;display:block;cursor:pointer;", t.appendChild(n), getComputedStyle(t).position === "static" && (t.style.position = "relative");
  let i = {
    data: e.data ?? [],
    innerRadius: e.innerRadius ?? 0.55,
    colors: e.colors ?? en,
    background: e.background ?? "#1e222d",
    textColor: e.textColor ?? "#e6edf3",
    showLabels: e.showLabels ?? !0,
    showLegend: e.showLegend ?? !0,
    onClick: e.onClick ?? (() => {
    })
  }, s = window.devicePixelRatio || 1, f = -1;
  function l() {
    s = window.devicePixelRatio || 1, n.width = Math.round(t.clientWidth * s), n.height = Math.round(t.clientHeight * s);
  }
  l();
  const a = new ResizeObserver(() => {
    l(), x();
  });
  a.observe(t), n.addEventListener("mousemove", (g) => {
    const w = n.getBoundingClientRect(), T = (g.clientX - w.left) * s, F = (g.clientY - w.top) * s, B = v(T, F);
    B !== f && (f = B, x());
  }), n.addEventListener("mouseleave", () => {
    f !== -1 && (f = -1, x());
  }), n.addEventListener("click", (g) => {
    const w = n.getBoundingClientRect(), T = (g.clientX - w.left) * s, F = (g.clientY - w.top) * s, B = v(T, F);
    B >= 0 && i.onClick(i.data[B]);
  });
  let o = 0, r = 0, d = 0, h = 0, y = [];
  function v(g, w) {
    const T = g - o, F = w - r, B = Math.sqrt(T * T + F * F);
    if (B < h || B > d + 8 * s) return -1;
    let A = Math.atan2(F, T);
    A < -Math.PI / 2 && (A += Math.PI * 2);
    for (let G = 0; G < y.length; G++)
      if (A >= y[G].start && A < y[G].end) return G;
    return -1;
  }
  function x() {
    const g = n.getContext("2d");
    if (!g) return;
    const w = n.width, T = n.height;
    g.clearRect(0, 0, w, T), g.fillStyle = i.background, g.fillRect(0, 0, w, T);
    const F = i.data;
    if (F.length === 0) return;
    const B = F.reduce((m, b) => m + b.value, 0);
    if (B <= 0) return;
    const A = 18 * s, G = i.showLegend ? Math.ceil(Math.min(F.length, 12) / 6) : 0, Y = i.showLegend ? 10 * s : 0, U = G * A, I = 8 * s, $ = T - Y - U - I * 2, W = w - I * 2, q = Math.min(W, $);
    d = q / 2, h = d * i.innerRadius;
    const p = q + Y + U, u = (T - p) / 2;
    o = w / 2, r = u + d, y = [];
    let M = -Math.PI / 2;
    for (const m of F) {
      const b = m.value / B * Math.PI * 2;
      y.push({ start: M, end: M + b }), M += b;
    }
    for (let m = 0; m < F.length; m++) {
      const { start: b, end: C } = y[m], R = F[m].color || i.colors[m % i.colors.length], k = m === f, P = k ? d + 6 * s : d;
      g.fillStyle = R, g.globalAlpha = k ? 1 : 0.85, g.beginPath(), g.moveTo(
        o + Math.cos(b) * h,
        r + Math.sin(b) * h
      ), g.arc(o, r, P, b, C), g.arc(o, r, h, C, b, !0), g.closePath(), g.fill(), g.globalAlpha = 1;
    }
    if (i.showLabels) {
      g.fillStyle = i.textColor, g.textAlign = "center", g.textBaseline = "middle";
      const m = (d + h) / 2;
      for (let b = 0; b < F.length; b++) {
        const C = F[b].value / B * 100;
        if (C < 4) continue;
        const R = (y[b].start + y[b].end) / 2, k = o + Math.cos(R) * m, P = r + Math.sin(R) * m, E = Math.max(9 * s, Math.min(11 * s, d * 0.11));
        g.font = `bold ${E}px sans-serif`, g.fillText(`${C.toFixed(1)}%`, k, P);
      }
    }
    if (i.innerRadius > 0)
      if (g.fillStyle = i.textColor, g.textAlign = "center", g.textBaseline = "middle", f >= 0) {
        const m = F[f], b = m.value / B * 100;
        g.font = `bold ${Math.max(11 * s, h * 0.3)}px sans-serif`, g.fillText(m.label, o, r - h * 0.12), g.font = `${Math.max(9 * s, h * 0.22)}px sans-serif`, g.globalAlpha = 0.7, g.fillText(`${b.toFixed(1)}%`, o, r + h * 0.18), g.globalAlpha = 1;
      } else
        g.font = `${Math.max(9 * s, h * 0.2)}px sans-serif`, g.globalAlpha = 0.5, g.fillText("Total", o, r - h * 0.12), g.globalAlpha = 1, g.font = `bold ${Math.max(11 * s, h * 0.3)}px sans-serif`, g.fillText(tn(B), o, r + h * 0.18);
    if (i.showLegend && G > 0) {
      const m = u + q + Y, b = Math.min(F.length, 6), C = Math.min(110 * s, (w - 24 * s) / b), R = C * b, k = (w - R) / 2;
      g.font = `${10 * s}px sans-serif`, g.textAlign = "left", g.textBaseline = "middle";
      for (let P = 0; P < F.length && P < 12; P++) {
        const E = P % b, H = Math.floor(P / b), N = k + E * C, _ = m + H * A + A / 2, V = F[P].color || i.colors[P % i.colors.length];
        g.fillStyle = V, g.beginPath(), g.arc(N + 4 * s, _, 4 * s, 0, Math.PI * 2), g.fill(), g.fillStyle = i.textColor, g.globalAlpha = 0.85, g.fillText(F[P].label, N + 12 * s, _, C - 16 * s), g.globalAlpha = 1;
      }
    }
  }
  return x(), {
    setData(g) {
      i.data = g, x();
    },
    setOptions(g) {
      i = { ...i, ...g }, x();
    },
    redraw: x,
    resize() {
      l(), x();
    },
    dispose() {
      a.disconnect(), n.remove();
    }
  };
}
function tn(t) {
  return t >= 1e12 ? `$${(t / 1e12).toFixed(1)}T` : t >= 1e9 ? `$${(t / 1e9).toFixed(1)}B` : t >= 1e6 ? `$${(t / 1e6).toFixed(1)}M` : t >= 1e3 ? `$${(t / 1e3).toFixed(1)}K` : `$${t.toFixed(2)}`;
}
function dn(t, e = {}) {
  const n = document.createElement("canvas");
  n.style.cssText = "width:100%;height:100%;display:block;cursor:pointer;", t.appendChild(n), getComputedStyle(t).position === "static" && (t.style.position = "relative");
  let i = {
    data: e.data ?? [],
    autoColor: e.autoColor ?? !0,
    positiveColor: e.positiveColor ?? "#26a69a",
    negativeColor: e.negativeColor ?? "#ef5350",
    barColor: e.barColor ?? "#2962ff",
    background: e.background ?? "#1e222d",
    textColor: e.textColor ?? "#e6edf3",
    gridColor: e.gridColor ?? "rgba(255,255,255,0.06)",
    gap: e.gap ?? 0.3,
    borderRadius: e.borderRadius ?? 3,
    showValues: e.showValues ?? !0,
    showLabels: e.showLabels ?? !0,
    onClick: e.onClick ?? (() => {
    })
  }, s = window.devicePixelRatio || 1, f = [];
  function l() {
    s = window.devicePixelRatio || 1, n.width = Math.round(t.clientWidth * s), n.height = Math.round(t.clientHeight * s);
  }
  l();
  const a = new ResizeObserver(() => {
    l(), o();
  });
  a.observe(t), n.addEventListener("click", (r) => {
    const d = n.getBoundingClientRect(), h = (r.clientX - d.left) * s, y = (r.clientY - d.top) * s;
    for (const v of f)
      if (h >= v.x && h <= v.x + v.w && y >= v.y && y <= v.y + v.h) {
        i.onClick(i.data[v.idx]);
        break;
      }
  });
  function o() {
    const r = n.getContext("2d");
    if (!r) return;
    const d = n.width, h = n.height;
    r.clearRect(0, 0, d, h), r.fillStyle = i.background, r.fillRect(0, 0, d, h);
    const y = i.data;
    if (y.length === 0) return;
    f = [];
    const v = 50 * s, x = 16 * s, g = 20 * s, w = i.showLabels ? 36 * s : 12 * s, T = d - v - x, F = h - g - w;
    let B = 0, A = 0;
    for (const m of y)
      m.value < B && (B = m.value), m.value > A && (A = m.value);
    B > 0 && (B = 0), A < 0 && (A = 0);
    const G = A - B || 1;
    A += G * 0.1, B -= G * 0.1;
    const Y = A - B, U = (m) => g + (1 - (m - B) / Y) * F, I = U(0);
    r.strokeStyle = i.gridColor, r.lineWidth = s * 0.5;
    const $ = 5;
    for (let m = 0; m <= $; m++) {
      const b = B + Y / $ * m, C = U(b);
      r.beginPath(), r.moveTo(v, C), r.lineTo(v + T, C), r.stroke(), r.fillStyle = i.textColor, r.globalAlpha = 0.6, r.font = `${9 * s}px sans-serif`, r.textAlign = "right", r.textBaseline = "middle", r.fillText(je(b), v - 6 * s, C), r.globalAlpha = 1;
    }
    B < 0 && A > 0 && (r.strokeStyle = i.textColor, r.globalAlpha = 0.3, r.lineWidth = s, r.beginPath(), r.moveTo(v, I), r.lineTo(v + T, I), r.stroke(), r.globalAlpha = 1);
    const W = y.length, q = T / W, p = q * i.gap, u = q - p, M = Math.min(i.borderRadius * s, u / 2);
    for (let m = 0; m < W; m++) {
      const b = y[m], C = v + m * q + p / 2, R = U(b.value);
      let k;
      b.color ? k = b.color : i.autoColor ? k = b.value >= 0 ? i.positiveColor : i.negativeColor : k = i.barColor;
      const P = b.value >= 0 ? R : I, E = Math.abs(R - I);
      if (r.fillStyle = k, r.beginPath(), r.roundRect(C, P, u, E, [
        b.value >= 0 ? M : 0,
        b.value >= 0 ? M : 0,
        b.value < 0 ? M : 0,
        b.value < 0 ? M : 0
      ]), r.fill(), f.push({ x: C, y: P, w: u, h: E, idx: m }), i.showValues && E > 4 * s) {
        r.fillStyle = i.textColor, r.font = `bold ${9 * s}px sans-serif`, r.textAlign = "center", r.textBaseline = b.value >= 0 ? "bottom" : "top";
        const H = b.value >= 0 ? P - 3 * s : P + E + 3 * s;
        r.fillText(je(b.value), C + u / 2, H, u);
      }
      i.showLabels && (r.fillStyle = i.textColor, r.globalAlpha = 0.7, r.font = `${9 * s}px sans-serif`, r.textAlign = "center", r.textBaseline = "top", r.fillText(b.label, C + u / 2, g + F + 8 * s, q), r.globalAlpha = 1);
    }
  }
  return o(), {
    setData(r) {
      i.data = r, o();
    },
    setOptions(r) {
      i = { ...i, ...r }, o();
    },
    redraw: o,
    resize() {
      l(), o();
    },
    dispose() {
      a.disconnect(), n.remove();
    }
  };
}
function je(t) {
  return Math.abs(t) >= 1e9 ? `${(t / 1e9).toFixed(1)}B` : Math.abs(t) >= 1e6 ? `${(t / 1e6).toFixed(1)}M` : Math.abs(t) >= 1e3 ? `${(t / 1e3).toFixed(1)}K` : t.toFixed(t % 1 === 0 ? 0 : 2);
}
const nn = [
  { color: "#ef5350", from: 0, to: 25 },
  // Extreme Fear
  { color: "#ff9800", from: 25, to: 45 },
  // Fear
  { color: "#FFD700", from: 45, to: 55 },
  // Neutral
  { color: "#8bc34a", from: 55, to: 75 },
  // Greed
  { color: "#26a69a", from: 75, to: 100 }
  // Extreme Greed
];
function un(t, e = {}) {
  const n = document.createElement("canvas");
  n.style.cssText = "width:100%;height:100%;display:block;", t.appendChild(n), getComputedStyle(t).position === "static" && (t.style.position = "relative");
  let i = {
    value: e.value ?? 50,
    min: e.min ?? 0,
    max: e.max ?? 100,
    label: e.label ?? "",
    formatValue: e.formatValue ?? ((o) => o.toFixed(0)),
    segments: e.segments ?? nn,
    trackColor: e.trackColor ?? "#2a2e39",
    needleColor: e.needleColor ?? "#e6edf3",
    background: e.background ?? "#1e222d",
    textColor: e.textColor ?? "#e6edf3",
    thickness: e.thickness ?? 0.18
  }, s = window.devicePixelRatio || 1;
  function f() {
    s = window.devicePixelRatio || 1, n.width = Math.round(t.clientWidth * s), n.height = Math.round(t.clientHeight * s);
  }
  f();
  const l = new ResizeObserver(() => {
    f(), a();
  });
  l.observe(t);
  function a() {
    var V;
    const o = n.getContext("2d");
    if (!o) return;
    const r = n.width, d = n.height;
    o.clearRect(0, 0, r, d), o.fillStyle = i.background, o.fillRect(0, 0, r, d);
    const h = i.max - i.min || 1, y = Math.max(8 * s, Math.min(10 * s, d * 0.04));
    o.font = `${y}px sans-serif`;
    const v = o.measureText(String(i.min)).width, x = o.measureText(String(i.max)).width, g = Math.max(v, x) + 8 * s, w = Math.min(20 * s, d * 0.14), T = i.label ? Math.max(9 * s, Math.min(11 * s, d * 0.06)) : 0, F = 14 * s, B = F + w + (T > 0 ? 4 * s + T : 0), A = (r - g * 2) / 2, G = d - B, Y = Math.min(A, G) * 0.82, U = Y * i.thickness, I = Y + B, $ = (d - I) / 2, W = r / 2, q = $ + Y, p = Math.PI, u = 0, M = (L) => {
      const O = Math.max(0, Math.min(1, (L - i.min) / h));
      return p + O * Math.PI;
    };
    o.strokeStyle = i.trackColor, o.lineWidth = U, o.lineCap = "round", o.beginPath(), o.arc(W, q, Y, p, u), o.stroke();
    for (const L of i.segments) {
      const O = M(Math.max(L.from, i.min)), S = M(Math.min(L.to, i.max));
      S <= O || (o.strokeStyle = L.color, o.lineWidth = U, o.lineCap = "butt", o.beginPath(), o.arc(W, q, Y, O, S), o.stroke());
    }
    o.lineCap = "round", o.strokeStyle = ((V = i.segments[0]) == null ? void 0 : V.color) ?? i.trackColor, o.lineWidth = U, o.beginPath(), o.arc(W, q, Y, p, p + 0.01), o.stroke();
    const m = i.segments[i.segments.length - 1];
    o.strokeStyle = (m == null ? void 0 : m.color) ?? i.trackColor, o.beginPath(), o.arc(W, q, Y, u - 0.01, u), o.stroke(), o.font = `${y}px sans-serif`, o.fillStyle = i.textColor, o.globalAlpha = 0.5, o.textBaseline = "top", o.textAlign = "center", o.fillText(String(i.min), W - Y, q + 6 * s), o.fillText(String(i.max), W + Y, q + 6 * s), o.globalAlpha = 1;
    const b = M(i.value), C = Y - U / 2 - 4 * s, R = W + Math.cos(b) * C, k = q + Math.sin(b) * C;
    o.strokeStyle = "rgba(0,0,0,0.3)", o.lineWidth = 4 * s, o.lineCap = "round", o.beginPath(), o.moveTo(W, q), o.lineTo(R + 2 * s, k + 2 * s), o.stroke(), o.strokeStyle = i.needleColor, o.lineWidth = 2.5 * s, o.beginPath(), o.moveTo(W, q), o.lineTo(R, k), o.stroke(), o.fillStyle = i.needleColor, o.beginPath(), o.arc(W, q, 4 * s, 0, Math.PI * 2), o.fill();
    const P = i.formatValue(i.value);
    let E = w;
    o.font = `bold ${E}px sans-serif`;
    const H = o.measureText(P).width, N = r * 0.85;
    H > N && (E = E * (N / H)), o.fillStyle = i.textColor, o.textAlign = "center", o.textBaseline = "top", o.font = `bold ${E}px sans-serif`;
    const _ = q + F;
    o.fillText(P, W, _), i.label && (o.font = `${T}px sans-serif`, o.globalAlpha = 0.55, o.fillText(i.label, W, _ + E + 4 * s), o.globalAlpha = 1);
  }
  return a(), {
    setValue(o) {
      i.value = o, a();
    },
    setOptions(o) {
      i = { ...i, ...o }, a();
    },
    redraw: a,
    resize() {
      f(), a();
    },
    dispose() {
      l.disconnect(), n.remove();
    }
  };
}
export {
  on as DiChart,
  Et as computeBollinger,
  Fe as computeEMA,
  Ut as computeMACD,
  Ot as computeRSI,
  Qe as computeSMA,
  dn as createBarChart,
  ln as createDepthChart,
  fn as createDonutChart,
  un as createGauge,
  an as createHeatmap,
  cn as createSparkline,
  sn as createTickAggregator,
  rt as darkTheme,
  rn as downsampleOHLC,
  lt as lightTheme,
  At as toHeikinAshi,
  Dt as toRenko
};
//# sourceMappingURL=index.js.map
