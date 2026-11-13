'use strict';
/* Capítulos 5–7: filtro, envolventes y amplificador, LFOs */

/* =====================================================================
   5. EL FILTRO
   ===================================================================== */
(function () {
  const sec = M(5);
  if (!sec) return; // academia: cada capítulo vive en su propia página
  const S = { src: 'sawtooth', type: 'lowpass', cut: 1200, res: 0.2, slope: 12, note: 110 };
  const TN = { lowpass: 'low-pass (pasa bajos)', highpass: 'high-pass (pasa altos)', bandpass: 'band-pass (pasa banda)' };
  let sweepId = 0;
  const d = demo(sec, {
    title: 'Filter type, cutoff, slope y resonance',
    text: 'Gira el <b>cutoff</b> (frecuencia de corte) con el sonido en marcha: es el parámetro que más vas a mover. La línea gruesa es la <b>frequency response</b> (respuesta en frecuencia) del filter; lo sombreado es el spectrum que sale de él. Sube la <b>resonance</b> (resonancia) para formar un pico, y cambia el <b>slope</b> (pendiente) para ver qué tan marcado es el corte.',
    viz: [{
      kind: 'custom', always: true, label: 'Frequency response (línea) sobre el spectrum de salida (sombreado)', draw(g, w, hh, dd) {
        grid(g, w, hh, 8, 6);
        const lo = 20, hi = 20000, xf = f => Math.log(f / lo) / Math.log(hi / lo) * w;
        for (const t of [50, 100, 200, 500, 1000, 2000, 5000, 10000]) txt(g, t >= 1000 ? t / 1000 + 'k' : t, xf(t), hh - 3 * g.dpr, COL.dim, 'center');
        if (dd.playing && dd.an) {
          const arr = dd._sb || (dd._sb = new Float32Array(dd.an.frequencyBinCount)); dd.an.getFloatFrequencyData(arr);
          const bz = AE.sr / dd.an.fftSize; g.fillStyle = COL.fill; g.beginPath(); g.moveTo(0, hh);
          for (let x = 0; x < w; x += 2) {
            const a = Math.floor(lo * Math.pow(hi / lo, x / w) / bz), b = Math.max(a, Math.floor(lo * Math.pow(hi / lo, (x + 2) / w) / bz));
            let m = -140; for (let i = a; i <= b && i < arr.length; i++) m = Math.max(m, arr[i]);
            g.lineTo(x, hh * (1 - clamp((m + 100) / 90, 0, 1)));
          }
          g.lineTo(w, hh); g.fill();
        }
        // línea 0 dB y cutoff
        const y = db => (hh - 16 * g.dpr) * (1 - (db + 60) / 90) + 4 * g.dpr;
        g.strokeStyle = COL.dim; g.setLineDash([3 * g.dpr, 4 * g.dpr]); g.beginPath(); g.moveTo(0, y(0)); g.lineTo(w, y(0)); g.stroke();
        g.strokeStyle = COL.blue; g.beginPath(); g.moveTo(xf(S.cut), 0); g.lineTo(xf(S.cut), hh); g.stroke(); g.setLineDash([]);
        txt(g, '0 dB', 4 * g.dpr, y(0) - 3 * g.dpr); txt(g, 'cutoff', xf(S.cut) + 4 * g.dpr, 12 * g.dpr, COL.blue);
        g.strokeStyle = COL.trace; g.lineWidth = 2.5 * g.dpr; g.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const f = lo * Math.pow(hi / lo, x / w), db = clamp(filterMagDb(S.type, S.cut, S.res, S.slope, f), -60, 30);
          x ? g.lineTo(x, y(db)) : g.moveTo(x, y(db));
        }
        g.stroke();
      }
    }, { kind: 'scope', label: 'Waveform de salida', samples: () => 3 * AE.sr / S.note, zoom: 2.5 }],
    build(ctx, out, kit) {
      const mk = (type, g) => { const o = type === 'noise' ? kit.noise() : kit.osc(type, S.note), gg = kit.gain(g); o.connect(gg); return { o, gg }; };
      const A = mk('sawtooth', 0.28), B = mk('square', 0.22), C = mk('noise', 0.3);
      const mix = kit.gain(1); [A, B, C].forEach(s => s.gg.connect(mix));
      const fc = FilterChain(ctx, kit), comp = kit.gain(1), selfo = kit.osc('sine', S.cut), sg = kit.gain(0);
      mix.connect(fc.input); fc.output.connect(comp); selfo.connect(sg); sg.connect(comp); comp.connect(out);
      const apply = () => {
        setP(A.gg.gain, S.src === 'sawtooth' ? 0.28 : 0); setP(B.gg.gain, S.src === 'square' ? 0.22 : 0); setP(C.gg.gain, S.src === 'noise' ? 0.3 : 0);
        if (S.src !== 'noise') { setP(A.o.frequency, S.note); setP(B.o.frequency, S.note); }
        fc.apply(S);
        setP(comp.gain, 1 / (1 + 4 * S.res * S.res));
        setP(selfo.frequency, Math.min(S.cut, AE.sr * 0.45));
        setP(sg.gain, S.type === 'highpass' ? 0 : clamp((S.res - 0.9) / 0.1, 0, 1) * 0.2);
      };
      apply();
      return { apply };
    }
  });
  const info = () => {
    let msg = `<b>${TN[S.type]}</b> · cutoff <b>${fmtHz(S.cut)}</b> · ${S.slope} dB/oct · resonance ${fmtPct(S.res)}`;
    if (S.type !== 'bandpass') {
      const o1 = S.type === 'lowpass' ? 2 : 0.5, o2 = S.type === 'lowpass' ? 4 : 0.25;
      const a = filterMagDb(S.type, S.cut, 0, S.slope, S.cut * o1) , b = filterMagDb(S.type, S.cut, 0, S.slope, S.cut * o2);
      msg += `<br>A ${o1}× el cutoff atenúa ≈ <b>${Math.abs(a).toFixed(0)} dB</b>; a ${o2}× ≈ <b>${Math.abs(b).toFixed(0)} dB</b> (cada pole, polo, aporta 6 dB/oct).`;
    }
    if (S.res > 0.9 && S.type !== 'highpass') msg += '<br><b>Self-oscillation</b> (auto-oscilación, emulada): se oye un sine en el cutoff.';
    d.setReadout(msg);
  };
  const up = () => { d.inst?.apply(); info(); d.redraw(); };
  const kc = knob({ label: 'Cutoff', min: 40, max: 16000, value: 1200, log: true, size: 72, fmt: fmtHz, onInput: v => { S.cut = v; up(); } });
  const kr = knob({ label: 'Resonance', min: 0, max: 1, value: 0.2, step: 0.01, size: 64, fmt: fmtPct, onInput: v => { S.res = v; up(); } });
  const kn = knob({ label: 'Note', min: 55, max: 440, value: 110, log: true, size: 52, fmt: fmtHz, onInput: v => { S.note = v; up(); } });
  const sr = seg({ label: 'Source', value: 'sawtooth', options: [{ v: 'sawtooth', label: 'Saw' }, { v: 'square', label: 'Square' }, { v: 'noise', label: 'Noise' }], onChange: v => { S.src = v; up(); } });
  const st = seg({ label: 'Type', value: 'lowpass', options: [{ v: 'lowpass', label: 'Low-pass' }, { v: 'highpass', label: 'High-pass' }, { v: 'bandpass', label: 'Band-pass' }], onChange: v => { S.type = v; up(); } });
  const ss = seg({ label: 'Slope', value: 12, options: [{ v: 12, label: '12 dB/oct' }, { v: 24, label: '24 dB/oct' }], onChange: v => { S.slope = v; up(); } });
  const sw = toggle({
    label: 'Cutoff sweep (barrido)', onChange: on => {
      clearInterval(sweepId);
      if (on) { if (!d.playing) d.start(); let ph = 0; sweepId = setInterval(() => { ph += 0.04 / 7; kc.set(100 * Math.pow(80, 0.5 - 0.5 * Math.cos(2 * Math.PI * ph))); }, 40); }
    }
  });
  d.stopHooks.push(() => { clearInterval(sweepId); sw.set(false, true); });
  d.controls.append(ctl('Source', sr), ctl('Type', st), ctl('Slope', ss), kc, kr, kn, ctl('Auto', sw));
  info();
})();

