'use strict';
/* =====================================================================
   core.js — motor de audio, componentes de interfaz y visualizadores
   ===================================================================== */

const $ = (s, e = document) => e.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in (attrs || {})) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(c));
  }
  return e;
}
const SVGNS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs, ...kids) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in (attrs || {})) e.setAttribute(k, attrs[k]);
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}

/* ---------- música ---------- */
const NN = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const midiOf = f => 69 + 12 * Math.log2(f / 440);
const fHz = m => 440 * Math.pow(2, (m - 69) / 12);
function noteName(f) {
  const m = midiOf(f), r = Math.round(m), c = Math.round((m - r) * 100);
  return NN[((r % 12) + 12) % 12] + (Math.floor(r / 12) - 1) + (Math.abs(c) >= 3 ? ' ' + (c > 0 ? '+' : '') + c + '¢' : '');
}
const fmtHz = v => v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 1 : 2) + ' kHz' : (v >= 100 ? v.toFixed(0) : v.toFixed(1)) + ' Hz';
const fmtTime = v => v < 1 ? Math.round(v * 1000) + ' ms' : v.toFixed(2) + ' s';
const fmtPct = v => Math.round(v * 100) + ' %';
const dbOf = a => 20 * Math.log10(Math.max(a, 1e-6));

/* ---------- motor de audio ---------- */
const AE = {
  ctx: null, vol: null, volume: 0.5, current: null, noise: null,
  get sr() { return this.ctx ? this.ctx.sampleRate : 44100; },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; }
    const C = window.AudioContext || window.webkitAudioContext;
    const ctx = this.ctx = new C({ latencyHint: 'interactive' });
    this.vol = ctx.createGain();
    this.vol.gain.value = this.volume * this.volume;
    const comp = ctx.createDynamicsCompressor(); // limitador de seguridad
    comp.threshold.value = -8; comp.knee.value = 0; comp.ratio.value = 20;
    comp.attack.value = 0.002; comp.release.value = 0.15;
    this.vol.connect(comp); comp.connect(ctx.destination);
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = b;
    return ctx;
  },
  setVolume(v) {
    this.volume = v;
    if (this.ctx) this.vol.gain.setTargetAtTime(v * v, this.ctx.currentTime, 0.02);
  },
  stopAll() { if (this.current) this.current.stop(); },
  get now() { return this.ctx.currentTime; }
};
/* cambia un AudioParam sin “clics” */
function setP(p, v, tc = 0.015) { p.setTargetAtTime(v, AE.ctx.currentTime, tc); }

/* kit: crea nodos y los recuerda para detenerlos todos al terminar */
function Kit(ctx) {
  const srcs = [], cleanups = [];
  const k = {
    osc(type = 'sine', freq = 440) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.start(); srcs.push(o); return o; },
    cs(v = 0) { const c = ctx.createConstantSource(); c.offset.value = v; c.start(); srcs.push(c); return c; },
    noise() { const s = ctx.createBufferSource(); s.buffer = AE.noise; s.loop = true; s.start(); srcs.push(s); return s; },
    gain(v = 1) { const g = ctx.createGain(); g.gain.value = v; return g; },
    biq(type, f, q) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; },
    every(fn, ms) { const id = setInterval(fn, ms); cleanups.push(() => clearInterval(id)); return id; },
    loop(fn) { // fn() devuelve los ms hasta la próxima llamada
      let alive = true, id;
      const tick = () => { if (!alive) return; const ms = fn(); id = setTimeout(tick, ms); };
      tick(); cleanups.push(() => { alive = false; clearTimeout(id); });
    },
    onStop(fn) { cleanups.push(fn); },
    stop() {
      srcs.forEach(s => { try { s.stop(); } catch (e) { } });
      cleanups.forEach(c => c());
    }
  };
  return k;
}

