(() => {
  const qs = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));

  const state = {
    pendientes: [],
    index: 0,
    current: null,
    calificacion: null,
    estado: null,
  };

  const progreso = qs('#progreso');
  const titulo = qs('#titulo');
  const cover = qs('#cover');
  const comentario = qs('#comentario');
  const card = qs('#card');
  const empty = qs('#empty');
  const btnVolver = qs('#btn-volver');

  const btnGuardar = qs('#btn-guardar');
  const btnGuardarSiguiente = qs('#btn-guardar-siguiente');
  const btnOmitir = qs('#btn-omitir');
  const estrellas = qs('#stars');
  const estadoBtns = qsa('.estado-btn');

  const api = (p) => `${BASE_PATH}/api/mangas${p}`;
  const coverUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/300x400/1e293b/64748b?text=Sin+Portada';
    if (url.startsWith('http')) return url;
    // Si es un nombre de archivo, construir la ruta completa
    return `${BASE_PATH}/covers/${url}`;
  };
  const detalleUrl = (id) => `${BASE_PATH}/detalle.html?id=${id}`;
  const indexUrl = () => `${BASE_PATH}/index.html`;

  function setProgreso() {
    if (!state.pendientes.length) {
      progreso.textContent = '0 de 0';
      return;
    }
    progreso.textContent = `${state.index + 1} de ${state.pendientes.length}`;
  }

  function pintarEstrellas(valor) {
    qsa('[data-star]', estrellas).forEach((el) => {
      const n = Number(el.dataset.star);
      el.textContent = n <= valor ? 'star' : 'star';
      el.style.color = n <= valor ? '#FACC15' : '#9CA3AF';
    });
  }

  function seleccionarEstado(valor) {
    estadoBtns.forEach((b) => {
      if (b.dataset.estado === valor) {
        b.classList.remove('bg-gray-700');
        b.classList.add('bg-blue-700');
      } else {
        b.classList.remove('bg-blue-700');
        b.classList.add('bg-gray-700');
      }
    });
  }

  function render() {
    const m = state.current;
    if (!m) return;
    titulo.textContent = m.titulo || m.nombre || 'Sin título';
    cover.src = coverUrl(m.portadaUrl);
    comentario.value = m.comentarioOpinion && !/importado de komga/i.test(m.comentarioOpinion) ? (m.comentarioOpinion || '') : '';

    state.calificacion = m.calificacion || 0;
    state.estado = m.estado || 'no_empezado';

    pintarEstrellas(state.calificacion);
    seleccionarEstado(state.estado);

    setProgreso();
  }

  async function cargarPendientes() {
    progreso.textContent = 'Cargando...';
    try {
      const r = await fetch(api('/pendientes'));
      if (!r.ok) throw new Error('Error al cargar pendientes');
      const data = await r.json();
      state.pendientes = data || [];
      state.index = 0;
      state.current = state.pendientes[0] || null;
      if (!state.current) {
        card.classList.add('hidden');
        empty.classList.remove('hidden');
      } else {
        card.classList.remove('hidden');
        empty.classList.add('hidden');
        render();
      }
    } catch (e) {
      progreso.textContent = 'Error cargando pendientes';
      console.error(e);
    }
  }

  function siguiente() {
    if (state.index + 1 < state.pendientes.length) {
      state.index += 1;
      state.current = state.pendientes[state.index];
      render();
    } else {
      card.classList.add('hidden');
      empty.classList.remove('hidden');
      empty.textContent = '¡Listo! No quedan mangas por calificar.';
      setProgreso();
    }
  }

  async function guardar(avanzar=false) {
    if (!state.current) return;
    const body = {
      calificacion: state.calificacion || null,
      estado: state.estado || null,
      comentarioOpinion: comentario.value?.trim() || null,
    };
    try {
      btnGuardar.disabled = true;
      btnGuardarSiguiente.disabled = true;
      const r = await fetch(api(`/${state.current.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!r.ok) throw new Error('No se pudo guardar');
      if (avanzar) siguiente();
    } catch (e) {
      alert('Error al guardar. Revisa la consola.');
      console.error(e);
    } finally {
      btnGuardar.disabled = false;
      btnGuardarSiguiente.disabled = false;
    }
  }

  // Eventos
  btnVolver.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = indexUrl();
  });

  estrellas.addEventListener('click', (e) => {
    const el = e.target.closest('[data-star]');
    if (!el) return;
    state.calificacion = Number(el.dataset.star);
    pintarEstrellas(state.calificacion);
  });

  estadoBtns.forEach((b) => b.addEventListener('click', () => {
    state.estado = b.dataset.estado;
    seleccionarEstado(state.estado);
  }));

  btnOmitir.addEventListener('click', () => siguiente());
  btnGuardar.addEventListener('click', () => guardar(false));
  btnGuardarSiguiente.addEventListener('click', () => guardar(true));

  cargarPendientes();
})();
