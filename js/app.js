(() => {
  'use strict';
  const data = window.SUVOROV_PLACES;
  if (!data || !Array.isArray(data.cities)) return;
  const geography = window.SUVOROV_GEOGRAPHY || { roads: [], rivers: [] };
  const panel = document.getElementById('place-panel');
  const picker = document.getElementById('city-picker');
  const map = document.getElementById('map');
  const mapPlaces = document.getElementById('map-places');
  const svg = document.getElementById('geography');
  const status = document.getElementById('live-status');
  let selectedCity = null;
  let selectedItem = null;

  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const category = id => `<span class="category-chip ${id}">${escape(data.categories[id].name)}</span>`;
  const external = (url, text, css = '') => `<a ${css ? `class="${css}"` : ''} href="${escape(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  const linkSource = id => { const source = data.sources[id]; return external(source.url, escape(source.title)); };
  const countText = number => number === 1 ? '1 объект' : `${number} объекта`;
  const cityNotes = {
    vladimir: 'Архив и электронная выставка',
    kistysh: 'Храм, музей и памятник',
    lakinsk: 'Казанская церковь и роща',
    menchakovo: 'Историческое владение'
  };

  function announce(text) { status.textContent = text; }
  function updatePressed() {
    document.querySelectorAll('[data-city]').forEach(button => button.setAttribute('aria-pressed', button.dataset.city === selectedCity?.id ? 'true' : 'false'));
  }
  function updateHash() {
    const value = selectedCity ? `${selectedCity.id}${selectedItem ? '/' + selectedItem.id : ''}` : '';
    if (location.hash.slice(1) !== value) history.replaceState(null, '', `${location.pathname}${location.search}${value ? '#' + value : ''}`);
  }
  function focusPanel() {
    const heading = panel.querySelector('h2');
    if (heading) heading.focus({ preventScroll: true });
    if (matchMedia('(max-width:780px)').matches) panel.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    else panel.scrollTop = 0;
  }
  function renderWelcome() {
    selectedCity = null; selectedItem = null;
    panel.innerHTML = `<div class="panel-inner welcome"><h2 tabindex="-1">Места на карте</h2><p class="panel-description">Выберите населённый пункт на карте или в списке. Здесь можно узнать, что посмотреть и как эти места связаны с Суворовым.</p><div class="welcome-list">${data.cities.map(city => `<button type="button" class="welcome-place" data-welcome-city="${escape(city.id)}" aria-label="${escape(city.name)}: ${countText(city.items.length)}"><span class="welcome-place-title">${escape(city.name)}</span><span class="welcome-place-note">${escape(cityNotes[city.id] || city.intro)}</span><span class="welcome-count">${countText(city.items.length)}</span></button>`).join('')}</div><p class="panel-tip">В описании каждого объекта есть адрес или ориентир, сведения о посещении и ссылки на источники.</p></div>`;
    panel.querySelectorAll('[data-welcome-city]').forEach(button => button.addEventListener('click', () => selectCity(button.dataset.welcomeCity, true)));
    updatePressed(); announce('Выберите населённый пункт на карте или в списке.');
  }
  function selectCity(id, moveFocus = false, writeHash = true) {
    const city = data.cities.find(value => value.id === id);
    if (!city) return;
    selectedCity = city; selectedItem = null;
    panel.innerHTML = `<div class="panel-inner"><h2 tabindex="-1">${escape(city.name)}</h2><p class="panel-description">${escape(city.intro)}</p><div class="objects-heading">Что здесь посмотреть<span>${countText(city.items.length)}</span></div><div class="object-list">${city.items.map(item => `<button type="button" class="object-button" data-object="${escape(item.id)}" aria-label="Открыть: ${escape(item.title)}"><strong>${escape(item.shortTitle)}</strong>${category(item.category)}<p>${escape(item.teaser)}</p></button>`).join('')}</div><p class="city-note">${escape(city.connection)}. ${city.id === 'menchakovo' ? 'Сведения о владении селом сохранились в архивных документах.' : 'Нажмите на название объекта, чтобы прочитать о нём подробнее.'}</p></div>`;
    panel.querySelectorAll('[data-object]').forEach(button => button.addEventListener('click', () => selectItem(button.dataset.object, true)));
    panel.scrollTop = 0; updatePressed();
    if (writeHash) updateHash();
    announce(`${city.name}. Доступно: ${countText(city.items.length)}.`);
    if (moveFocus) focusPanel();
  }
  function selectItem(id, moveFocus = false, writeHash = true) {
    if (!selectedCity) return;
    const item = selectedCity.items.find(value => value.id === id);
    if (!item) return;
    selectedItem = item;
    const source = data.sources[item.primary.source];
    panel.innerHTML = `<article class="panel-inner object-detail"><button type="button" class="back-button" id="back-to-objects"><span aria-hidden="true">←</span>Все объекты: ${escape(selectedCity.name)}</button><h2 tabindex="-1">${escape(item.title)}</h2>${category(item.category)}<p class="object-intro">${escape(item.what)}</p><section class="detail-section"><h3>Как связан с Суворовым</h3><p>${escape(item.connection)}</p></section><section class="detail-section"><h3>Что можно увидеть</h3><ul>${item.see.map(text => `<li>${escape(text)}</li>`).join('')}</ul></section><section class="location-box"><h3>Адрес и посещение</h3><p class="address">${escape(item.address)}</p><p>${escape(item.access)}</p>${item.contact ? `<p>${escape(item.contact)}</p>` : ''}</section>${external(source.url, escape(item.primary.label), 'primary-link')}<details class="object-sources"><summary>Источники сведений об объекте</summary><ul>${item.sources.map(id => `<li>${linkSource(id)}</li>`).join('')}</ul></details></article>`;
    document.getElementById('back-to-objects').addEventListener('click', () => selectCity(selectedCity.id, true));
    panel.scrollTop = 0;
    if (writeHash) updateHash();
    announce(`Открыта карточка: ${item.title}.`);
    if (moveFocus) focusPanel();
  }
  function readHash() {
    let hash;
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!hash) { renderWelcome(); return; }
    if (hash === 'about' || hash === 'all-sources' || hash === 'place-panel') return;
    const [city, item] = hash.split('/');
    if (!data.cities.some(value => value.id === city)) return;
    selectCity(city, false, false);
    if (item) selectItem(item, false, false);
  }

  data.cities.forEach(city => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'city-button'; button.dataset.city = city.id;
    button.textContent = city.name; button.setAttribute('aria-controls', 'place-panel'); button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => selectCity(city.id, matchMedia('(max-width:780px)').matches));
    picker.append(button);
    const marker = document.createElement('button');
    marker.type = 'button'; marker.className = `map-place${city.id === 'kistysh' ? ' is-left' : ''}`; marker.dataset.city = city.id;
    marker.setAttribute('aria-label', `${city.name}. Показать объекты`); marker.setAttribute('aria-controls', 'place-panel'); marker.setAttribute('aria-pressed', 'false');
    marker.innerHTML = `<span class="pin" aria-hidden="true"></span><span class="place-label">${escape(city.mapName)}</span>`;
    marker.addEventListener('click', () => selectCity(city.id, matchMedia('(max-width:780px)').matches));
    mapPlaces.append(marker);
  });

  const ns = 'http://www.w3.org/2000/svg';
  function node(name, attributes, text) {
    const element = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attributes || {})) element.setAttribute(key, value);
    if (text !== undefined) element.textContent = text;
    return element;
  }
  const mercator = latitude => Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360));
  function drawMap() {
    const width = map.clientWidth, height = map.clientHeight;
    if (width < 1 || height < 1) return;
    const narrow = width < 500;
    const west = 39.77, east = 40.70, south = 55.94, north = 56.57;
    const x1 = west * Math.PI / 180, x2 = east * Math.PI / 180;
    const y1 = mercator(south), y2 = mercator(north);
    const left = narrow ? 27 : 45, right = narrow ? 90 : 84, top = 42, bottom = 42;
    const scale = Math.min((width - left - right) / (x2 - x1), (height - top - bottom) / (y2 - y1));
    const cx = left + (width - left - right) / 2, cy = top + (height - top - bottom) / 2;
    const project = coordinates => [cx + (coordinates[0] * Math.PI / 180 - (x1 + x2) / 2) * scale, cy - (mercator(coordinates[1]) - (y1 + y2) / 2) * scale];
    const linePath = coordinates => coordinates.map((point, i) => { const [x, y] = project(point); return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`; }).join(' ');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.querySelectorAll('g').forEach(group => group.remove());
    const grid = node('g', {fill:'none', stroke:'#e1e5e3', 'stroke-width':'.65'});
    for (const longitude of [39.8,40.0,40.2,40.4,40.6]) grid.append(node('path', {d:linePath([[longitude,55.95],[longitude,56.56]])}));
    for (const latitude of [56.0,56.2,56.4]) grid.append(node('path', {d:linePath([[39.78,latitude],[40.68,latitude]])}));
    svg.append(grid);
    const roads = node('g', {fill:'none','stroke-linecap':'round','stroke-linejoin':'round'});
    for (const coordinates of geography.roads) roads.append(node('path', {d:linePath(coordinates),stroke:'#fff','stroke-width':'5'}));
    for (const coordinates of geography.roads) roads.append(node('path', {d:linePath(coordinates),stroke:'#b6bab8','stroke-width':'1.8'}));
    svg.append(roads);
    const rivers = node('g', {fill:'none',stroke:'#84b6cd','stroke-width':'1.5','stroke-linejoin':'round','stroke-linecap':'round'});
    for (const river of geography.rivers) rivers.append(node('path', {d:linePath(river.coordinates)}));
    svg.append(rivers);
    const labels = node('g', {fill:'#687371','font-family':'Arial, sans-serif','font-size':narrow ? '10' : '11'});
    for (const town of [{name:'Суздаль',lon:40.448757,lat:56.419333,dx:7,dy:4},{name:'Ставрово',lon:40.013604,lat:56.133226,dx:-7,dy:-8}]) {
      const [x,y] = project([town.lon,town.lat]);
      labels.append(node('circle',{cx:x,cy:y,r:2.2,fill:'#687371'}));
      labels.append(node('text',{x:x+town.dx,y:y+town.dy,'text-anchor':town.dx<0?'end':'start','paint-order':'stroke',stroke:'#f2f4f2','stroke-width':'3'},town.name));
    }
    svg.append(labels);
    for (const city of data.cities) {
      const [x,y] = project([city.lon,city.lat]);
      const marker = mapPlaces.querySelector(`[data-city="${city.id}"]`);
      marker.style.left = `${x}px`; marker.style.top = `${y}px`;
    }
    const kilometers = 10 / (111.32 * Math.cos(56.25 * Math.PI / 180));
    const pixels = scale * kilometers * Math.PI / 180;
    document.getElementById('map-scale').innerHTML = `<i style="width:${pixels.toFixed(1)}px" aria-hidden="true"></i><span>10 км</span>`;
  }

  document.getElementById('source-grid').innerHTML = Object.entries(data.sources).map(([id, source]) => `<article class="source-entry">${external(source.url, escape(source.title))}<p>${escape(source.note)}</p></article>`).join('');
  document.querySelectorAll('.header-nav a').forEach(link => link.addEventListener('click', () => { const target = document.querySelector(link.getAttribute('href')); if (target instanceof HTMLDetailsElement) target.open = true; }));
  document.querySelector('.wordmark').addEventListener('click', event => {event.preventDefault(); renderWelcome(); updateHash();});
  window.addEventListener('hashchange', readHash);
  if ('ResizeObserver' in window) new ResizeObserver(drawMap).observe(map);
  else window.addEventListener('resize', drawMap);
  window.addEventListener('beforeprint', drawMap);
  window.addEventListener('afterprint', drawMap);
  renderWelcome(); readHash(); drawMap();
})();
