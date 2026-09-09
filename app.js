const $ = (id) => document.getElementById(id);
const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
let topics = [], category = 'Todas', selected = null, current = 0, installPrompt;
const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
function renderGrid() {
  const query = normalize($('search').value.trim());
  const visible = topics.filter(t => (category === 'Todas' || t.domain === category) && normalize(t.title+' '+t.hook).includes(query));
  $('grid').replaceChildren(...visible.map(t => {
    const card = node('button', 'micro-card');
    card.style.setProperty('--micro-color',t.color);
    card.append(node('span','micro-card-number',String(topics.indexOf(t)+1).padStart(2,'0')), node('span','micro-card-domain',t.domain), node('strong','',t.title),node('span','micro-card-hook',t.hook),node('span','micro-card-footer',`${t.minutes} min · ${t.slides.length} fichas →`));
    card.addEventListener('click', () => openTopic(t));
    return card;
  }));
  if (!visible.length) $('grid').append(node('p','micro-empty','Sin resultados. Probá otra palabra.'));
  $('count').textContent = `${visible.length} distinciones para explorar`;
}
function updatePosition() {
  if (!selected) return;
  current = Math.max(0, Math.min(selected.slides.length-1,Math.round($('track').scrollLeft / ($('track').clientWidth || 1))));
  $('position').textContent = `${current+1}/${selected.slides.length}`;
  $('progress').style.width = `${100*(current+1)/selected.slides.length}%`;
  $('previous').disabled = current === 0;
  $('next').disabled = current === selected.slides.length-1;
}
function goTo(index, behavior = 'smooth') {
  $('track').scrollTo({left: index * $('track').clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : behavior});
}
function openTopic(topic) {
  selected = topic; current = 0;
  $('reel-title').textContent = topic.title;
  $('domain').textContent = topic.domain;
  document.querySelector('.reel-phone').style.setProperty('--micro-color',topic.color);
  $('track').replaceChildren(...topic.slides.map((slide,index) => {
    const wrapper = node('section','reel-slide');
    wrapper.setAttribute('aria-label', `Ficha ${index+1} de ${topic.slides.length}`);
    const article = node('article');
    article.append(node('p','',slide.kicker),node('h2','',slide.title),node('div','reel-rule'),node('div','reel-body',slide.body));
    if (index === topic.slides.length-1) {
      const next = node('button','reel-next-topic','Siguiente distinción →');
      next.onclick = () => openTopic(topics[(topics.indexOf(topic)+1)%topics.length]);
      article.append(next);
    }
    wrapper.append(article); return wrapper;
  }));
  if (!$('reel').open) $('reel').showModal();
  document.body.classList.add('micro-reel-open');
  goTo(0,'instant'); updatePosition(); $('close').focus();
}
$('search').addEventListener('input',renderGrid);
['Todas','Ontología','Lenguaje','Emoción','Cuerpo'].forEach(name => {
  const button = node('button',name === category ? 'is-active' : '',name);
  button.setAttribute('aria-pressed',String(name===category));
  button.onclick = () => {
    category=name;
    for (const b of $('filters').children) { b.classList.toggle('is-active',b===button); b.setAttribute('aria-pressed',String(b===button)); }
    renderGrid();
  };
  $('filters').append(button);
});
$('close').onclick = () => $('reel').close();
$('reel').addEventListener('close',() => document.body.classList.remove('micro-reel-open'));
$('reel').addEventListener('click',e => { if (e.target===$('reel')) $('reel').close(); });
$('previous').onclick=()=>goTo(current-1);
$('next').onclick=()=>goTo(current+1);
$('track').addEventListener('scroll',updatePosition,{passive:true});
$('reel').addEventListener('keydown', e => {
  if (e.key==='ArrowRight' || e.key==='ArrowLeft') { e.preventDefault(); goTo(Math.max(0,Math.min(selected.slides.length-1,current+(e.key==='ArrowRight'?1:-1)))); }
});
new ResizeObserver(()=> { if ($('reel').open) goTo(current,'instant'); }).observe($('track'));
window.addEventListener('beforeinstallprompt',e => { e.preventDefault(); installPrompt=e; });
$('install').onclick=async()=> {
  if (installPrompt) { await installPrompt.prompt(); installPrompt=null; }
  else $('install-help').showModal();
};
async function start() {
  try {
    const response=await fetch('./data.json');
    if(!response.ok) throw new Error('No se pudo cargar el contenido');
    topics=await response.json(); renderGrid();
    if ('serviceWorker' in navigator && window.isSecureContext) {
      try {
        await navigator.serviceWorker.register('./sw.js');
        await navigator.serviceWorker.ready;
        $('offline-status').textContent='Biblioteca disponible sin conexión en este dispositivo.';
      } catch { $('offline-status').textContent='Biblioteca online. La descarga sin conexión no está disponible en este navegador.'; }
    }
  } catch {
    $('grid').replaceChildren(node('p','micro-empty','No se pudo cargar la biblioteca. Revisá la conexión y recargá la página.'));
  }
}
start();
