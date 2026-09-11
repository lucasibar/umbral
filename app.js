const $ = (id) => document.getElementById(id);
const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
let topics = [], category = 'Todas', selected = null, current = 0, installPrompt;
let userReflections = new Map();

// --- INDEXEDDB HELPER FUNCTIONS ---
const DB_NAME = 'umbral-db';
const DB_VERSION = 1;
const STORE_NAME = 'reflections';
let dbPromise = null;

function getDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'slug' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
  return dbPromise;
}

async function loadAllReflections() {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        userReflections.clear();
        (req.result || []).forEach(item => {
          if (item.lenguaje || item.cuerpo || item.emocion) {
            userReflections.set(item.slug, item);
          }
        });
        resolve(userReflections);
      };
      req.onerror = () => resolve(userReflections);
    });
  } catch {
    return userReflections;
  }
}

async function getReflection(slug) {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(slug);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveReflection(slug, data) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const payload = {
        slug,
        lenguaje: data.lenguaje || '',
        cuerpo: data.cuerpo || '',
        emocion: data.emocion || '',
        updatedAt: new Date().toISOString()
      };
      const req = store.put(payload);
      req.onsuccess = () => {
        if (payload.lenguaje || payload.cuerpo || payload.emocion) {
          userReflections.set(slug, payload);
        } else {
          userReflections.delete(slug);
        }
        renderGrid(); // update badge on home cards
        resolve(true);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Error guardando en IndexedDB:', err);
    return false;
  }
}

const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

function renderGrid() {
  const query = normalize($('search').value.trim());
  const visible = topics.filter(t => (category === 'Todas' || t.domain === category) && normalize(t.title + ' ' + (t.officialTitle || '') + ' ' + t.hook).includes(query));
  $('grid').replaceChildren(...visible.map(t => {
    const card = node('button', 'micro-card');
    card.style.setProperty('--micro-color', t.color);
    
    const hasNote = userReflections.has(t.slug);
    const domainSpan = node('span', 'micro-card-domain', t.domain);
    if (hasNote) {
      const noteTag = node('span', 'micro-card-note-badge', ' 📝 Con tus notas');
      domainSpan.append(noteTag);
    }

    card.append(
      node('span', 'micro-card-number', String(topics.indexOf(t) + 1).padStart(2, '0')),
      domainSpan,
      node('strong', '', t.title),
      node('span', 'micro-card-hook', t.hook),
      node('span', 'micro-card-footer', `${t.minutes} min · ${t.slides.length} filminas →`)
    );
    card.addEventListener('click', () => openTopic(t));
    return card;
  }));
  if (!visible.length) $('grid').append(node('p', 'micro-empty', 'Sin resultados. Probá otra palabra.'));
  $('count').textContent = `${visible.length} distinciones para explorar`;
}

function updatePosition() {
  if (!selected) return;
  current = Math.max(0, Math.min(selected.slides.length - 1, Math.round($('track').scrollLeft / ($('track').clientWidth || 1))));
  $('position').textContent = `${current + 1}/${selected.slides.length}`;
  $('progress').style.width = `${100 * (current + 1) / selected.slides.length}%`;
  $('previous').disabled = current === 0;
  $('next').disabled = current === selected.slides.length - 1;
}

function goTo(index, behavior = 'smooth') {
  $('track').scrollTo({ left: index * $('track').clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : behavior });
}

function createReflectionSlide(slide, topic, index, totalSlides) {
  const wrapper = node('section', 'reel-slide reel-slide-reflection');
  wrapper.setAttribute('aria-label', `Ficha ${index + 1} de ${totalSlides}: Registro Ontológico`);
  
  const article = node('article');
  
  const statusSpan = node('span', 'reflection-status', '✓ Guardado localmente');
  const kickerContainer = node('div', 'reflection-header-row');
  kickerContainer.append(node('p', 'reel-slide-kicker', slide.kicker), statusSpan);

  article.append(
    kickerContainer,
    node('h2', '', slide.title),
    node('div', 'reel-rule'),
    node('p', 'reel-reflection-subtitle', slide.body)
  );

  const form = node('div', 'reel-reflection-form');
  
  // Field 1: Lenguaje
  const groupLenguaje = node('div', 'reflection-group');
  const labelLenguaje = node('label', 'reflection-label', '💬 Lenguaje');
  const textLenguaje = node('textarea', 'reflection-input reflection-textarea');
  textLenguaje.id = `reflection-lenguaje-${topic.slug}`;
  textLenguaje.name = 'reflection_lenguaje';
  textLenguaje.rows = 2;
  textLenguaje.placeholder = '¿Qué te decís a vos mismo, qué decís a otros o qué te dicen sobre esto?';
  groupLenguaje.append(labelLenguaje, textLenguaje);
  
  // Field 2: Cuerpo
  const groupCuerpo = node('div', 'reflection-group');
  const labelCuerpo = node('label', 'reflection-label', '🧘 Cuerpo');
  const textCuerpo = node('textarea', 'reflection-input reflection-textarea');
  textCuerpo.id = `reflection-cuerpo-${topic.slug}`;
  textCuerpo.name = 'reflection_cuerpo';
  textCuerpo.rows = 2;
  textCuerpo.placeholder = '¿Qué postura, tensión o sensación física registrás al pensar en esto?';
  groupCuerpo.append(labelCuerpo, textCuerpo);

  // Field 3: Emoción
  const groupEmocion = node('div', 'reflection-group');
  const labelEmocion = node('label', 'reflection-label', '❤️ Emoción');
  const textEmocion = node('textarea', 'reflection-input reflection-textarea');
  textEmocion.id = `reflection-emocion-${topic.slug}`;
  textEmocion.name = 'reflection_emocion';
  textEmocion.rows = 2;
  textEmocion.placeholder = '¿Qué emoción o estado de ánimo identificás que surge?';
  groupEmocion.append(labelEmocion, textEmocion);

  form.append(groupLenguaje, groupCuerpo, groupEmocion);
  article.append(form);

  // Load existing reflection from IndexedDB
  getReflection(topic.slug).then(savedData => {
    if (savedData) {
      if (savedData.lenguaje) textLenguaje.value = savedData.lenguaje;
      if (savedData.cuerpo) textCuerpo.value = savedData.cuerpo;
      if (savedData.emocion) textEmocion.value = savedData.emocion;
      statusSpan.textContent = '✓ Guardado localmente';
    } else {
      statusSpan.textContent = 'Sin notas guardadas';
    }
  });

  // Auto-save debounced handler
  let saveTimer = null;
  const triggerSave = () => {
    statusSpan.textContent = 'Guardando...';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const ok = await saveReflection(topic.slug, {
        lenguaje: textLenguaje.value.trim(),
        cuerpo: textCuerpo.value.trim(),
        emocion: textEmocion.value.trim()
      });
      if (ok) {
        statusSpan.textContent = (textLenguaje.value.trim() || textCuerpo.value.trim() || textEmocion.value.trim()) 
          ? '✓ Guardado sin conexión' 
          : 'Sin notas guardadas';
      }
    }, 400);
  };

  textLenguaje.addEventListener('input', triggerSave);
  textCuerpo.addEventListener('input', triggerSave);
  textEmocion.addEventListener('input', triggerSave);

  const nextBtn = node('button', 'reel-next-topic', 'Siguiente distinción →');
  nextBtn.onclick = () => openTopic(topics[(topics.indexOf(topic) + 1) % topics.length]);
  article.append(nextBtn);

  wrapper.append(article);
  return wrapper;
}