/* ---------- filtro: etapas biquad compartidas por varios módulos ---------- */
function filterStages(type, res, slope) {
  const qOf = r => type === 'bandpass' ? 0.7 + r * r * 18 : -3.01 + r * 27; // LP/HP en dB, BP lineal
  const but = type === 'bandpass' ? 0.7 : -3.01;
  return slope === 24 ? [but, qOf(res)] : [qOf(res)];
}
/* respuesta en magnitud (fórmulas del cookbook de RBJ, igual que Web Audio) */
function biquadMag(type, f0, q, f, sr) {
  const w0 = 2 * Math.PI * Math.min(f0, sr * 0.49) / sr, cw = Math.cos(w0), sw = Math.sin(w0);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'bandpass') { const al = sw / (2 * q); b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else {
    const al = sw / (2 * Math.pow(10, q / 20));
    if (type === 'lowpass') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; } else { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; }
    a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al;
  }
  const w = 2 * Math.PI * f / sr, c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
  const nr = b0 + b1 * c1 + b2 * c2, ni = -(b1 * s1 + b2 * s2);
  const dr = a0 + a1 * c1 + a2 * c2, di = -(a1 * s1 + a2 * s2);
  return Math.sqrt((nr * nr + ni * ni) / (dr * dr + di * di));
}
function filterMagDb(type, cut, res, slope, f) {
  let m = 1;
  for (const q of filterStages(type, res, slope)) m *= biquadMag(type, cut, q, f, AE.sr);
  return dbOf(m);
}
function FilterChain(ctx, kit) {
  const f1 = kit.biq('lowpass', 1000, 0), f2 = kit.biq('lowpass', 1000, 0);
  const input = kit.gain(1), output = kit.gain(1);
  let wired = 0;
  function wire(slope) {
    if (wired === slope) return; wired = slope;
    input.disconnect(); f1.disconnect(); f2.disconnect();
    input.connect(f1);
    if (slope === 24) { f1.connect(f2); f2.connect(output); } else f1.connect(output);
  }
  return {
    input, output, f1, f2, detunes: [f1.detune, f2.detune],
    apply({ type, cut, res, slope }) {
      wire(slope);
      f1.type = f2.type = type;
      const qs = filterStages(type, res, slope), fr = Math.min(cut, AE.sr * 0.45);
      setP(f1.frequency, fr); setP(f2.frequency, fr);
      setP(f1.Q, qs[0]); if (qs[1] != null) setP(f2.Q, qs[1]);
    }
  };
}

/* ---------- oscilador de pulso (PWM) ---------- */
function makePulse(ctx, kit, freq) {
  const saw = kit.osc('sawtooth', freq), cs = kit.cs(0), sum = kit.gain(1);
  const sh = ctx.createWaveShaper(), c = new Float32Array(2048);
  for (let i = 0; i < 2048; i++) c[i] = i < 1024 ? -1 : 1;
  sh.curve = c; sh.oversample = '4x';
  const hp = kit.biq('highpass', 20, 0), out = kit.gain(1);
  saw.connect(sum); cs.connect(sum); sum.connect(sh); sh.connect(hp); hp.connect(out);
  return {
    saw, cs, out,
    setDuty(d) { setP(cs.offset, 2 * d - 1, 0.01); },
    setFreq(f) { setP(saw.frequency, f); }
  };
}