/* =====================================================================
   6. ENVOLVENTES Y AMPLIFICADOR
   ===================================================================== */
(function () {
  const sec = M(6);
  if (!sec) return; // academia: cada capítulo vive en su propia página
  const lg = (label, v, mn, mx) => ({ label, min: mn, max: mx, value: v, log: true, fmt: fmtTime, size: 56 });

  /* ---- 6a ADSR en el amplificador ---- */
  {
    const E = { a: 0.005, d: 0.3, s: 0.7, r: 0.25 };
    const d = demo(sec, {
      title: 'ADSR envelope (envolvente) en el VCA',
      text: 'Mantén presionado el <b>gate</b> (tecla) y suéltalo. <b>Attack</b> (ataque), <b>decay</b> (caída) y <b>release</b> (liberación) son tiempos; <b>sustain</b> (sostenido) es un nivel. Subir el sustain no alarga la nota: la mantiene más fuerte mientras sigas presionando. Para alargar la cola, sube el release.',
      viz: [
        {
          kind: 'custom', always: true, label: 'Envelope shape (forma de la envolvente), gate sostenido', draw(g, w, hh) {
            grid(g, w, hh, 8, 4);
            const hold = Math.max(0.3, (E.a + E.d) * 0.6), T = E.a + E.d + hold + E.r, X = t => 6 * g.dpr + t / T * (w - 12 * g.dpr), Y = l => hh - 22 * g.dpr - l * (hh - 38 * g.dpr);
            const pts = [[0, 0], [E.a, 1], [E.a + E.d, E.s], [E.a + E.d + hold, E.s], [T, 0]];
            g.fillStyle = COL.fill; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.lineTo(X(T), Y(0)); g.fill();
            g.strokeStyle = COL.trace; g.lineWidth = 2.5 * g.dpr; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.stroke();
            const lab = (t0, t1, s, c) => txt(g, s, (X(t0) + X(t1)) / 2, hh - 6 * g.dpr, c, 'center', 11);
            lab(0, E.a, 'A', COL.text); lab(E.a, E.a + E.d, 'D', COL.text); lab(E.a + E.d, E.a + E.d + hold, 'S', COL.text); lab(E.a + E.d + hold, T, 'R', COL.text);
            g.strokeStyle = COL.dim; g.setLineDash([3 * g.dpr, 3 * g.dpr]); g.beginPath(); const xk = X(E.a + E.d + hold); g.moveTo(xk, 8 * g.dpr); g.lineTo(xk, hh - 18 * g.dpr); g.stroke(); g.setLineDash([]);
            txt(g, 'gate off', xk + 4 * g.dpr, 14 * g.dpr, COL.dim);
          }
        },
        {
          kind: 'custom', label: 'Tu envelope en vivo (últimos 8 s)', draw(g, w, hh, dd) {
            const H = dd.s.hist || (dd.s.hist = []), env = dd.s.env;
            if (env) pushHist(H, AE.now, env.at(), env.gate, 8);
            drawHistory(g, w, hh, H, { secs: 8, gate: true });
          }
        },
        { kind: 'scope', label: 'Waveform (forma de onda)', samples: () => 3 * AE.sr / 220, zoom: 2.2 }
      ],
      build(ctx, out, kit, dd) {
        const o = kit.osc('sawtooth', 220), lp = kit.biq('lowpass', 2800, -3), vca = kit.gain(0), g = kit.gain(0.45);
        o.connect(lp); lp.connect(vca); vca.connect(g); g.connect(out);
        const env = new Env(ctx, vca.gain, { lo: 0, hi: 1 }); Object.assign(env, E); dd.s.env = env; dd.s.hist = [];
        return { env, on: () => env.on(), off: () => env.off(), sync: () => { Object.assign(env, E); env.touch(); } };
      }
    });
    const up = () => { d.inst?.sync(); d.redraw(); info(); };
    const info = () => d.setReadout(`A <b>${fmtTime(E.a)}</b> · D <b>${fmtTime(E.d)}</b> · S <b>${fmtPct(E.s)}</b> · R <b>${fmtTime(E.r)}</b>`);
    const ka = knob({ ...lg('Attack', E.a, 0.001, 5), onInput: v => { E.a = v; up(); } });
    const kd = knob({ ...lg('Decay', E.d, 0.005, 5), onInput: v => { E.d = v; up(); } });
    const ks = knob({ label: 'Sustain', min: 0, max: 1, value: E.s, step: 0.01, size: 56, fmt: fmtPct, onInput: v => { E.s = v; up(); } });
    const kr = knob({ ...lg('Release', E.r, 0.005, 6), onInput: v => { E.r = v; up(); } });
    const P = (a, dd, s, r) => () => { ka.set(a); kd.set(dd); ks.set(s); kr.set(r); };
    d.controls.append(ka, kd, ks, kr,
      ctl('Presets (perfiles de la guía)', chips([
        { label: 'Organ', fn: P(0.002, 0.1, 1, 0.06) }, { label: 'Piano', fn: P(0.002, 2.5, 0, 0.5) },
        { label: 'Strings', fn: P(0.9, 0.8, 0.8, 1.4) }, { label: 'Pluck', fn: P(0.002, 0.18, 0, 0.12) }])));
    d.extra.append(gateControls(d, () => d.inst?.on(), () => d.inst?.off(), { hold: 900, period: 2400 }));
    info();
  }

  /* ---- 6b Envolvente en el filtro ---- */
  {
    const F = { a: 0.002, d: 0.28, s: 0.05, r: 0.25, amt: 4, base: 180 };
    const d = demo(sec, {
      title: 'Filter envelope (envolvente del filtro): el sonido pluck',
      text: 'Aquí la <b>envelope 1</b> está en el VCA (fija) y la <b>envelope 2</b> abre y cierra el filter. Con attack 0, decay corto y sustain bajo, el brillo aparece al inicio de cada nota y se apaga enseguida. Compara activando y desactivando la filter envelope.',
      viz: [
        {
          kind: 'custom', label: 'Cutoff en vivo (octaves sobre la base)', draw(g, w, hh, dd) {
            const H = dd.s.hist || (dd.s.hist = []), env = dd.s.env;
            if (env) pushHist(H, AE.now, dd.s.on ? env.at() * F.amt : 0, env.gate, 6);
            drawHistory(g, w, hh, H, { secs: 6, lo: 0, hi: 6, gate: true });
          }
        },
        { kind: 'scope', label: 'Waveform (forma de onda)', samples: () => 3 * AE.sr / 110, zoom: 2.2 },
        { kind: 'spectrum', label: 'Spectrum (observa cómo se apaga el brillo)', maxHz: 6000, harm: () => 110 }
      ],
      build(ctx, out, kit, dd) {
        const o = kit.osc('sawtooth', 110), lp = kit.biq('lowpass', F.base, 6), vca = kit.gain(0), g = kit.gain(0.3);
        o.connect(lp); lp.connect(vca); vca.connect(g); g.connect(out);
        const ea = new Env(ctx, vca.gain, { lo: 0, hi: 1 }); Object.assign(ea, { a: 0.003, d: 0.1, s: 0.9, r: 0.35 });
        const ef = new Env(ctx, lp.detune, { lo: 0, hi: 1200 * F.amt }); Object.assign(ef, F);
        dd.s.env = ef; dd.s.hist = [];
        return {
          on: () => { ea.on(); if (dd.s.on) ef.on(); }, off: () => { ea.off(); ef.off(); },
          sync: () => { Object.assign(ef, F); ef.hi = 1200 * F.amt; ef.touch(); setP(lp.frequency, F.base); },
          enable: v => { dd.s.on = v; if (!v) { lp.detune.cancelScheduledValues(ctx.currentTime); setP(lp.detune, 0, 0.02); } }
        };
      }
    });
    d.s.on = true;
    const up = () => { d.inst?.sync(); d.redraw(); info(); };
    const info = () => d.setReadout(`Cutoff base <b>${fmtHz(F.base)}</b> + <b>${F.amt.toFixed(1)} octaves</b> de envelope → pico ≈ <b>${fmtHz(F.base * Math.pow(2, F.amt))}</b>`);
    const tg = toggle({ label: 'Filter envelope', value: true, onChange: v => { d.inst?.enable(v); d.s.on = v; } });
    const kb = knob({ label: 'Base cutoff', min: 60, max: 3000, value: 180, log: true, fmt: fmtHz, onInput: v => { F.base = v; up(); } });
    const km = knob({ label: 'Amount', min: 0, max: 6, value: 4, step: 0.1, fmt: v => v.toFixed(1) + ' oct', onInput: v => { F.amt = v; up(); } });
    const ka = knob({ ...lg('Attack', F.a, 0.001, 3), onInput: v => { F.a = v; up(); } });
    const kd = knob({ ...lg('Decay', F.d, 0.005, 3), onInput: v => { F.d = v; up(); } });
    const ks = knob({ label: 'Sustain', min: 0, max: 1, value: F.s, step: 0.01, size: 56, fmt: fmtPct, onInput: v => { F.s = v; up(); } });
    const kr = knob({ ...lg('Release', F.r, 0.005, 4), onInput: v => { F.r = v; up(); } });
    d.controls.append(ctl('Compare', tg), kb, km, ka, kd, ks, kr);
    d.extra.append(gateControls(d, () => d.inst?.on(), () => d.inst?.off(), { hold: 800, period: 1500 }));
    info();
  }
})();