function openTopic(topic) {
  selected = topic; current = 0;
  $('reel-title').textContent = topic.title;
  if ($('official-title')) $('official-title').textContent = topic.officialTitle || '';
  $('domain').textContent = topic.domain;
  document.querySelector('.reel-phone').style.setProperty('--micro-color', topic.color);
  
  $('track').replaceChildren(...topic.slides.map((slide, index) => {
    if (slide.type === 'reflection') {
      return createReflectionSlide(slide, topic, index, topic.slides.length);
    }
    const wrapper = node('section', 'reel-slide');
    wrapper.setAttribute('aria-label', `Ficha ${index + 1} de ${topic.slides.length}`);
    const article = node('article');
    article.append(
      node('p', '', slide.kicker),
      node('h2', '', slide.title),
      node('div', 'reel-rule')
    );
    const bodyDiv = node('div', 'reel-body');
    bodyDiv.innerHTML = slide.body;
    article.append(bodyDiv);

    if (index === topic.slides.length - 1) {
      const next = node('button', 'reel-next-topic', 'Siguiente distinción →');
      next.onclick = () => openTopic(topics[(topics.indexOf(topic) + 1) % topics.length]);
      article.append(next);
    }
    wrapper.append(article);
    return wrapper;
  }));

  if (!$('reel').open) $('reel').showModal();
  document.body.classList.add('micro-reel-open');
  goTo(0, 'instant'); updatePosition(); $('close').focus();
}

$('search').addEventListener('input', renderGrid);
['Todas', 'Ontología', 'Lenguaje', 'Emoción', 'Cuerpo'].forEach(name => {
  const button = node('button', name === category ? 'is-active' : '', name);
  button.setAttribute('aria-pressed', String(name === category));
  button.onclick = () => {
    category = name;
    for (const b of $('filters').children) { b.classList.toggle('is-active', b === button); b.setAttribute('aria-pressed', String(b === button)); }
    renderGrid();
  };
  $('filters').append(button);
});

$('close').onclick = () => $('reel').close();
$('reel').addEventListener('close', () => document.body.classList.remove('micro-reel-open'));
$('reel').addEventListener('click', e => { if (e.target === $('reel')) $('reel').close(); });
$('previous').onclick = () => goTo(current - 1);
$('next').onclick = () => goTo(current + 1);
$('track').addEventListener('scroll', updatePosition, { passive: true });

$('reel').addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault();
    goTo(Math.max(0, Math.min(selected.slides.length - 1, current + (e.key === 'ArrowRight' ? 1 : -1))));
  }
});

new ResizeObserver(() => { if ($('reel').open) goTo(current, 'instant'); }).observe($('track'));
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });
$('install').onclick = async () => {
  if (installPrompt) { await installPrompt.prompt(); installPrompt = null; }
  else $('install-help').showModal();
};

async function start() {
  try {
    const response = await fetch('./data.json');
    if (!response.ok) throw new Error('No se pudo cargar el contenido');
    topics = await response.json();
    await loadAllReflections(); // Load user notes from IndexedDB
    renderGrid();
    if ('serviceWorker' in navigator && window.isSecureContext) {
      try {
        await navigator.serviceWorker.register('./sw.js');
        await navigator.serviceWorker.ready;
        $('offline-status').textContent = 'Biblioteca disponible sin conexión en este dispositivo.';
      } catch { $('offline-status').textContent = 'Biblioteca online. La descarga sin conexión no está disponible en este navegador.'; }
    }
  } catch {
    $('grid').replaceChildren(node('p', 'micro-empty', 'No se pudo cargar la biblioteca. Revisá la conexión y recargá la página.'));
  }
}
start();