/* ---------- envolvente ADSR ---------- */
class Env {
  constructor(ctx, param, { lo = 0, hi = 1 } = {}) {
    this.ctx = ctx; this.p = param; this.lo = lo; this.hi = hi;
    this.a = 0.01; this.d = 0.2; this.s = 0.6; this.r = 0.3;
    this.segs = []; this.gate = false;
    param.value = lo;
  }
  map(l) { return this.lo + (this.hi - this.lo) * l; }
  at(t = this.ctx.currentTime) {
    const S = this.segs; if (!S.length) return 0;
    let l = S[0].l0;
    for (const s of S) {
      if (t < s.t0) return l;
      if (t >= s.t1) { l = s.l1; continue; }
      return s.l0 + (s.l1 - s.l0) * ((t - s.t0) / (s.t1 - s.t0));
    }
    return l;
  }
  _sched(segs, t) {
    const p = this.p; p.cancelScheduledValues(t);
    p.setValueAtTime(this.map(segs[0].l0), t);
    for (const s of segs) p.linearRampToValueAtTime(this.map(s.l1), s.t1);
    this.segs = segs;
  }
  on() {
    const t = this.ctx.currentTime, cur = this.at(t);
    const A = Math.max(this.a, 0.002), D = Math.max(this.d, 0.002);
    this._sched([{ t0: t, t1: t + A, l0: cur, l1: 1 }, { t0: t + A, t1: t + A + D, l0: 1, l1: this.s }], t);
    this.gate = true;
  }
  off() {
    const t = this.ctx.currentTime, cur = this.at(t), R = Math.max(this.r, 0.002);
    this._sched([{ t0: t, t1: t + R, l0: cur, l1: 0 }], t);
    this.gate = false;
  }
  /* si cambian los parámetros con la tecla sostenida y ya estamos en sustain, ajusta */
  touch() {
    if (!this.gate || !this.segs.length) return;
    const t = this.ctx.currentTime, last = this.segs[this.segs.length - 1];
    if (t >= last.t1) this._sched([{ t0: t, t1: t + 0.03, l0: this.at(t), l1: this.s }], t);
  }
}

/* =====================================================================
   componentes de interfaz
   ===================================================================== */
function ctl(caption, el) { return h('div', { class: 'ctl' }, caption ? h('span', { class: 'cap' }, caption) : null, el); }

