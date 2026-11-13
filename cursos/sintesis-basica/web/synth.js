'use strict';
/* Capítulo 8: el sintetizador completo (monofónico) que reúne todos los bloques */
(function () {
  const sec = M(8);
  if (!sec) return; // academia: cada capítulo vive en su propia página
  const INIT = {
    w1: 'sawtooth', o1: 0, l1: 0.6, w2: 'sawtooth', o2: 0, det2: 0, l2: 0, lr: 0, ln: 0,
    type: 'lowpass', slope: 24, cut: 2400, res: 0.2, famt: 0,
    fa: 0.005, fd: 0.3, fs: 0.3, fr: 0.3, aa: 0.005, ad: 0.3, as: 0.8, ar: 0.25,
    lshape: 'sine', lrate: 5, lp: 0, lc: 0, la: 0, out: 0.7, oct: 0
  };
  const S = Object.assign({}, INIT);
  const PRESETS = {
    'Init (saw)': {},
    'Pluck bass': { w1: 'sawtooth', o1: -1, w2: 'square', o2: -1, det2: 7, l1: .55, l2: .35, slope: 24, cut: 180, res: .3, famt: 3.5, fa: .002, fd: .25, fs: 0, fr: .2, aa: .002, ad: .4, as: .6, ar: .15 },
    'String pad': { w1: 'sawtooth', w2: 'sawtooth', det2: 9, l1: .4, l2: .4, slope: 12, cut: 900, res: .1, famt: 1.6, fa: .9, fd: 1.2, fs: .6, fr: 1.2, aa: .9, ad: .8, as: .8, ar: 1.4, lshape: 'triangle', lrate: .25, lc: .15 },
    'Organ': { w1: 'sine', w2: 'square', o2: 1, l1: .5, l2: .12, slope: 12, cut: 9000, res: 0, aa: .002, ad: .1, as: 1, ar: .06 },
    'Bell (ring)': { w1: 'sine', w2: 'sine', det2: 650, l1: 0, l2: 0, lr: .8, slope: 12, cut: 9000, res: 0, aa: .002, ad: 3, as: 0, ar: 1.5 },
    'Vibrato lead': { w1: 'sawtooth', w2: 'square', det2: 6, l1: .4, l2: .25, cut: 3500, res: .25, famt: 1.2, fa: .02, fd: .4, fs: .5, aa: .01, ad: .3, as: .9, ar: .2, lshape: 'sine', lrate: 5.5, lp: .1 },
    'Wind (noise)': { l1: 0, ln: .5, type: 'bandpass', slope: 12, cut: 900, res: .6, aa: 1.2, ad: .5, as: .9, ar: 1.5, lshape: 'sine', lrate: .3, lc: .35 }
  };
  const held = [], keyEls = {};
  let curF = 261.6;

  const d = demo(sec, {
    title: 'Subtractive synth (sintetizador sustractivo)',
    text: 'Todos los bloques del curso en una sola voz: <b>2 oscillators + ring modulator + noise → mixer → filter → VCA</b>, con <b>2 envelopes</b> (envolventes) y un <b>LFO</b> que modula pitch, cutoff y amplitude. Elige un preset, toca el <b>keyboard</b> (teclado) en pantalla o las teclas del ordenador, y cambia un parámetro a la vez.',
    viz: [
      { kind: 'scope', label: 'Waveform (forma de onda)', samples: () => 3 * AE.sr / curF, zoom: 2 },
      { kind: 'spectrum', label: 'Spectrum (espectro)', maxHz: 5000, harm: () => curF }
    ],
    build(ctx, out, kit) {
      const o1 = kit.osc(S.w1, 261.6), o2 = kit.osc(S.w2, 261.6);
      const g1 = kit.gain(S.l1), g2 = kit.gain(S.l2), ring = kit.gain(0), gr = kit.gain(S.lr), nz = kit.noise(), gn = kit.gain(S.ln);
      const mix = kit.gain(1), clip = ctx.createWaveShaper(); clip.curve = new Float32Array([-1, 1]);
      const fc = FilterChain(ctx, kit), vca = kit.gain(0), trem = kit.gain(1), master = kit.gain(S.out * 0.35);
      o1.connect(g1); o2.connect(g2); o1.connect(ring); o2.connect(ring.gain); ring.connect(gr); nz.connect(gn);
      [g1, g2, gr, gn].forEach(x => x.connect(mix));
      mix.connect(clip); clip.connect(fc.input); fc.output.connect(vca); vca.connect(trem); trem.connect(master); master.connect(out);
      const cm = kit.cs(0); fc.detunes.forEach(p => cm.connect(p));
      const ea = new Env(ctx, vca.gain, { lo: 0, hi: 1 }), ef = new Env(ctx, cm.offset, { lo: 0, hi: 1 });
      const lfo = kit.osc(S.lshape, S.lrate), lp = kit.gain(0), lc = kit.gain(0), la = kit.gain(0);
      lfo.connect(lp); lp.connect(o1.detune); lp.connect(o2.detune);
      lfo.connect(lc); fc.detunes.forEach(p => lc.connect(p));
      lfo.connect(la); la.connect(trem.gain);
      let midi = 60;
      const pitch = (glide = 0.004) => {
        const f = fHz(midi + 12 * S.oct); curF = f;
        setP(o1.frequency, f * Math.pow(2, S.o1), glide); setP(o2.frequency, f * Math.pow(2, S.o2), glide);
      };
      const sync = () => {
        o1.type = S.w1; o2.type = S.w2; setP(o2.detune, S.det2);
        setP(g1.gain, S.l1); setP(g2.gain, S.l2); setP(gr.gain, S.lr); setP(gn.gain, S.ln);
        fc.apply(S);
        Object.assign(ea, { a: S.aa, d: S.ad, s: S.as, r: S.ar }); Object.assign(ef, { a: S.fa, d: S.fd, s: S.fs, r: S.fr }); ef.hi = 1200 * S.famt;
        ea.touch(); ef.touch();
        lfo.type = S.lshape; setP(lfo.frequency, S.lrate);
        setP(lp.gain, S.lp * 200); setP(lc.gain, S.lc * 3600); setP(la.gain, S.la * 0.5); setP(trem.gain, 1 - S.la * 0.5);
        setP(master.gain, S.out * 0.35);
        pitch();
      };
      sync();
      return {
        sync,
        noteOn(m) { midi = m; pitch(held.length > 1 ? 0.03 : 0.004); ea.on(); ef.on(); },
        noteChange(m) { midi = m; pitch(0.03); },
        noteOff() { ea.off(); ef.off(); }
      };
    }
  });

  /* ---------- controles ---------- */
  const reg = {};
  const sync = () => { d.inst?.sync(); };
  const K = (name, label, o) => { const k = knob(Object.assign({ label, size: 50, cls: 'sm', value: S[name], onInput: v => { S[name] = v; sync(); } }, o)); reg[name] = k; return k; };
  const SG = (name, label, options) => { const s = seg({ label, value: S[name], options, onChange: v => { S[name] = v; sync(); } }); reg[name] = s; return s; };
  const W = [{ v: 'sine', label: 'Sine' }, { v: 'triangle', label: 'Tri' }, { v: 'sawtooth', label: 'Saw' }, { v: 'square', label: 'Sqr' }];
  const OCT = [{ v: -1, label: '−1' }, { v: 0, label: '0' }, { v: 1, label: '+1' }];
  const T = (name, label, v, mn, mx) => K(name, label, { min: mn, max: mx, log: true, value: v, fmt: fmtTime });
  const pct = (name, label) => K(name, label, { min: 0, max: 1, step: 0.01, fmt: fmtPct });
  const row = (...c) => h('div', { class: 'row' }, c);
  const box = (title, ...rows) => h('div', { class: 'sec' }, h('h4', {}, title), rows);

  const grid = h('div', { class: 'panel-grid' },
    box('Oscillator 1', row(SG('w1', 'Onda 1', W)), row(ctl('Octave', SG('o1', 'Octava 1', OCT)), pct('l1', 'Level'))),
    box('Oscillator 2', row(SG('w2', 'Onda 2', W)), row(ctl('Octave', SG('o2', 'Octava 2', OCT)), K('det2', 'Detune', { min: -1200, max: 1200, step: 1, value: 0, fmt: v => v + '¢' }), pct('l2', 'Level'))),
    box('Mixer (more sources)', row(pct('lr', 'Ring 1×2'), pct('ln', 'Noise'))),
    box('Filter', row(SG('type', 'Type', [{ v: 'lowpass', label: 'LP' }, { v: 'highpass', label: 'HP' }, { v: 'bandpass', label: 'BP' }]), SG('slope', 'Slope', [{ v: 12, label: '12' }, { v: 24, label: '24' }])),
      row(K('cut', 'Cutoff', { min: 40, max: 16000, log: true, value: S.cut, fmt: fmtHz }), pct('res', 'Resonance'), K('famt', 'Env→cutoff', { min: 0, max: 6, step: 0.1, fmt: v => v.toFixed(1) + ' oct' }))),
    box('Filter envelope (ENV 2)', row(T('fa', 'Attack', S.fa, 0.001, 5), T('fd', 'Decay', S.fd, 0.005, 5), pct('fs', 'Sustain'), T('fr', 'Release', S.fr, 0.005, 6))),
    box('Amp envelope (ENV 1)', row(T('aa', 'Attack', S.aa, 0.001, 5), T('ad', 'Decay', S.ad, 0.005, 5), pct('as', 'Sustain'), T('ar', 'Release', S.ar, 0.005, 6))),
    box('LFO', row(SG('lshape', 'Wave', [{ v: 'sine', label: 'Sine' }, { v: 'triangle', label: 'Tri' }, { v: 'sawtooth', label: 'Saw' }, { v: 'square', label: 'Sqr' }])),
      row(K('lrate', 'Rate', { min: 0.1, max: 20, log: true, fmt: v => v.toFixed(2) + ' Hz' }), pct('lp', '→ Pitch'), pct('lc', '→ Cutoff'), pct('la', '→ Amp'))),
    box('Output', row(pct('out', 'Volume')))
  );

  const presetRow = chips(Object.keys(PRESETS).map(n => ({
    label: n, fn: () => {
      const p = Object.assign({}, INIT, PRESETS[n]);
      for (const k in p) { if (k === 'oct') continue; if (reg[k]) reg[k].set(p[k]); }
      if (!d.playing) d.start();
    }
  })));

  /* ---------- teclado ---------- */
  const LO = 48, HI = 76, whites = [];
  for (let m = LO; m <= HI; m++) if (![1, 3, 6, 8, 10].includes(m % 12)) whites.push(m);
  const ww = 100 / whites.length;
  const piano = h('div', { class: 'piano', role: 'group', 'aria-label': 'Teclado' });
  let wi = 0;
  for (let m = LO; m <= HI; m++) {
    const black = [1, 3, 6, 8, 10].includes(m % 12);
    let el;
    if (black) el = h('div', { class: 'bk', style: `left:${wi * ww - ww * 0.3}%;width:${ww * 0.6}%` });
    else { el = h('div', { class: 'wk', style: `left:${wi * ww}%;width:${ww}%` }, m % 12 === 0 ? h('span', { class: 'lab' }, 'C' + (Math.floor(m / 12) - 1)) : null); wi++; }
    keyEls[m] = el;
    el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); press(m); });
    const up = () => release(m);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    piano.append(el);
  }
  function press(m) {
    if (!d.playing) d.start();
    if (held.includes(m)) return;
    held.push(m); keyEls[m]?.classList.add('down');
    d.inst.noteOn(m + 12 * S.oct); status(m);
  }
  function release(m) {
    const i = held.indexOf(m); if (i < 0) return;
    held.splice(i, 1); keyEls[m]?.classList.remove('down');
    if (!d.playing) return;
    if (held.length) { const l = held[held.length - 1]; d.inst.noteChange(l + 12 * S.oct); status(l); } else { d.inst.noteOff(); status(null); }
  }
  function status(m) {
    d.setReadout(m == null ? 'Monophonic voice (voz monofónica): manda la última tecla. Teclas del ordenador: <b>A W S E D F T G Y H U J K O L P ;</b>'
      : `Note <b>${noteName(fHz(m + 12 * S.oct))}</b> · ${fmtHz(fHz(m + 12 * S.oct))}`);
  }
  d.stopHooks.push(() => { [...held].forEach(m => keyEls[m]?.classList.remove('down')); held.length = 0; status(null); });
  const KEYS = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k', 'o', 'l', 'p', ';'];
  window.addEventListener('keydown', e => {
    if (!d.playing || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(input|textarea|select)$/i.test(e.target.tagName)) return;
    const i = KEYS.indexOf(e.key.toLowerCase()); if (i < 0) return;
    e.preventDefault(); press(60 + i);
  });
  window.addEventListener('keyup', e => { const i = KEYS.indexOf(e.key.toLowerCase()); if (i >= 0) release(60 + i); });

  const octSeg = seg({ label: 'Transpose', value: 0, options: [{ v: -1, label: '−1 oct' }, { v: 0, label: '0' }, { v: 1, label: '+1 oct' }], onChange: v => { S.oct = v; } });
  d.controls.append(ctl('Presets', presetRow), ctl('Keyboard transpose', octSeg));
  d.extra.append(grid, piano);
  status(null);
})();