/* =====================================================================
   7. LFOs
   ===================================================================== */
(function () {
  const sec = M(7);
  if (!sec) return; // academia: cada capítulo vive en su propia página
  const S = { dest: 'pitch', shape: 'sine', rate: 5.5, depth: 0.12, note: 220, fade: false };
  const SCALE = { pitch: 200, cutoff: 3600, amp: 0.5, pwm: 0.9 };
  const DN = { pitch: 'pitch', cutoff: 'cutoff', amp: 'amplitude', pwm: 'pulse width' };
  const d = demo(sec, {
    title: 'LFO: modulación con un oscillator lento',
    text: 'El <b>LFO</b> (low frequency oscillator, oscilador de baja frecuencia) no se oye como pitch: <b>mueve otro parámetro</b>. El efecto depende del <b>destination</b> (destino): pitch → <b>vibrato</b> (o <b>trill</b>, trino, con square), cutoff → <b>wah</b>, amplitude → <b>tremolo</b> (trémolo), pulse width → <b>PWM</b>. Prueba los presets de la tabla de la guía y luego cambia lo que quieras.',
    viz: [
      {
        kind: 'custom', label: 'LFO output (salida, últimos 6 s)', draw(g, w, hh, dd) {
          const H = dd.s.hist || (dd.s.hist = []), an = dd.s.lfoAn;
          if (an) { const b = dd.s.lb || (dd.s.lb = new Float32Array(an.fftSize)); an.getFloatTimeDomainData(b); pushHist(H, AE.now, b[b.length - 1], false, 6); }
          drawHistory(g, w, hh, H, { secs: 6, lo: -1.1, hi: 1.1, zeroLine: true, label: '→ ' + DN[S.dest] });
        }
      },
      { kind: 'scope', label: 'Waveform del sonido', samples: () => 3 * AE.sr / S.note, zoom: 2.2 },
      { kind: 'spectrum', label: 'Spectrum (espectro)', maxHz: 4000, harm: () => S.note }
    ],
    build(ctx, out, kit, dd) {
      const lfoOut = kit.gain(1), depthG = kit.gain(0), lfoAn = ctx.createAnalyser(); lfoAn.fftSize = 256; dd.s.lfoAn = lfoAn; dd.s.hist = [];
      lfoOut.connect(lfoAn); lfoOut.connect(depthG);
      let src = null;
      const mkLfo = () => {
        if (src) { try { src.stop(); } catch (e) { } src.disconnect(); }
        if (S.shape === 'sh') { src = ctx.createConstantSource(); src.start(); } else { src = ctx.createOscillator(); src.type = S.shape; src.frequency.value = S.rate; src.start(); }
        src.connect(lfoOut);
      };
      mkLfo();
      kit.onStop(() => { try { src.stop(); } catch (e) { } });
      kit.loop(() => { if (S.shape === 'sh' && src.offset) src.offset.setValueAtTime(Math.random() * 2 - 1, ctx.currentTime); return 1000 / S.rate; });
      const trem = kit.gain(1), fin = kit.gain(0.28);
      let pulse = null, osc = null, lp = null;
      if (S.dest === 'pwm') {
        pulse = makePulse(ctx, kit, S.note); pulse.setDuty(0.5); pulse.out.connect(fin); depthG.connect(pulse.cs.offset);
      } else {
        osc = kit.osc('sawtooth', S.note);
        if (S.dest === 'cutoff') { lp = kit.biq('lowpass', 800, 8); osc.connect(lp); lp.connect(fin); depthG.connect(lp.detune); }
        else if (S.dest === 'amp') { osc.connect(trem); trem.connect(fin); trem.gain.value = 1 - S.depth * SCALE.amp; depthG.connect(trem.gain); }
        else { osc.connect(fin); depthG.connect(osc.detune); }
      }
      fin.connect(out);
      const target = () => S.depth * SCALE[S.dest] * (S.dest === 'pwm' ? 2 : 1);
      const setDepth = (ramp) => {
        const t = ctx.currentTime; depthG.gain.cancelScheduledValues(t);
        if (ramp) { depthG.gain.setValueAtTime(0, t); depthG.gain.linearRampToValueAtTime(target(), t + 2.5); } else setP(depthG.gain, target(), 0.02);
        if (S.dest === 'amp') setP(trem.gain, 1 - S.depth * SCALE.amp, 0.02);
      };
      setDepth(S.fade);
      return {
        setShape: mkLfo,
        setRate: () => { if (src.frequency) setP(src.frequency, S.rate); },
        setDepth: () => setDepth(false),
        setNote: () => { osc ? setP(osc.frequency, S.note) : pulse.setFreq(S.note); },
        retrig: () => setDepth(S.fade)
      };
    }
  });
  const restart = () => { if (d.playing) { d.stop(); setTimeout(() => d.start(), 180); } };
  const info = () => d.setReadout(`LFO <b>${S.shape === 'sh' ? 'random (S&H)' : { sine: 'sine', triangle: 'triangle', sawtooth: 'saw', square: 'square' }[S.shape]}</b> a <b>${S.rate.toFixed(2)} Hz</b> → <b>${DN[S.dest]}</b> · depth ${fmtPct(S.depth)}`);
  const kr = knob({ label: 'Rate', min: 0.1, max: 20, value: 5.5, log: true, size: 64, fmt: v => v.toFixed(2) + ' Hz', onInput: v => { S.rate = v; d.inst?.setRate(); info(); } });
  const kp = knob({ label: 'Depth', min: 0, max: 1, value: 0.12, step: 0.01, size: 64, fmt: fmtPct, onInput: v => { S.depth = v; d.inst?.setDepth(); info(); } });
  const kn = knob({ label: 'Note', min: 110, max: 440, value: 220, log: true, size: 52, fmt: fmtHz, onInput: v => { S.note = v; d.inst?.setNote(); d.redraw(); } });
  const sd = seg({ label: 'Destination', value: 'pitch', options: [{ v: 'pitch', label: 'Pitch' }, { v: 'cutoff', label: 'Cutoff' }, { v: 'amp', label: 'Amp' }, { v: 'pwm', label: 'Pulse width' }], onChange: v => { S.dest = v; info(); restart(); } });
  const ss = seg({ label: 'Wave', value: 'sine', options: [{ v: 'sine', label: 'Sine' }, { v: 'triangle', label: 'Tri' }, { v: 'sawtooth', label: 'Saw' }, { v: 'square', label: 'Square' }, { v: 'sh', label: 'S&H' }], onChange: v => { S.shape = v; d.inst?.setShape(); info(); } });
  const tf = toggle({ label: 'Delayed depth (aparece de a poco)', onChange: v => { S.fade = v; d.inst?.retrig(); } });
  const P = (dest, shape, rate, depth) => () => { sd.set(dest, true); S.dest = dest; ss.set(shape, true); S.shape = shape; kr.set(rate, true); S.rate = rate; kp.set(depth, true); S.depth = depth; info(); if (d.playing) restart(); else d.start(); };
  d.controls.append(ctl('Destination', sd), ctl('Wave', ss), kr, kp, kn);
  d.extra.append(h('div', { style: 'display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px' },
    ctl('Presets (tabla de la guía)', chips([
      { label: 'Vibrato', fn: P('pitch', 'sine', 5.5, 0.12) }, { label: 'Trill', fn: P('pitch', 'square', 6, 0.35) },
      { label: 'Wah-wah', fn: P('cutoff', 'triangle', 0.8, 0.5) }, { label: 'Tremolo', fn: P('amp', 'sine', 5, 0.9) },
      { label: 'PWM', fn: P('pwm', 'triangle', 0.4, 0.45) }])),
    ctl('Envelope + LFO', h('div', { class: 'gate' }, tf, h('button', { type: 'button', class: 'chip', onclick: () => d.inst?.retrig() }, '↻ New note')))));
  info();
})();
