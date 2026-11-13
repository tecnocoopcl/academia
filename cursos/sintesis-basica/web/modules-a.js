'use strict';
/* Capítulos 1–4: sonido, arquitectura, osciladores, ring modulation y mixer */
const M = n => $('#m' + n + ' .demos');

/* =====================================================================
   1. EL SONIDO
   ===================================================================== */
(function () {
  const sec = M(1);
  if (!sec) return; // academia: cada capítulo vive en su propia página

  /* ---- 1a Altura ---- */
  {
    let f = 220, sweepId = 0;
    const d = demo(sec, {
      title: 'Pitch (altura) = frequency (frecuencia)',
      text: 'Gira el <b>knob</b> (perilla) y observa el <b>scope</b> (osciloscopio): más ciclos en la misma ventana de tiempo es una nota más aguda. Los botones de <b>octave</b> (octava) duplican o dividen la <b>frequency</b>; los de <b>semitone</b> (semitono) la multiplican por 2<sup>1/12</sup> ≈ 1,0595.',
      viz: [
        { kind: 'scope', label: 'Waveform (forma de onda) · 3 ciclos', samples: () => 3 * AE.sr / f },
        { kind: 'spectrum', label: 'Spectrum (espectro): un solo pico, la fundamental', maxHz: 2500, harm: () => f }
      ],
      build(ctx, out, kit) {
        const o = kit.osc('sine', f), g = kit.gain(0.35);
        o.connect(g); g.connect(out);
        return { setF: v => setP(o.frequency, v) };
      }
    });
    const info = () => d.setReadout(`<b>${f < 100 ? f.toFixed(1) : f.toFixed(0)} Hz</b> · note ${noteName(f)} · MIDI ${midiOf(f).toFixed(1)}`);
    const k = knob({
      label: 'Frequency', min: 27.5, max: 3520, value: 220, log: true, size: 72, fmt: fmtHz,
      onInput: v => { f = v; d.inst?.setF(v); info(); d.redraw(); }
    });
    const mul = r => () => k.set(clamp(f * r, 27.5, 3520));
    const sw = toggle({
      label: 'Sweep (barrido)', onChange: on => {
        clearInterval(sweepId);
        if (on) { if (!d.playing) d.start(); let ph = 0; sweepId = setInterval(() => { ph += 0.04 / 8; k.set(110 * Math.pow(2, 4 * (0.5 - 0.5 * Math.cos(2 * Math.PI * ph)))); }, 40); }
      }
    });
    d.stopHooks.push(() => { clearInterval(sweepId); sw.set(false, true); });
    d.controls.append(ctl('', k),
      ctl('Steps (saltos)', chips([
        { label: '− octave', fn: mul(0.5) }, { label: '− semitone', fn: mul(Math.pow(2, -1 / 12)) },
        { label: '+ semitone', fn: mul(Math.pow(2, 1 / 12)) }, { label: '+ octave', fn: mul(2) }])),
      ctl('Escala logarítmica', sw));
    info();
  }

  /* ---- 1b Volumen ---- */
  {
    let db = -12, tri = 0;
    const amp = () => Math.pow(10, db / 20);
    const d = demo(sec, {
      title: 'Loudness (volumen) = amplitude (amplitud)',
      text: 'La misma nota, con distinta <b>amplitude</b> (amplitud). Mira cómo la onda en el <b>scope</b> se hace más alta o más baja mientras el <b>pitch</b> (altura) no cambia. Duplicar la amplitude suma 6 dB; reducirla a la mitad, resta 6 dB.',
      viz: [{ kind: 'scope', label: 'Waveform (forma de onda) · borde = 0 dB', samples: () => 3 * AE.sr / 220, zoom: 2, ref: 1, levels: [0.5, 0.25] }],
      build(ctx, out, kit) {
        const o = kit.osc('sine', 220), g = kit.gain(amp() * 0.5);
        o.connect(g); g.connect(out);
        return { setA: () => setP(g.gain, amp() * 0.5) };
      }
    });
    const info = () => d.setReadout(`<b>${db.toFixed(1)} dB</b> → amplitude lineal ×${amp().toFixed(3)} <span style="opacity:.7">(${db <= -59.5 ? 'silencio' : 'cada −6 dB la amplitude se reduce a la mitad'})</span>`);
    const k = knob({
      label: 'Level', min: -60, max: 0, value: -12, step: 0.5, size: 72, fmt: v => v.toFixed(1) + ' dB',
      onInput: v => { db = v; d.inst?.setA(); info(); d.redraw(); }
    });
    const sw = toggle({
      label: 'Auto sweep', onChange: on => {
        clearInterval(tri);
        if (on) { if (!d.playing) d.start(); let ph = 0; tri = setInterval(() => { ph += 0.04 / 8; k.set(-54 + 51 * (0.5 - 0.5 * Math.cos(2 * Math.PI * ph))); }, 40); }
      }
    });
    d.stopHooks.push(() => { clearInterval(tri); sw.set(false, true); });
    d.controls.append(ctl('', k),
      ctl('Steps (saltos)', chips([{ label: '− 6 dB (mitad)', fn: () => k.set(db - 6) }, { label: '+ 6 dB (doble)', fn: () => k.set(db + 6) }])),
      ctl('Auto', sw));
    info();
  }

  /* ---- 1c Timbre ---- */
  {
    const N = 8;
    let f = 220, amps = [1, 0, 0, 0, 0, 0, 0, 0], pending = false;
    const mkWave = ctx => {
      const imag = new Float32Array(N + 1); amps.forEach((a, i) => imag[i + 1] = a);
      return ctx.createPeriodicWave(new Float32Array(N + 1), imag);
    };
    const d = demo(sec, {
      title: 'Timbre = spectrum (espectro)',
      text: 'Una nota es la suma de la <b>fundamental</b> y sus <b>harmonics</b> (armónicos), múltiplos enteros de ella. Sube y baja cada harmonic: el <b>pitch</b> (altura) se mantiene, pero el <b>timbre</b> cambia. Los presets muestran las amplitudes de las <b>waveforms</b> (formas de onda) clásicas.',
      viz: [
        {
          kind: 'custom', always: true, label: 'Partials (componentes, finos) y su suma (grueso)', draw(g, w, hh) {
            grid(g, w, hh, 8, 4);
            const sum = amps.reduce((a, b) => a + b, 0), mid = hh / 2, norm = Math.max(sum, 0.001);
            const cols = Array(8).fill(COL.mid || COL.text);
            g.lineWidth = 1.2 * g.dpr;
            amps.forEach((a, i) => {
              if (a < 0.01) return;
              g.strokeStyle = cols[i]; g.globalAlpha = 0.55; g.beginPath();
              for (let x = 0; x <= w; x += 3) { const y = mid - a * Math.sin(2 * Math.PI * (i + 1) * 2 * x / w) / norm * (mid - 6); x ? g.lineTo(x, y) : g.moveTo(x, y); }
              g.stroke();
            });
            g.globalAlpha = 1; g.strokeStyle = COL.trace; g.lineWidth = 2.5 * g.dpr; g.beginPath();
            for (let x = 0; x <= w; x += 2) {
              let s = 0; amps.forEach((a, i) => s += a * Math.sin(2 * Math.PI * (i + 1) * 2 * x / w));
              const y = mid - s / norm * (mid - 6); x ? g.lineTo(x, y) : g.moveTo(x, y);
            }
            g.stroke();
          }
        },
        { kind: 'scope', label: 'Scope (osciloscopio): lo que suena', samples: () => 3 * AE.sr / f },
        { kind: 'spectrum', label: 'Spectrum (espectro)', maxHz: 2200, harm: () => f }
      ],
      build(ctx, out, kit) {
        const o = kit.osc('sine', f), g = kit.gain(0.3); o.setPeriodicWave(mkWave(ctx));
        o.connect(g); g.connect(out);
        return {
          setF: v => setP(o.frequency, v),
          setWave: () => { const s = amps.reduce((a, b) => a + b, 0); setP(g.gain, s < 0.01 ? 0 : 0.3); if (s >= 0.01) o.setPeriodicWave(mkWave(ctx)); }
        };
      }
    });
    const upd = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; d.inst?.setWave(); d.redraw(); }); };
    const faders = amps.map((a, i) => fader({ label: String(i + 1), value: a, onInput: v => { amps[i] = v; upd(); info(); } }));
    const preset = fn => () => { faders.forEach((fd, i) => { const v = fn(i + 1); amps[i] = v; fd.set(v, true); }); upd(); info(); };
    const info = () => d.setReadout(`Fundamental <b>${f} Hz</b> · harmonics activos: ${amps.map((a, i) => a > 0.02 ? (i + 1) : null).filter(Boolean).join(', ') || '—'}`);
    const k = knob({ label: 'Fundamental', min: 110, max: 440, value: 220, log: true, fmt: fmtHz, onInput: v => { f = v; d.inst?.setF(v); info(); } });
    d.controls.append(ctl('', k),
      ctl('Harmonic level (nivel de cada armónico)', h('div', { style: 'display:flex;gap:4px' }, faders)),
      ctl('Presets', chips([
        { label: 'Sine', fn: preset(n => n === 1 ? 1 : 0) },
        { label: 'Saw (1/n)', fn: preset(n => 1 / n) },
        { label: 'Square (1/n, impares)', fn: preset(n => n % 2 ? 1 / n : 0) },
        { label: 'Triangle (1/n², impares)', fn: preset(n => n % 2 ? 1 / (n * n) : 0) },
        { label: 'Harmonics 2 + 3', fn: preset(n => n === 2 || n === 3 ? 0.8 : 0) }])));
    info();
  }
})();

