'use strict';
/* academia: el curso es una secuencia de páginas, una por sección. Esta lista
   es la única fuente del orden: con ella se arman el menú, la barra de
   progreso y los enlaces de anterior/siguiente de cada página. */
const PAGINAS = [
  { f: 'index.html', nav: 'Inicio', t: 'Inicio' },
  { f: 'prologo.html', nav: 'Prólogo', t: 'Prólogo' },
  { f: 'introduccion.html', nav: 'Introducción', t: 'Introducción' },
  { f: '1-sonido.html', nav: '1 Sound', t: '1 · Sound (el sonido)' },
  { f: 'prueba-1.html', nav: 'Prueba 1', t: 'Prueba 1 · El sonido', prueba: true },
  { f: '2-arquitectura.html', nav: '2 Architecture', t: '2 · Synth architecture' },
  { f: '3-osciladores.html', nav: '3 Oscillators', t: '3 · Oscillators & waveforms' },
  { f: '4-mixer.html', nav: '4 Ring mod & mixer', t: '4 · Ring modulation & mixer' },
  { f: '5-filtro.html', nav: '5 Filter', t: '5 · Filter' },
  { f: '6-envolventes.html', nav: '6 Envelopes', t: '6 · Envelopes & VCA' },
  { f: '7-lfos.html', nav: '7 LFOs', t: '7 · LFOs' },
  { f: '8-flujo.html', nav: '8 Synth', t: '8 · Signal flow' },
  { f: 'glosario.html', nav: 'Glossary', t: 'Glossary (glosario)' },
];

(function () {
  const archivo = location.pathname.split('/').pop() || 'index.html';
  const i = Math.max(0, PAGINAS.findIndex(p => p.f === archivo));
  const actual = PAGINAS[i];
  const total = PAGINAS.length;
  const el = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    e.append(...kids);
    return e;
  };

  /* menú de capítulos */
  const nav = document.getElementById('capitulos');
  PAGINAS.forEach((p, j) => {
    const a = el('a', { href: p.f }, p.nav);
    if (p.prueba) a.classList.add('nav-prueba');
    if (j === i) { a.classList.add('on'); a.setAttribute('aria-current', 'page'); }
    nav.append(a);
  });
  // que el capítulo actual quede a la vista en pantallas angostas
  nav.querySelector('.on')?.scrollIntoView({ block: 'nearest', inline: 'center' });

  /* barra de progreso: dónde estás en el curso, no cuánto has hecho */
  const fraccion = i / (total - 1);
  const donde = i === 0 ? 'al comienzo del curso'
    : i === total - 1 ? 'al final del curso'
    : fraccion < 0.34 ? 'en la primera parte del curso'
    : fraccion < 0.67 ? 'en la mitad del curso'
    : 'en la recta final del curso';
  const barra = el('div', { class: 'progreso-barra' }, el('div', { class: 'progreso-lleno', style: `width:${fraccion * 100}%` }));
  PAGINAS.forEach((p, j) => {
    const hito = el('a', {
      href: p.f,
      class: 'hito' + (p.prueba ? ' prueba' : '') + (j < i ? ' pasado' : '') + (j === i ? ' actual' : ''),
      style: `left:${(j / (total - 1)) * 100}%`,
      title: p.t,
      'aria-label': p.t,
    });
    barra.append(hito);
  });
  const texto = el('p', { class: 'progreso-texto' },
    'Estás en ', el('b', {}, actual.t), ` · ${donde} (${i + 1} de ${total})`);
  document.getElementById('progreso').append(barra, texto);

  /* anterior / siguiente */
  const paso = document.getElementById('paso');
  const ant = PAGINAS[i - 1], sig = PAGINAS[i + 1];
  paso.append(ant ? el('a', { class: 'paso-ant', href: ant.f }, '← ' + ant.t) : el('span'));
  if (sig) {
    const etiqueta = i === 0 ? 'Empezar el curso →' : 'Siguiente: ' + sig.t + ' →';
    const btn = el('a', { class: 'paso-sig', href: sig.f }, etiqueta);
    if (actual.prueba) {
      // la prueba se aprueba para seguir; el menú sigue abierto (el material es libre)
      btn.setAttribute('aria-disabled', 'true');
      btn.removeAttribute('href');
      const nota = el('span', { class: 'paso-nota' }, 'Responde la prueba para seguir.');
      paso.append(el('div', { class: 'paso-bloq' }, nota, btn));
      window.cursoDesbloquear = () => {
        btn.setAttribute('href', sig.f);
        btn.removeAttribute('aria-disabled');
        nota.remove();
      };
    } else {
      paso.append(btn);
    }
  }
})();