function knob(o) {
  const { label, min, max, value, log = false, step = 0, fmt = v => v.toFixed(2), onInput = () => { }, size = 56, cls = '' } = o;
  const def = o.def ?? value;
  let v = value;
  const toP = x => log ? Math.log(x / min) / Math.log(max / min) : (x - min) / (max - min);
  const fromP = p => {
    p = clamp(p, 0, 1);
    let x = log ? min * Math.pow(max / min, p) : min + (max - min) * p;
    if (step && !log) x = Math.round(x / step) * step;
    return clamp(x, min, max);
  };
  const c = size / 2, R = size / 2 - 6;
  const pt = (deg, r) => { const a = deg * Math.PI / 180; return [c + r * Math.sin(a), c - r * Math.cos(a)]; };
  const arc = (a0, a1) => {
    const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${(a1 - a0) > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };
  const trk = sv('path', { class: 'trk', d: arc(-135, 135), fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round' });
  const val = sv('path', { class: 'val', fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round' });
  const body = sv('circle', { class: 'body', cx: c, cy: c, r: R - 6, 'stroke-width': 1 });
  const ptr = sv('line', { class: 'ptr', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
  const svg = sv('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size }, trk, val, body, ptr);
  const kv = h('div', { class: 'kv' }), kl = h('div', { class: 'kl' }, label);
  const el = h('div', { class: 'knob ' + cls, tabindex: 0, role: 'slider', 'aria-label': label }, svg, kv, kl);

  function render() {
    const p = toP(v), ang = -135 + 270 * p;
    if (p > 0.002) val.setAttribute('d', arc(-135, ang)); else val.setAttribute('d', '');
    const [x0, y0] = pt(ang, R - 16), [x1, y1] = pt(ang, R - 7);
    ptr.setAttribute('x1', x0); ptr.setAttribute('y1', y0); ptr.setAttribute('x2', x1); ptr.setAttribute('y2', y1);
    kv.textContent = fmt(v);
    el.setAttribute('aria-valuemin', min); el.setAttribute('aria-valuemax', max);
    el.setAttribute('aria-valuenow', v); el.setAttribute('aria-valuetext', fmt(v));
  }
  function set(x, silent) { v = clamp(x, min, max); render(); if (!silent) onInput(v); }
  let sy = 0, sp = 0, drag = false;
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.focus(); el.setPointerCapture(e.pointerId); drag = true; sy = e.clientY; sp = toP(v); });
  el.addEventListener('pointermove', e => {
    if (!drag) return;
    const dy = sy - e.clientY;
    const nv = fromP(sp + dy / (e.shiftKey ? 700 : 170));
    if (nv !== v) set(nv);
  });
  const end = () => { drag = false; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', e => { e.preventDefault(); set(fromP(toP(v) - Math.sign(e.deltaY) * (e.shiftKey ? 0.005 : 0.02))); }, { passive: false });
  el.addEventListener('dblclick', () => set(def));
  el.addEventListener('keydown', e => {
    const k = e.key; let dir = 0, big = e.shiftKey ? 5 : 1;
    if (k === 'ArrowUp' || k === 'ArrowRight') dir = 1; else if (k === 'ArrowDown' || k === 'ArrowLeft') dir = -1;
    else if (k === 'PageUp') { dir = 1; big = 10; } else if (k === 'PageDown') { dir = -1; big = 10; }
    else if (k === 'Home') { e.preventDefault(); return set(min); } else if (k === 'End') { e.preventDefault(); return set(max); }
    else return;
    e.preventDefault();
    if (step && !log) set(v + dir * step * big); else set(fromP(toP(v) + dir * 0.01 * big));
  });
  el.set = set; el.get = () => v;
  render();
  return el;
}

function seg({ options, value, onChange = () => { }, label = '' }) {
  let cur = value;
  const btns = options.map(o => h('button', { type: 'button', role: 'radio', class: 'segb', onclick: () => set(o.v) }, o.label));
  const wrap = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label }, btns);
  function render() { btns.forEach((b, i) => { const on = options[i].v === cur; b.setAttribute('aria-checked', on); b.classList.toggle('on', on); }); }
  function set(v, silent) { cur = v; render(); if (!silent) onChange(v); }
  wrap.set = set; wrap.get = () => cur; render();
  return wrap;
}

function toggle({ label, value = false, onChange = () => { } }) {
  let on = value;
  const b = h('button', { type: 'button', class: 'tgl', role: 'switch', onclick: () => set(!on) }, label);
  function render() { b.setAttribute('aria-checked', on); }
  function set(v, silent) { on = !!v; render(); if (!silent) onChange(on); }
  b.set = set; b.get = () => on; render();
  return b;
}

function chips(items) {
  return h('div', { class: 'chips' }, items.map(i => h('button', { type: 'button', class: 'chip', onclick: i.fn, title: i.title || '' }, i.label)));
}

function fader({ label, min = 0, max = 1, value = 0, onInput = () => { }, height = 90 }) {
  let v = value;
  const fill = h('div', { class: 'ff' }), th = h('div', { class: 'fth' });
  const track = h('div', { class: 'ft', style: `height:${height}px` }, fill, th);
  const el = h('div', { class: 'fader', tabindex: 0, role: 'slider', 'aria-label': label }, track, h('div', { class: 'fl' }, label));
  function render() {
    const p = (v - min) / (max - min);
    fill.style.height = (p * 100) + '%'; th.style.bottom = (p * 100) + '%';
    el.setAttribute('aria-valuenow', v.toFixed(2)); el.setAttribute('aria-valuemin', min); el.setAttribute('aria-valuemax', max);
  }
  function set(x, silent) { v = clamp(x, min, max); render(); if (!silent) onInput(v); }
  let drag = false;
  const fromEvent = e => { const r = track.getBoundingClientRect(); set(min + (1 - (e.clientY - r.top) / r.height) * (max - min)); };
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.focus(); el.setPointerCapture(e.pointerId); drag = true; fromEvent(e); });
  el.addEventListener('pointermove', e => { if (drag) fromEvent(e); });
  el.addEventListener('pointerup', () => drag = false); el.addEventListener('pointercancel', () => drag = false);
  el.addEventListener('keydown', e => {
    const k = e.key, st = (max - min) * 0.05;
    if (k === 'ArrowUp' || k === 'ArrowRight') set(v + st); else if (k === 'ArrowDown' || k === 'ArrowLeft') set(v - st);
    else if (k === 'Home') set(min); else if (k === 'End') set(max); else return;
    e.preventDefault();
  });
  el.set = set; el.get = () => v; render();
  return el;
}

function gatePad({ label, onDown, onUp }) {
  const b = h('button', { type: 'button', class: 'pad' }, label);
  let down = false;
  const dn = () => { if (!down) { down = true; b.classList.add('down'); onDown(); } };
  const up = () => { if (down) { down = false; b.classList.remove('down'); onUp(); } };
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); dn(); });
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  b.addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) dn(); } });
  b.addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'Enter') up(); });
  b.addEventListener('blur', up);
  return b;
}