/* =====================================================================
   2. ARQUITECTURA
   ===================================================================== */
(function () {
  const sec = M(2);
  if (!sec) return; // academia: cada capítulo vive en su propia página
  const BL = {
    osc: { t: 'Oscillators (osciladores)', rec: 'Note → pitch (altura)', ent: 'Waveform (forma de onda) periódica', ctl: 'Pitch y timbre inicial', x: 'Generan waveforms con mucho contenido armónico. Cada oscillator fija un pitch derivado de la nota tocada.' },
    mix: { t: 'Mixer', rec: 'Varias sources (fuentes)', ent: 'Su suma ponderada', ctl: 'Balance tímbrico', x: 'Suma las salidas de los oscillators, el noise (ruido) y el ring modulator, con un level (nivel) por fuente.' },
    filt: { t: 'Filter (filtro)', rec: 'La mezcla', ent: 'Mezcla con el spectrum modificado', ctl: 'Timbre', x: 'Elimina parte del spectrum (espectro) o resalta una zona. De aquí viene el nombre «subtractive» (sustractiva).' },
    amp: { t: 'VCA (amplificador)', rec: 'Señal filtrada + envelope (envolvente)', ent: 'Señal final', ctl: 'Loudness (volumen)', x: 'Multiplica la señal por una envelope: fija el volumen final en el tiempo.' },
    fx: { t: 'Effects (efectos)', rec: 'Señal final', ent: 'Señal procesada', ctl: '—', x: 'Procesan la señal ya formada (reverb, delay…). Quedan fuera del alcance de esta guía.' },
    env: { t: 'Envelopes (envolventes)', rec: 'Gate on / off (tecla)', ent: 'Control signal (señal de control) por nota', ctl: 'Evolución en el tiempo', x: 'Forma única por nota: se dispara al presionar la tecla y se libera al soltarla.' },
    lfo: { t: 'LFO (oscilador de baja frecuencia)', rec: 'Rate y waveform', ent: 'Control signal cíclica', ctl: 'Movimiento periódico', x: 'Forma cíclica que se repite de manera continua, sin importar cuánto dura la nota.' }
  };
  const blocks = [
    ['osc', 20, 170, 'Oscillators', 'pitch · timbre'], ['mix', 170, 170, 'Mixer', 'sum'], ['filt', 320, 170, 'Filter', 'timbre'],
    ['amp', 470, 170, 'VCA', 'loudness'], ['fx', 620, 170, 'Effects', 'fuera de la guía']];
  const mods = [['lfo', 130, 24, 'LFO', 'cyclic'], ['env', 400, 24, 'Envelopes', 'once per note']];
  const rect = (id, x, y, t, s, cls) => `<g class="blk ${cls}" data-id="${id}" tabindex="0" role="button" aria-label="${t}"><rect x="${x}" y="${y}" width="110" height="60" rx="10"/><text x="${x + 55}" y="${y + 28}">${t}</text><text class="sub" x="${x + 55}" y="${y + 46}">${s}</text></g>`;
  const svg = `<svg class="arch" viewBox="0 0 760 262" role="img" aria-label="Diagrama de bloques de un sintetizador sustractivo">
    <defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z"/></marker></defs>
    <path class="ln" marker-end="url(#ah)" d="M130 200H170"/><path class="ln" marker-end="url(#ah)" d="M280 200H320"/>
    <path class="ln" marker-end="url(#ah)" d="M430 200H470"/><path class="ln" marker-end="url(#ah)" d="M580 200H620"/>
    <path class="dl" d="M165 84V126H75V170"/><path class="dl" d="M215 84V126H375V170"/><path class="dl" d="M440 84V126H395V170"/><path class="dl" d="M470 84V126H525V170"/><path class="dl" d="M240 84V126H525"/>
    <text class="note" x="20" y="252">audio path (ruta de audio) →</text><text class="note" x="560" y="60">- - - modulation (modulación)</text>
    ${blocks.map(b => rect(b[0], b[1], b[2], b[3], b[4], '')).join('')}${mods.map(b => rect(b[0], b[1], b[2], b[3], b[4], 'mod')).join('')}</svg>`;
  const info = h('div', { class: 'info' });
  const show = id => {
    const b = BL[id];
    info.innerHTML = `<div><small>${b.t}</small>${b.x}</div><div><small>Input (recibe)</small>${b.rec}</div><div><small>Output (entrega)</small>${b.ent}</div><div><small>Controls (controla)</small>${b.ctl}</div>`;
    document.querySelectorAll('.arch .blk').forEach(e => e.classList.toggle('on', e.dataset.id === id));
  };

  /* escucha por etapas */
  let stage = 1;
  const d = demo(sec, {
    title: 'Signal chain (cadena de señal), etapa por etapa',
    text: 'La misma nota (<b>sawtooth</b>, diente de sierra) pasando por cada bloque. Cambia de etapa <b>mientras suena</b> y compara qué propiedad se modifica en cada paso.',
    viz: [{ kind: 'scope', label: 'Waveform (forma de onda)', samples: () => 3 * AE.sr / 110, zoom: 2.5 }, { kind: 'spectrum', label: 'Spectrum (espectro)', maxHz: 5000, harm: () => 110 }],
    build(ctx, out, kit) {
      const o = kit.osc('sawtooth', 110), lp = kit.biq('lowpass', 700, -3.01), vca = kit.gain(1), pre = kit.gain(0.3);
      o.connect(lp); lp.connect(vca); vca.connect(pre); pre.connect(out);
      const ea = new Env(ctx, vca.gain, { lo: 0, hi: 1 }); Object.assign(ea, { a: 0.01, d: 0.35, s: 0.4, r: 0.5 });
      const ef = new Env(ctx, lp.detune, { lo: 0, hi: 4200 }); Object.assign(ef, { a: 0.005, d: 0.4, s: 0.0, r: 0.4 });
      const apply = () => {
        const t = ctx.currentTime;
        setP(lp.frequency, stage === 1 ? 18000 : stage === 4 ? 250 : 700, 0.02);
        if (stage < 3) { vca.gain.cancelScheduledValues(t); setP(vca.gain, 1, 0.02); }
        if (stage !== 4) { lp.detune.cancelScheduledValues(t); setP(lp.detune, 0, 0.02); }
      };
      apply();
      kit.loop(() => {
        if (stage >= 3) { ea.on(); if (stage === 4) ef.on(); setTimeout(() => { if (d.playing && stage >= 3) { ea.off(); if (stage === 4) ef.off(); } }, 650); }
        return 1500;
      });
      return { apply };
    }
  });
  const stg = seg({
    label: 'Etapa', value: 1, options: [{ v: 1, label: '1 · Oscillator' }, { v: 2, label: '2 · + Filter' }, { v: 3, label: '3 · + VCA + envelope' }, { v: 4, label: '4 · + Filter envelope' }],
    onChange: v => { stage = v; d.inst?.apply(); show2(); }
  });
  const msgs = {
    1: 'Sonido continuo y <b>brillante</b>: solo el oscillator. Fija pitch (altura) y timbre inicial.',
    2: 'Mismo sonido, más <b>oscuro</b>: el filter quitó harmonics (armónicos) agudos. Cambió el <b>timbre</b>.',
    3: 'Ahora cada nota <b>nace y muere</b>: el VCA con su envelope (envolvente) da la <b>loudness</b> (volumen) en el tiempo.',
    4: 'El filter se abre al inicio de cada nota y se cierra: el <b>timbre</b> también evoluciona (sonido <b>pluck</b>).'
  };
  const show2 = () => d.setReadout(msgs[stage]);
  d.controls.append(ctl('Stage (etapa)', stg));
  show2();

  sec.prepend(h('div', { class: 'card' }, h('div', { html: svg }), h('p', { class: 'txt', style: 'margin:0 0 10px' }, 'Haz clic en cada bloque.'), info));
  document.querySelectorAll('.arch .blk').forEach(e => {
    e.addEventListener('click', () => show(e.dataset.id));
    e.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); show(e.dataset.id); } });
  });
  show('filt');
})();

