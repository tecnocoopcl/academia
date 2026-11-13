'use strict';
/* academia: prueba de aprendizaje entre capítulos. Usa el motor de audio de
   core.js (AE) para respetar el volumen general y el botón Mute. Al aprobar,
   curso.js habilita el botón Siguiente. */
(function () {
  const form = document.getElementById('prueba');
  if (!form) return;

  const FORMAS = [
    ['sine', 'Sine (senoidal)'],
    ['triangle', 'Triangle (triangular)'],
    ['square', 'Square (cuadrada)'],
    ['sawtooth', 'Sawtooth (diente de sierra)'],
  ];
  const ondas = [...form.querySelectorAll('.onda')];
  ondas.forEach(o => {
    const sel = o.querySelector('select');
    FORMAS.forEach(([v, t]) => sel.append(new Option(t, v)));
    sel.addEventListener('change', () => o.classList.remove('bien', 'mal'));
    o.querySelector('.escuchar').addEventListener('click', e => escuchar(o.dataset.correcta, e.currentTarget));
  });

  /* escuchar: 1,2 s a 220 Hz, y se detiene con Mute o con otro experimento */
  function escuchar(forma, boton) {
    const ctx = AE.init();
    AE.stopAll();
    const osc = ctx.createOscillator(), env = ctx.createGain();
    osc.type = forma; osc.frequency.value = 220;
    const t = ctx.currentTime;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.25, t + 0.02);
    env.gain.setValueAtTime(0.25, t + 1.1);
    env.gain.linearRampToValueAtTime(0, t + 1.2);
    osc.connect(env); env.connect(AE.vol);
    osc.start(t); osc.stop(t + 1.25);
    boton.setAttribute('aria-pressed', 'true');
    const sonido = { stop() { try { osc.stop(); } catch (e) { } fin(); } };
    function fin() { boton.setAttribute('aria-pressed', 'false'); if (AE.current === sonido) AE.current = null; }
    osc.onended = fin;
    AE.current = sonido;
  }

  /* corrección */
  const resultado = document.getElementById('prueba-resultado');
  const p2 = form.querySelector('fieldset[data-correcta]');
  p2.addEventListener('change', () => p2.classList.remove('bien', 'mal'));
  form.addEventListener('submit', e => {
    e.preventDefault();
    let bien1 = true, falta = false;
    ondas.forEach(o => {
      const v = o.querySelector('select').value;
      if (!v) { falta = true; bien1 = false; return; }
      const ok = v === o.dataset.correcta;
      o.classList.toggle('bien', ok); o.classList.toggle('mal', !ok);
      if (!ok) bien1 = false;
    });
    const r2 = form.querySelector('input[name="p2"]:checked');
    if (!r2) falta = true;
    const bien2 = Boolean(r2) && r2.value === p2.dataset.correcta;
    if (r2) { p2.classList.toggle('bien', bien2); p2.classList.toggle('mal', !bien2); }

    resultado.classList.remove('ok', 'error');
    if (falta) {
      resultado.textContent = 'Te falta responder algo.';
      resultado.classList.add('error');
    } else if (bien1 && bien2) {
      resultado.textContent = '¡Muy bien! Ya puedes pasar al capítulo 2.';
      resultado.classList.add('ok');
      window.cursoDesbloquear?.();
    } else {
      const pistas = [];
      if (!bien1) pistas.push('la diente de sierra sube en rampa y cae de golpe, la cuadrada salta entre dos niveles y la senoidal es suave y redonda');
      if (!bien2) pistas.push('la frequency (frecuencia) es lo que el oído percibe como pitch (altura)');
      resultado.textContent = 'Casi. Una pista: ' + pistas.join('; ') + '. Revisa lo marcado y vuelve a intentarlo.';
      resultado.classList.add('error');
    }
  });
})();