/* =====================================================================
   visualizadores
   ===================================================================== */
/* colores de los canvas: se leen de las variables CSS (tema claro/oscuro) */
const COL = {};
function readColors() {
  const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
  Object.assign(COL, { bg: v('--cv-bg'), grid: v('--cv-grid'), trace: v('--cv-ink'), spec: v('--cv-ink'), mark: v('--cv-mid'), text: v('--cv-mid'), dim: v('--cv-dim'), blue: v('--cv-accent'), fill: v('--cv-fill') });
}
readColors();
function refreshTheme() { readColors(); DEMOS.forEach(d => d.dirty = true); }
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
darkMQ.addEventListener('change', refreshTheme);
const isDark = () => (document.documentElement.dataset.theme || (darkMQ.matches ? 'dark' : 'light')) === 'dark';

function fit(c) {
  const r = c.getBoundingClientRect();
  if (r.width < 2) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(r.width * dpr), hh = Math.round(r.height * dpr);
  if (c.width !== w || c.height !== hh) { c.width = w; c.height = hh; }
  const g = c.getContext('2d'); g.dpr = dpr;
  return { g, w, h: hh };
}
function txt(g, s, x, y, col = COL.text, align = 'left', size = 10) {
  g.fillStyle = col; g.font = `${size * g.dpr}px system-ui,sans-serif`; g.textAlign = align; g.fillText(s, x, y);
}
function grid(g, w, hh, cols = 8, rows = 4) {
  g.fillStyle = COL.bg; g.fillRect(0, 0, w, hh);
  g.strokeStyle = COL.grid; g.lineWidth = 1; g.beginPath();
  for (let i = 1; i < cols; i++) { const x = Math.round(w * i / cols) + .5; g.moveTo(x, 0); g.lineTo(x, hh); }
  for (let i = 1; i < rows; i++) { const y = Math.round(hh * i / rows) + .5; g.moveTo(0, y); g.lineTo(w, y); }
  g.stroke();
}
function idleMsg(g, w, hh, msg = 'Press «Play»') { txt(g, msg, w / 2, hh / 2 + 4 * g.dpr, COL.dim, 'center', 12); }