/* =====================================================================
   3. OSCILADORES
   ===================================================================== */
(function () {
  const sec = M(3);
  if (!sec) return; // academia: cada capítulo vive en su propia página

  /* ---- 3a Formas de onda ---- */
  {
    let f = 220, type = 'sawtooth';
    const W = {
      sine: { n: 'Sine', es: 'seno', ps: 'Solo la fundamental', a: n => n === 1 ? 1 : 0, c: 'Puro, sin brillo. Sub-bajos, base para modulación.', g: 0.35 },
      triangle: { n: 'Triangle', es: 'triángulo', ps: 'Solo odd harmonics (impares) · amplitude 1/n²', a: n => n % 2 ? 1 / (n * n) : 0, c: 'Suave, aflautado. El quinto armónico vale 1/25 de la fundamental.', g: 0.35 },
      sawtooth: { n: 'Sawtooth', es: 'diente de sierra', ps: 'Even + odd harmonics (pares e impares) · amplitude 1/n', a: n => 1 / n, c: 'Brillante, denso. La fuente más usada para filtrar.', g: 0.22 },
      square: { n: 'Square', es: 'cuadrada', ps: 'Solo odd harmonics (impares) · amplitude 1/n', a: n => n % 2 ? 1 / n : 0, c: 'Hueco, tipo clarinete. Más brillante que el triángulo.', g: 0.2 }
    };
    const d = demo(sec, {
      title: 'Classic waveforms (formas de onda clásicas)',
      text: 'Cada waveform tiene un <b>spectrum</b> (espectro) fijo y característico. Cámbiala mientras suena: el <b>scope</b> muestra el contorno, las barras la serie de harmonics teórica y el spectrum de la derecha lo que realmente se mide.',
      viz: [
        { kind: 'scope', label: 'Scope (osciloscopio) · 3 ciclos', samples: () => 3 * AE.sr / f },
        {
          kind: 'custom', always: true, label: 'Amplitude teórica de los 10 primeros harmonics', draw(g, w, hh) {
            grid(g, w, hh, 10, 4);
            const bw = w / 10;
            for (let n = 1; n <= 10; n++) {
              const a = W[type].a(n), bh = a * (hh - 26 * g.dpr);
              g.fillStyle = a > 0 ? COL.trace : COL.dim; g.fillRect((n - 1) * bw + bw * .2, hh - 14 * g.dpr - Math.max(bh, 1.5), bw * .6, Math.max(bh, 1.5));
              txt(g, n, (n - .5) * bw, hh - 3 * g.dpr, COL.text, 'center');
            }
          }
        },
        { kind: 'spectrum', label: 'Spectrum (espectro) medido', maxHz: 4000, harm: () => f }
      ],
      build(ctx, out, kit) {
        const o = kit.osc(type, f), g = kit.gain(W[type].g);
        o.connect(g); g.connect(out);
        return { setF: v => setP(o.frequency, v), setT: () => { o.type = type; setP(g.gain, W[type].g); } };
      }
    });
    const info = () => d.setReadout(`<b>${W[type].n}</b> <span class="es">(${W[type].es})</span> — ${W[type].ps}.<br>${W[type].c}`);
    const s = seg({ label: 'Waveform', value: type, options: Object.keys(W).map(k => ({ v: k, label: W[k].n })), onChange: v => { type = v; d.inst?.setT(); info(); d.redraw(); } });
    const k = knob({ label: 'Frequency', min: 55, max: 1760, value: 220, log: true, fmt: fmtHz, onInput: v => { f = v; d.inst?.setF(v); d.redraw(); } });
    d.controls.append(ctl('Waveform', s), ctl('', k));
    info();
  }

  /* ---- 3b Pulso y PWM ---- */
  {
    let f = 110, duty = 0.5, pwm = false, rate = 0.5, depth = 0.3;
    const nullInfo = () => {
      for (let q = 2; q <= 12; q++) { const x = duty * q; if (Math.abs(x - Math.round(x)) < 0.016 && Math.round(x) >= 1) return `Con ${Math.round(duty * 100)} % se anulan los harmonics <b>múltiplos de ${q}</b>.`; }
      return 'Ningún harmonic se anula exactamente con este ancho.';
    };
    const d = demo(sec, {
      title: 'Pulse wave (onda de pulso), duty cycle y PWM',
      text: 'Con <b>50 %</b> es una <b>square</b> (cuadrada), sin even harmonics (armónicos pares). Al alejarte del 50 % aparecen los pares y el timbre se vuelve <b>delgado y nasal</b>. Prueba <b>40 % vs 60 %</b>: tienen el mismo spectrum. Activa <b>PWM</b> (pulse width modulation, modulación de ancho de pulso) y un LFO barrerá el ancho.',
      viz: [
        { kind: 'scope', label: 'Waveform (forma de onda)', samples: () => 2.5 * AE.sr / f, zoom: 2.2 },
        { kind: 'spectrum', label: 'Spectrum (espectro): los huecos son harmonics anulados', maxHz: 3000, harm: () => f }
      ],
      build(ctx, out, kit) {
        const p = makePulse(ctx, kit, f), g = kit.gain(0.25), lfo = kit.osc('triangle', rate), lg = kit.gain(pwm ? 2 * depth : 0);
        p.setDuty(duty); p.out.connect(g); g.connect(out); lfo.connect(lg); lg.connect(p.cs.offset);
        return {
          setF: v => p.setFreq(v), setDuty: () => p.setDuty(duty),
          setLfo: () => { setP(lfo.frequency, rate); setP(lg.gain, pwm ? 2 * depth : 0); }
        };
      }
    });
    const info = () => d.setReadout(`Duty cycle <b>${Math.round(duty * 100)} %</b>${pwm ? ` ± ${Math.round(depth * 100)} % (PWM a ${rate.toFixed(2)} Hz)` : ''}<br>${nullInfo()}${duty !== 0.5 ? ` · El ${Math.round((1 - duty) * 100)} % suena igual (pulse invertido).` : ''}`);
    const kd = knob({ label: 'Pulse width', min: 0.05, max: 0.95, value: 0.5, step: 0.01, fmt: fmtPct, onInput: v => { duty = v; d.inst?.setDuty(); info(); } });
    const kf = knob({ label: 'Frequency', min: 55, max: 440, value: 110, log: true, fmt: fmtHz, onInput: v => { f = v; d.inst?.setF(v); d.redraw(); } });
    const tg = toggle({ label: 'PWM (LFO → pulse width)', onChange: v => { pwm = v; d.inst?.setLfo(); info(); } });
    const kr = knob({ label: 'LFO rate', min: 0.1, max: 5, value: 0.5, log: true, fmt: v => v.toFixed(2) + ' Hz', onInput: v => { rate = v; d.inst?.setLfo(); info(); } });
    const kp = knob({ label: 'Depth', min: 0, max: 0.45, value: 0.3, step: 0.01, fmt: fmtPct, onInput: v => { depth = v; d.inst?.setLfo(); info(); } });
    const pre = x => () => { tg.set(false); kd.set(x); };
    d.controls.append(ctl('', kd), ctl('', kf),
      ctl('Presets', chips([{ label: '50 %', fn: pre(0.5) }, { label: '33 %', fn: pre(0.33) }, { label: '40 %', fn: pre(0.4) }, { label: '60 %', fn: pre(0.6) }, { label: '10 %', fn: pre(0.1) }])),
      ctl('Modulation', tg), ctl('', kr), ctl('', kp));
    info();
  }

  /* ---- 3c Ruido ---- */
  {
    let db = -18;
    const d = demo(sec, {
      title: 'White noise (ruido blanco)',
      text: 'Señal aleatoria: <b>sin período, sin fundamental, sin pitch definido</b>. Reparte la misma potencia en todas las frecuencias, así que el <b>spectrum</b> es plano. Útil para viento, percusión y para dar «aire» al <b>attack</b> (ataque) de una nota.',
      viz: [
        { kind: 'scope', label: 'Waveform · sin patrón', samples: () => 700, zoom: 4, trigger: false },
        { kind: 'spectrum', label: 'Spectrum plano', maxHz: 12000 }
      ],
      build(ctx, out, kit) {
        const n = kit.noise(), g = kit.gain(Math.pow(10, db / 20) * 0.5);
        n.connect(g); g.connect(out);
        return { setA: () => setP(g.gain, Math.pow(10, db / 20) * 0.5) };
      }
    });
    d.controls.append(ctl('', knob({ label: 'Level', min: -40, max: -6, value: -18, step: 0.5, fmt: v => v.toFixed(1) + ' dB', onInput: v => { db = v; d.inst?.setA(); } })));
    d.setReadout('Escucha cómo suena sin pitch. En el capítulo del filter lo vas a esculpir.');
  }

  /* ---- 3d Wavetable ---- */
  {
    const NH = [1, 2, 3, 4, 6, 8, 12, 16, 24];
    let f = 130.8, idx = 0, mode = 'interp', lfoOn = false, lfoRate = 0.25, lfoPh = 0;
    const amps = i => Array.from({ length: NH[i] }, (_, k) => 1 / (k + 1));
    const shape = (i, x) => { let s = 0; amps(i).forEach((a, k) => s += a * Math.sin(2 * Math.PI * (k + 1) * x)); return s; };
    const norm = NH.map((_, i) => { let m = 0; for (let x = 0; x < 1; x += 0.005) m = Math.max(m, Math.abs(shape(i, x))); return m; });
    const d = demo(sec, {
      title: 'Wavetable (tabla de ondas)',
      text: 'Nueve waveforms de un ciclo, con más harmonics de izquierda a derecha. El <b>index</b> (índice) elige la posición. <b>Interpolated</b> (interpolado) funde las vecinas; <b>stepped</b> (abrupto) salta. Activa el LFO sobre el index: el timbre cambia de manera continua durante la nota.',
      viz: [
        {
          kind: 'custom', always: true, label: 'La tabla (9 waveforms) y la posición del index', draw(g, w, hh) {
            grid(g, w, hh, 9, 2);
            const cw = w / 9;
            for (let i = 0; i < 9; i++) {
              let wgt = 0;
              if (mode === 'abrupt') wgt = Math.round(idx) === i ? 1 : 0; else wgt = Math.max(0, 1 - Math.abs(idx - i));
              g.strokeStyle = wgt > 0 ? COL.trace : COL.dim; g.globalAlpha = 0.25 + 0.75 * wgt; g.lineWidth = (1 + 1.5 * wgt) * g.dpr; g.beginPath();
              for (let x = 0; x <= cw - 8 * g.dpr; x += 2) {
                const y = hh / 2 - shape(i, x / (cw - 8 * g.dpr)) / norm[i] * (hh / 2 - 14 * g.dpr);
                x ? g.lineTo(i * cw + 4 * g.dpr + x, y) : g.moveTo(i * cw + 4 * g.dpr + x, y);
              }
              g.stroke(); g.globalAlpha = 1;
            }
            const mx = (idx + 0.5) * cw; g.fillStyle = COL.blue; g.beginPath(); g.moveTo(mx, hh - 2); g.lineTo(mx - 6 * g.dpr, hh - 10 * g.dpr); g.lineTo(mx + 6 * g.dpr, hh - 10 * g.dpr); g.fill();
          }
        },
        { kind: 'scope', label: 'Waveform resultante', samples: () => 2.5 * AE.sr / f, zoom: 1.8 },
        { kind: 'spectrum', label: 'Spectrum (espectro)', maxHz: 4000, harm: () => f }
      ],
      build(ctx, out, kit) {
        const waves = NH.map((n, i) => { const im = new Float32Array(n + 1); amps(i).forEach((a, k) => im[k + 1] = a); return ctx.createPeriodicWave(new Float32Array(n + 1), im); });
        const A = kit.osc('sine', f), B = kit.osc('sine', f), gA = kit.gain(1), gB = kit.gain(0), g = kit.gain(0.25);
        A.connect(gA); B.connect(gB); gA.connect(g); gB.connect(g); g.connect(out);
        let ca = -1, cb = -1;
        const setIdx = () => {
          let i0, i1, fr;
          if (mode === 'abrupt') { i0 = i1 = Math.round(idx); fr = 0; } else { i0 = Math.floor(idx); i1 = Math.min(8, i0 + 1); fr = idx - i0; }
          if (i0 !== ca) { A.setPeriodicWave(waves[i0]); ca = i0; }
          if (i1 !== cb) { B.setPeriodicWave(waves[i1]); cb = i1; }
          setP(gA.gain, 1 - fr, 0.01); setP(gB.gain, fr, 0.01);
        };
        setIdx();
        kit.every(() => { if (lfoOn) { lfoPh += 0.03 * lfoRate; ki.set(4 + 4 * Math.sin(2 * Math.PI * lfoPh)); } }, 30);
        return { setF: v => { setP(A.frequency, v); setP(B.frequency, v); }, setIdx };
      }
    });
    const ki = knob({ label: 'Index', min: 0, max: 8, value: 0, step: 0.01, size: 64, fmt: v => v.toFixed(2), onInput: v => { idx = v; d.inst?.setIdx(); d.redraw(); info(); } });
    const kf = knob({ label: 'Frequency', min: 55, max: 440, value: 130.8, log: true, fmt: fmtHz, onInput: v => { f = v; d.inst?.setF(v); d.redraw(); } });
    const sm = seg({ label: 'Transition', value: 'interp', options: [{ v: 'interp', label: 'Interpolated' }, { v: 'abrupt', label: 'Stepped' }], onChange: v => { mode = v; d.inst?.setIdx(); d.redraw(); } });
    const tg = toggle({ label: 'LFO → index', onChange: v => { lfoOn = v; if (v && !d.playing) d.start(); } });
    const kr = knob({ label: 'LFO rate', min: 0.05, max: 2, value: 0.25, log: true, fmt: v => v.toFixed(2) + ' Hz', onInput: v => { lfoRate = v; } });
    d.stopHooks.push(() => { lfoOn = false; tg.set(false, true); });
    const info = () => d.setReadout(`Index <b>${idx.toFixed(2)}</b> → harmonics de la waveform más cercana: <b>${NH[Math.round(idx)]}</b>`);
    d.controls.append(ctl('', ki), ctl('', kf), ctl('Transition', sm), ctl('Modulation', tg), ctl('', kr));
    info();
  }
})();

/* =====================================================================
   4. RING MODULATION Y MIXER
   ===================================================================== */
(function () {
  const sec = M(4);
  if (!sec) return; // academia: cada capítulo vive en su propia página

  /* ---- 4a Ring modulator ---- */
  {
    let f1 = 440, f2 = 660, mode = 'ring';
    const d = demo(sec, {
      title: 'Mixer vs ring modulator (suma vs producto)',
      text: 'Con dos <b>sines</b> (senos), el <b>mixer</b> (suma) conserva f₁ y f₂. El <b>ring modulator</b> (producto) las elimina y deja solo <b>f₂ − f₁</b> y <b>f₁ + f₂</b>. Si la razón entre ambas no es simple, el resultado es <b>inharmonic</b> (inarmónico): metálico, de campana.',
      viz: [
        { kind: 'scope', label: 'Waveform (forma de onda)', samples: () => 0.012 * AE.sr, zoom: 2.2, trigger: false },
        {
          kind: 'spectrum', label: 'Spectrum (marcas = frecuencias esperadas)', maxHz: 2000,
          markers: () => mode === 'ring'
            ? [{ f: Math.abs(f2 - f1), label: 'f₂−f₁', color: COL.blue }, { f: f1 + f2, label: 'f₁+f₂', color: COL.mark }]
            : [{ f: f1, label: 'f₁', color: COL.blue }, { f: f2, label: 'f₂', color: COL.mark }]
        }
      ],
      build(ctx, out, kit) {
        const o1 = kit.osc('sine', f1), o2 = kit.osc('sine', f2);
        const rg = kit.gain(0), rOut = kit.gain(mode === 'ring' ? 0.5 : 0);
        o1.connect(rg); o2.connect(rg.gain); rg.connect(rOut); rOut.connect(out);
        const s1 = kit.gain(0.25), s2 = kit.gain(0.25), sOut = kit.gain(mode === 'sum' ? 1 : 0);
        o1.connect(s1); o2.connect(s2); s1.connect(sOut); s2.connect(sOut); sOut.connect(out);
        return {
          setF: () => { setP(o1.frequency, f1); setP(o2.frequency, f2); },
          setMode: () => { setP(rOut.gain, mode === 'ring' ? 0.5 : 0, 0.02); setP(sOut.gain, mode === 'sum' ? 1 : 0, 0.02); }
        };
      }
    });
    const info = () => {
      const sm = f1 + f2, df = Math.abs(f2 - f1);
      d.setReadout(`f₁ = <b>${f1.toFixed(1)}</b> Hz · f₂ = <b>${f2.toFixed(1)}</b> Hz<br>` + (mode === 'ring'
        ? `Output: suma <b>${sm.toFixed(1)} Hz</b> y diferencia <b>${df.toFixed(1)} Hz</b>. ${df < 40 && df > 0.5 ? 'La diferencia es muy grave: se oye como <b>roughness</b> (aspereza).' : ''}`
        : `Output: las dos frecuencias originales, sin cambios.`));
    };
    const k1 = knob({ label: 'f₁', min: 100, max: 1000, value: 440, log: true, fmt: fmtHz, onInput: v => { f1 = v; d.inst?.setF(); info(); d.redraw(); } });
    const k2 = knob({ label: 'f₂', min: 100, max: 1000, value: 660, log: true, fmt: fmtHz, onInput: v => { f2 = v; d.inst?.setF(); info(); d.redraw(); } });
    const m = seg({ label: 'Mode', value: 'ring', options: [{ v: 'sum', label: 'Mixer (sum)' }, { v: 'ring', label: 'Ring mod (×)' }], onChange: v => { mode = v; d.inst?.setMode(); info(); d.redraw(); } });
    const pre = (a, b) => () => { k1.set(a); k2.set(b); };
    d.controls.append(ctl('Mode', m), ctl('', k1), ctl('', k2),
      ctl('Intervals (intervalos)', chips([
        { label: 'Fifth (440 · 660)', fn: pre(440, 660) }, { label: 'Octave (440 · 880)', fn: pre(440, 880) },
        { label: 'Tritone (440 · 622,3)', fn: pre(440, 622.3) }, { label: 'Semitone (440 · 466,2)', fn: pre(440, 466.2) }])));
    info();
  }

  /* ---- 4b Mixer ---- */
  {
    let f0 = 110, wave = 'sawtooth';
    const S = { l1: 0.45, l2: 0.45, l3: 0, ln: 0, i2: 1, i3: 1, c2: 7, c3: 0 };
    const d = demo(sec, {
      title: 'Mixer: 3 oscillators + noise',
      text: 'Suma oscillators con un <b>level</b> (nivel) por fuente. Al mismo pitch con un <b>detune</b> (desafinación) leve se produce <b>beating</b> (batido), que suena cálido; a intervalos distintos, un timbre más denso; un poco de <b>noise</b> (ruido) añade aire. Cuidado con el <b>headroom</b> (margen): si la suma de levels pasa de 1, el mixer <b>clips</b> (satura).',
      viz: [
        { kind: 'scope', label: 'Waveform (forma de onda)', samples: () => 3 * AE.sr / f0, zoom: 1.4 },
        {
          kind: 'custom', label: 'Amplitude en el tiempo (el beating aparece como oleaje)', draw(g, w, hh, dd) {
            const H = dd.s.hist || (dd.s.hist = []);
            const buf = dd._tb || (dd._tb = new Float32Array(dd.an.fftSize)); dd.an.getFloatTimeDomainData(buf);
            let pk = 0; for (let i = buf.length - 4096; i < buf.length; i++) pk = Math.max(pk, Math.abs(buf[i]));
            H.push(pk); if (H.length > 300) H.shift();
            grid(g, w, hh, 6, 4); g.strokeStyle = COL.trace; g.lineWidth = 2 * g.dpr; g.beginPath();
            H.forEach((v, i) => { const x = w - (H.length - i) / 300 * w, y = hh - 6 - Math.min(v * 3.2, 1) * (hh - 12); i ? g.lineTo(x, y) : g.moveTo(x, y); });
            g.stroke(); txt(g, '≈ 5 s', 6 * g.dpr, 12 * g.dpr);
          }
        },
        { kind: 'spectrum', label: 'Spectrum (espectro)', maxHz: 3000, harm: () => f0 }
      ],
      build(ctx, out, kit) {
        const ratio = i => Math.pow(2, [0, 12, 7][i] / 12);
        const o1 = kit.osc(wave, f0), o2 = kit.osc(wave, f0 * ratio(S.i2)), o3 = kit.osc(wave, f0 * ratio(S.i3)), nz = kit.noise();
        o2.detune.value = S.c2; o3.detune.value = S.c3;
        const g1 = kit.gain(S.l1), g2 = kit.gain(S.l2), g3 = kit.gain(S.l3), gn = kit.gain(S.ln);
        const mix = kit.gain(1), clip = ctx.createWaveShaper(); clip.curve = new Float32Array([-1, 1]);
        const mst = kit.gain(0.28);
        o1.connect(g1); o2.connect(g2); o3.connect(g3); nz.connect(gn);
        [g1, g2, g3, gn].forEach(g => g.connect(mix)); mix.connect(clip); clip.connect(mst); mst.connect(out);
        return {
          update() {
            setP(g1.gain, S.l1); setP(g2.gain, S.l2); setP(g3.gain, S.l3); setP(gn.gain, S.ln);
            setP(o1.frequency, f0); setP(o2.frequency, f0 * ratio(S.i2)); setP(o3.frequency, f0 * ratio(S.i3));
            setP(o2.detune, S.c2); setP(o3.detune, S.c3);
            o1.type = o2.type = o3.type = wave;
          }
        };
      }
    });
    const info = () => {
      const sum = S.l1 + S.l2 + S.l3 + S.ln, beat = (i, c) => i === 0 ? ((f0 * (Math.pow(2, c / 1200) - 1))) : null;
      // i = 0 unísono
      const b2 = S.i2 === 0 ? Math.abs(f0 * (Math.pow(2, S.c2 / 1200) - 1)) : null, b3 = S.i3 === 0 ? Math.abs(f0 * (Math.pow(2, S.c3 / 1200) - 1)) : null;
      const bs = [b2 != null && S.l2 > 0.02 && S.l1 > 0.02 ? `osc 2: <b>${b2.toFixed(2)} Hz</b>` : null, b3 != null && S.l3 > 0.02 && S.l1 > 0.02 ? `osc 3: <b>${b3.toFixed(2)} Hz</b>` : null].filter(Boolean);
      d.setReadout(`Suma de levels: <b style="color:${sum > 1 ? 'inherit' : 'inherit'}">${sum.toFixed(2)}</b> ${sum > 1 ? '→ ¡el mixer <b>clips</b> (satura)!' : '→ hay headroom'}<br>` +
        (bs.length ? `Beating respecto al osc 1 (Δf = f·(2^(c/1200)−1)): ${bs.join(' · ')}` : 'Beating: pon un oscillator en unison con un detune leve para oírlo.'));
    };
    const up = () => { d.inst?.update(); info(); };
    const mk = (label, key, extra = {}) => knob(Object.assign({ label, min: 0, max: 1, value: S[key], step: 0.01, fmt: v => v.toFixed(2), size: 52, onInput: v => { S[key] = v; up(); } }, extra));
    const kl1 = mk('Osc 1 level', 'l1'), kl2 = mk('Osc 2 level', 'l2'), kl3 = mk('Osc 3 level', 'l3'), kln = mk('Noise', 'ln');
    const kc2 = knob({ label: 'Detune 2', min: -50, max: 50, value: 7, step: 1, size: 52, fmt: v => v + '¢', onInput: v => { S.c2 = v; up(); } });
    const kc3 = knob({ label: 'Detune 3', min: -50, max: 50, value: 0, step: 1, size: 52, fmt: v => v + '¢', onInput: v => { S.c3 = v; up(); } });
    const io = [{ v: 0, label: 'Unison' }, { v: 1, label: 'Octave' }, { v: 2, label: 'Fifth' }];
    const s2 = seg({ label: 'Intervalo osc 2', value: 0, options: io, onChange: v => { S.i2 = v; up(); } });
    const s3 = seg({ label: 'Intervalo osc 3', value: 0, options: io, onChange: v => { S.i3 = v; up(); } });
    S.i2 = 0; S.i3 = 0;
    const kf = knob({ label: 'Base note', min: 55, max: 440, value: 110, log: true, size: 52, fmt: fmtHz, onInput: v => { f0 = v; up(); d.redraw(); } });
    const sw = seg({ label: 'Wave', value: 'sawtooth', options: [{ v: 'sawtooth', label: 'Saw' }, { v: 'square', label: 'Square' }], onChange: v => { wave = v; up(); } });
    const P = (o) => () => { const set = { l1: kl1, l2: kl2, l3: kl3, ln: kln, c2: kc2, c3: kc3 }; for (const k in o) { if (k === 'i2') s2.set(o[k]); else if (k === 'i3') s3.set(o[k]); else set[k].set(o[k]); } };
    d.controls.append(ctl('Wave', sw), kf, kl1, kl2, kl3, kln, kc2, kc3, ctl('Osc 2', s2), ctl('Osc 3', s3));
    d.extra.append(h('div', { style: 'margin:0 0 12px' }, ctl('Presets', chips([
      { label: 'Fat unison (7¢)', fn: P({ l1: .45, l2: .45, l3: 0, ln: 0, i2: 0, c2: 7, i3: 0, c3: 0 }) },
      { label: 'Octave + fifth', fn: P({ l1: .4, l2: .3, l3: .25, ln: 0, i2: 1, c2: 0, i3: 2, c3: 0 }) },
      { label: 'Air (low noise)', fn: P({ l1: .5, l2: .3, l3: 0, ln: .08, i2: 0, c2: 5, i3: 0, c3: 0 }) },
      { label: 'All max → clipping', fn: P({ l1: 1, l2: 1, l3: 1, ln: 0, i2: 0, c2: 0, i3: 0, c3: 0 }) }]))));
    info();
  }
})();