function drawScope(g, w, hh, d, spec) {
  grid(g, w, hh);
  const mid = hh / 2, zoom = spec.zoom || 2;
  if (spec.levels) {
    g.setLineDash([4 * g.dpr, 4 * g.dpr]); g.strokeStyle = COL.dim; g.beginPath();
    for (const l of spec.levels) for (const s of [-1, 1]) { const y = mid - s * l * zoom * mid; g.moveTo(0, y); g.lineTo(w, y); }
    g.stroke(); g.setLineDash([]);
    for (const l of spec.levels) txt(g, dbOf(l / (spec.ref || 1)).toFixed(0) + ' dB', 4 * g.dpr, mid - l * zoom * mid - 3 * g.dpr);
  }
  g.strokeStyle = COL.grid; g.beginPath(); g.moveTo(0, mid); g.lineTo(w, mid); g.stroke();
  if (!d.playing || !d.an) return idleMsg(g, w, hh);
  const N = d.an.fftSize, buf = d._tb || (d._tb = new Float32Array(N));
  d.an.getFloatTimeDomainData(buf);
  let win = spec.samples ? spec.samples(d) : 1024;
  win = clamp(Math.round(win), 128, N / 2);
  let start = 0;
  if (spec.trigger !== false) for (let i = 1; i < N - win; i++) if (buf[i - 1] < 0 && buf[i] >= 0) { start = i; break; }
  g.strokeStyle = COL.trace; g.lineWidth = 2 * g.dpr; g.lineJoin = 'round'; g.beginPath();
  for (let x = 0; x < w; x += 2) {
    const s = buf[start + Math.floor(x / w * win)] || 0, y = clamp(mid - s * zoom * mid, 1, hh - 1);
    x ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
}

function drawSpectrum(g, w, hh, d, spec) {
  grid(g, w, hh, 8, 4);
  const log = !!spec.log, maxHz = spec.maxHz || 4000, minHz = log ? 20 : 0;
  const fx = x => log ? minHz * Math.pow(maxHz / minHz, x / w) : x / w * maxHz;
  const xf = f => log ? Math.log(f / minHz) / Math.log(maxHz / minHz) * w : f / maxHz * w;
  // ejes
  const ticks = log ? [50, 100, 200, 500, 1000, 2000, 5000, 10000] : (maxHz > 6000 ? [2000, 4000, 6000, 8000, 10000] : maxHz > 2500 ? [1000, 2000, 3000, 4000, 5000] : [500, 1000, 1500, 2000]);
  for (const t of ticks) if (t < maxHz) txt(g, t >= 1000 ? (t / 1000) + 'k' : t, xf(t), hh - 3 * g.dpr, COL.dim, 'center');
  if (spec.harm && d.playing) {
    const f0 = spec.harm(d);
    if (f0 > 0) {
      g.setLineDash([3 * g.dpr, 4 * g.dpr]); g.lineWidth = 1; g.strokeStyle = COL.dim;
      for (let n = 1; n * f0 < maxHz && n <= 40; n++) { const x = xf(n * f0); g.beginPath(); g.moveTo(x, 12 * g.dpr); g.lineTo(x, hh); g.stroke(); if (n <= 16) txt(g, n, x, 9 * g.dpr, COL.text, 'center', 9); }
      g.setLineDash([]);
    }
  }
  if (spec.markers) {
    for (const m of spec.markers(d)) {
      if (m.f <= 0 || m.f > maxHz) continue;
      const x = xf(m.f);
      g.strokeStyle = m.color || COL.blue; g.lineWidth = 2 * g.dpr; g.setLineDash([]);
      g.beginPath(); g.moveTo(x, 18 * g.dpr); g.lineTo(x, hh - 12 * g.dpr); g.stroke();
      txt(g, m.label || '', x, 14 * g.dpr, m.color || COL.blue, 'center', 10);
    }
  }
  if (!d.playing || !d.an) return idleMsg(g, w, hh);
  const bins = d.an.frequencyBinCount, arr = d._sb || (d._sb = new Float32Array(bins));
  d.an.getFloatFrequencyData(arr);
  const hz = AE.sr / d.an.fftSize;
  g.fillStyle = COL.fill; g.strokeStyle = COL.spec; g.lineWidth = 1.5 * g.dpr;
  g.beginPath(); g.moveTo(0, hh);
  let last = hh;
  for (let x = 0; x < w; x += 2) {
    const a = Math.max(0, Math.floor(fx(x) / hz)), b = Math.max(a, Math.floor(fx(x + 2) / hz));
    let m = -140; for (let i = a; i <= b && i < bins; i++) if (arr[i] > m) m = arr[i];
    last = hh * (1 - clamp((m + 90) / 90, 0, 1)); g.lineTo(x, last);
  }
  g.lineTo(w, hh); g.closePath(); g.fill();
  g.beginPath();
  for (let x = 0; x < w; x += 2) {
    const a = Math.max(0, Math.floor(fx(x) / hz)), b = Math.max(a, Math.floor(fx(x + 2) / hz));
    let m = -140; for (let i = a; i <= b && i < bins; i++) if (arr[i] > m) m = arr[i];
    const y = hh * (1 - clamp((m + 90) / 90, 0, 1)); x ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
}

/* historial de una magnitud en el tiempo (envolventes, LFO…) */
function drawHistory(g, w, hh, hist, { secs = 6, lo = 0, hi = 1, color = COL.trace, label = '', gate = false, zeroLine = false } = {}) {
  grid(g, w, hh, 6, 4);
  if (zeroLine) { g.strokeStyle = COL.dim; g.beginPath(); g.moveTo(0, hh / 2); g.lineTo(w, hh / 2); g.stroke(); }
  if (label) txt(g, label, 6 * g.dpr, 12 * g.dpr);
  if (!hist.length) return;
  const tn = hist[hist.length - 1].t;
  if (gate) {
    g.fillStyle = COL.fill;
    let on = null;
    for (const p of hist) {
      const x = w - (tn - p.t) / secs * w;
      if (p.g && on === null) on = x;
      if (!p.g && on !== null) { g.fillRect(on, hh - 14 * g.dpr, x - on, 14 * g.dpr); on = null; }
    }
    if (on !== null) g.fillRect(on, hh - 14 * g.dpr, w - on, 14 * g.dpr);
    txt(g, 'gate', w - 4 * g.dpr, hh - 4 * g.dpr, COL.blue, 'right', 9);
  }
  g.strokeStyle = color; g.lineWidth = 2 * g.dpr; g.lineJoin = 'round'; g.beginPath();
  let first = true;
  for (const p of hist) {
    const x = w - (tn - p.t) / secs * w, y = (hh - 16 * g.dpr) * (1 - (p.v - lo) / (hi - lo)) + 4 * g.dpr;
    first ? g.moveTo(x, y) : g.lineTo(x, y); first = false;
  }
  g.stroke();
}
function pushHist(hist, t, v, gate, secs) {
  hist.push({ t, v, g: gate });
  while (hist.length && t - hist[0].t > secs + 0.5) hist.shift();
}

/* =====================================================================
   tarjeta de demostración
   ===================================================================== */
const DEMOS = [];
function demo(parent, o) {
  const d = { o, playing: false, inst: null, an: null, out: null, kit: null, s: {}, stopHooks: [], dirty: true, visible: true };
  const btn = h('button', { type: 'button', class: 'play', 'aria-pressed': 'false', onclick: () => d.playing ? d.stop() : d.start() }, '▶ Play');
  d.controls = h('div', { class: 'controls' });
  d.readout = o.readout === false ? null : h('div', { class: 'readout', 'aria-live': 'off' });
  d.extra = h('div');
  const vg = h('div', { class: 'viz-grid' });
  d.canv = (o.viz || []).map(spec => {
    const c = h('canvas', { 'aria-label': spec.label || '' });
    vg.append(h('figure', {}, c, h('figcaption', {}, spec.label || '')));
    return { c, spec };
  });
  d.card = h('article', { class: 'card' },
    h('div', { class: 'card-head' }, h('h3', {}, o.title), btn),
    o.text ? h('p', { class: 'txt', html: o.text }) : null,
    d.controls, d.extra, d.readout, vg);
  parent.append(d.card);

  d.setReadout = html => { if (d.readout) d.readout.innerHTML = html; };
  d.redraw = () => { d.dirty = true; };
  d.start = () => {
    const ctx = AE.init(); AE.stopAll(); AE.current = d;
    const out = ctx.createGain(); out.gain.value = 0; out.gain.setTargetAtTime(1, ctx.currentTime, 0.01);
    const an = ctx.createAnalyser(); an.fftSize = 8192; an.smoothingTimeConstant = 0.6; an.minDecibels = -100; an.maxDecibels = -10;
    out.connect(an); out.connect(AE.vol);
    d.out = out; d.an = an; d.kit = Kit(ctx); d.playing = true;
    d.inst = o.build(ctx, out, d.kit, d) || {};
    btn.textContent = '■ Stop'; btn.setAttribute('aria-pressed', 'true');
  };
  d.stop = () => {
    if (!d.playing) return;
    d.playing = false;
    const ctx = AE.ctx, out = d.out, kit = d.kit, inst = d.inst;
    out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
    setTimeout(() => { try { inst.stop && inst.stop(); } catch (e) { } kit.stop(); out.disconnect(); }, 140);
    d.inst = null; d.dirty = true;
    d.stopHooks.forEach(fn => fn());
    if (AE.current === d) AE.current = null;
    btn.textContent = '▶ Play'; btn.setAttribute('aria-pressed', 'false');
  };
  d.draw = () => {
    for (const { c, spec } of d.canv) {
      const f = fit(c); if (!f) continue;
      const { g, w, h: hh } = f;
      if (spec.kind === 'scope') drawScope(g, w, hh, d, spec);
      else if (spec.kind === 'spectrum') drawSpectrum(g, w, hh, d, spec);
      else if (spec.kind === 'custom') {
        if (!d.playing && !spec.always) { grid(g, w, hh); idleMsg(g, w, hh); } else spec.draw(g, w, hh, d);
      }
    }
  };
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { d.visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(d.card);
  DEMOS.push(d);
  return d;
}
(function loop() {
  for (const d of DEMOS) if (d.visible && (d.playing || d.dirty)) { d.dirty = false; try { d.draw(); } catch (e) { console.error(e); } }
  requestAnimationFrame(loop);
})();
window.addEventListener('resize', () => DEMOS.forEach(d => d.dirty = true));

/* botón mantener-tecla + repetición automática, para demos con envolvente */
function gateControls(d, gateOn, gateOff, { hold = 700, period = 1700 } = {}) {
  let auto = false, t1 = 0, t2 = 0;
  const clear = () => { clearTimeout(t1); clearTimeout(t2); };
  const pad = gatePad({
    label: 'Gate: mantén presionado',
    onDown: () => { if (!d.playing) d.start(); gateOn(); },
    onUp: () => { if (d.playing) gateOff(); }
  });
  const run = () => {
    if (!auto || !d.playing) return;
    gateOn(); t2 = setTimeout(() => { if (d.playing) gateOff(); }, hold); t1 = setTimeout(run, period);
  };
  const tg = toggle({
    label: 'Auto repeat (repetir)', onChange: v => {
      auto = v; clear(); if (v) { if (!d.playing) d.start(); run(); }
    }
  });
  d.stopHooks.push(() => { clear(); auto = false; tg.set(false, true); });
  return h('div', { class: 'gate' }, pad, tg);
}

/* ---------- arranque ---------- */
function initChrome() {
  const vol = $('#vol');
  vol.addEventListener('input', () => AE.setVolume(parseFloat(vol.value)));
  AE.volume = parseFloat(vol.value);
  $('#kill').addEventListener('click', () => AE.stopAll());
  // botón de tema: alterna claro/oscuro y lo recuerda en este navegador
  const tb = $('#theme');
  const label = () => { const d = isDark(); tb.textContent = d ? '☀ Light' : '☾ Dark'; tb.title = d ? 'Light theme (tema claro)' : 'Dark theme (tema oscuro)'; };
  tb.addEventListener('click', () => {
    const t = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch (e) {}
    refreshTheme(); label();
  });
  darkMQ.addEventListener('change', label);
  label();
  // academia: el capítulo actual del menú lo marca curso.js (una página por capítulo)
}
