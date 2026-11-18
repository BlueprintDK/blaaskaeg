/* Blå skæg – Sæt knappenålen for 2-4 spillere.
 * Alle får samme sted og sætter en nål på deres eget kort. Når alle har bekræftet, vises afstandene:
 * tættest +3, nr. 2 +2, nr. 3 +1. 8 steder pr. spil. Kort: Danmark, Europa eller Verden.
 * Kortdata: Natural Earth (world-atlas) via jsDelivr – hentes første gang, spillet åbnes. */
(function () {
  const { esc, rnd, bland } = BS;
  const STEDER = {
    dk: { navn: 'Danmark', box: [7.9, 54.5, 15.3, 57.85], l: [
      ['København', 55.676, 12.568], ['Aarhus', 56.157, 10.211], ['Odense', 55.403, 10.402], ['Aalborg', 57.048, 9.919], ['Esbjerg', 55.476, 8.459],
      ['Randers', 56.460, 10.036], ['Kolding', 55.490, 9.472], ['Horsens', 55.861, 9.850], ['Vejle', 55.709, 9.536], ['Roskilde', 55.642, 12.080],
      ['Herning', 56.136, 8.976], ['Silkeborg', 56.170, 9.545], ['Næstved', 55.230, 11.761], ['Fredericia', 55.566, 9.753], ['Viborg', 56.453, 9.402],
      ['Køge', 55.458, 12.182], ['Holstebro', 56.360, 8.616], ['Slagelse', 55.403, 11.354], ['Hillerød', 55.927, 12.300], ['Sønderborg', 54.914, 9.792],
      ['Svendborg', 55.060, 10.607], ['Hjørring', 57.464, 9.982], ['Holbæk', 55.717, 11.713], ['Frederikshavn', 57.441, 10.537], ['Haderslev', 55.250, 9.488],
      ['Skive', 56.567, 9.027], ['Nykøbing Falster', 54.769, 11.874], ['Thisted', 56.958, 8.694], ['Ribe', 55.328, 8.762], ['Skagen', 57.720, 10.583],
      ['Rønne', 55.100, 14.700], ['Grenaa', 56.416, 10.878], ['Ebeltoft', 56.195, 10.682], ['Tønder', 54.933, 8.864], ['Aabenraa', 55.044, 9.418],
      ['Nakskov', 54.831, 11.135], ['Kalundborg', 55.680, 11.089], ['Middelfart', 55.506, 9.731], ['Nyborg', 55.312, 10.790], ['Faaborg', 55.095, 10.242],
      ['Lemvig', 56.548, 8.310], ['Ringkøbing', 56.090, 8.244], ['Varde', 55.620, 8.481], ['Billund', 55.730, 9.110], ['Helsingør', 56.036, 12.611],
      ['Struer', 56.491, 8.594], ['Hobro', 56.639, 9.790], ['Løkken', 57.370, 9.714], ['Marstal', 54.855, 10.517], ['Hvide Sande', 56.003, 8.129]] },
    eu: { navn: 'Europa', box: [-25, 34, 42, 71.5], l: [
      ['Paris', 48.857, 2.352], ['London', 51.507, -0.128], ['Berlin', 52.520, 13.405], ['Madrid', 40.417, -3.704], ['Rom', 41.903, 12.496],
      ['Wien', 48.208, 16.374], ['Prag', 50.075, 14.438], ['Warszawa', 52.230, 21.012], ['Budapest', 47.498, 19.040], ['Oslo', 59.914, 10.752],
      ['Stockholm', 59.329, 18.069], ['Helsinki', 60.170, 24.938], ['Reykjavik', 64.146, -21.942], ['Dublin', 53.350, -6.260], ['Amsterdam', 52.368, 4.904],
      ['Bruxelles', 50.850, 4.352], ['Lissabon', 38.722, -9.139], ['Athen', 37.984, 23.728], ['Bern', 46.948, 7.447], ['Bukarest', 44.427, 26.103],
      ['Sofia', 42.698, 23.322], ['Beograd', 44.787, 20.457], ['Zagreb', 45.815, 15.982], ['Kyiv', 50.450, 30.523], ['Vilnius', 54.687, 25.280],
      ['Riga', 56.950, 24.105], ['Tallinn', 59.437, 24.754], ['Barcelona', 41.385, 2.173], ['Milano', 45.464, 9.190], ['München', 48.135, 11.582],
      ['Hamborg', 53.551, 9.993], ['Venedig', 45.441, 12.316], ['Napoli', 40.852, 14.268], ['Kraków', 50.065, 19.945], ['Edinburgh', 55.953, -3.188],
      ['Marseille', 43.296, 5.370], ['Sevilla', 37.389, -5.984], ['Bergen', 60.392, 5.322], ['Göteborg', 57.709, 11.975], ['Istanbul', 41.008, 28.978],
      ['Valletta', 35.899, 14.514], ['Monaco', 43.738, 7.424], ['Tromsø', 69.649, 18.956], ['Porto', 41.158, -8.629], ['Dubrovnik', 42.651, 18.094]] },
    ver: { navn: 'Verden', box: [-180, -58, 180, 80], l: [
      ['New York', 40.713, -74.006], ['Los Angeles', 34.052, -118.244], ['Rio de Janeiro', -22.907, -43.173], ['Buenos Aires', -34.604, -58.382],
      ['Mexico City', 19.433, -99.133], ['Toronto', 43.653, -79.383], ['Tokyo', 35.676, 139.650], ['Beijing', 39.904, 116.407], ['Sydney', -33.869, 151.209],
      ['Kairo', 30.044, 31.236], ['Cape Town', -33.925, 18.424], ['Nairobi', -1.292, 36.822], ['Mumbai', 19.076, 72.878], ['New Delhi', 28.614, 77.209],
      ['Bangkok', 13.756, 100.502], ['Singapore', 1.352, 103.820], ['Dubai', 25.205, 55.271], ['Moskva', 55.756, 37.617], ['Lima', -12.046, -77.043],
      ['Santiago de Chile', -33.449, -70.669], ['Honolulu', 21.307, -157.858], ['Anchorage', 61.218, -149.900], ['Nuuk', 64.181, -51.694], ['Seoul', 37.567, 126.978],
      ['Jakarta', -6.208, 106.846], ['Manila', 14.600, 120.984], ['Auckland', -36.848, 174.763], ['Perth', -31.951, 115.861], ['Lagos', 6.524, 3.379],
      ['Marrakech', 31.629, -7.982], ['Havana', 23.113, -82.366], ['Bogotá', 4.711, -74.072], ['Chicago', 41.878, -87.630], ['Vancouver', 49.283, -123.121],
      ['Teheran', 35.689, 51.389], ['Hong Kong', 22.320, 114.169], ['Shanghai', 31.230, 121.474], ['Addis Abeba', 9.030, 38.740], ['Antananarivo', -18.879, 47.508],
      ['Ulaanbaatar', 47.886, 106.906], ['Kathmandu', 27.717, 85.324], ['Reykjavik', 64.146, -21.942], ['København', 55.676, 12.568], ['Istanbul', 41.008, 28.978]] },
  };
  const RUNDER = 8;
  const km = (a, b) => { const R = 6371, r = x => x * Math.PI / 180, dLa = r(b[0] - a[0]), dLo = r(b[1] - a[1]);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

  function nyRunde(G) {
    G.nr++; const s = G.kø.pop(); Object.assign(G, { sted: s[0], rigtig: [s[1], s[2]], pins: {}, afsl: false, km: {}, pt: {} });
  }
  function afslør(H, G) {
    if (G.afsl) return; G.afsl = true;
    Object.entries(G.pins).forEach(([e, p]) => { G.km[e] = Math.round(km(p, G.rigtig)); });
    const rang = Object.keys(G.km).sort((a, b) => G.km[a] - G.km[b]);
    let plads = 0, sidstKm = -1, pts = [3, 2, 1];
    rang.forEach((e, i) => { if (G.km[e] !== sidstKm) plads = i; sidstKm = G.km[e]; const p = pts[plads] || 0; G.pt[e] = p; G.sum[e] = (G.sum[e] || 0) + p; if (p) H.giv(e, p); });
    if (G.nr >= RUNDER) { const top = Math.max(...Object.values(G.sum).concat([0])); G.slut = { vindere: Object.keys(G.sum).filter(e => G.sum[e] === top) }; }
  }
  const alleSvaret = (H, G) => H.spillere().every(p => G.pins[p.enhed]);

  BS.registrer({
    id: 'knappenaal', navn: 'Sæt knappenålen', e: '📍', min: 1, max: 4,
    d: 'Hvor ligger stedet? Sæt nålen på kortet – tættest vinder.',
    valg: { navn: 'kort', liste: [['dk', '🇩🇰 Danmark'], ['eu', '🇪🇺 Europa'], ['ver', '🌍 Verden']] },
    start(H, opt) { const k = STEDER[opt.kort] ? opt.kort : 'dk'; const G = { kort: k, nr: 0, kø: bland(STEDER[k].l.slice()), sum: {}, slut: null }; nyRunde(G); return G; },
    kald(H, G, e, d) {
      if (d.næste) { if (G.afsl && !G.slut) nyRunde(G); return; }
      if (d.vis) { afslør(H, G); return; }
      if (d.pin && !G.afsl && !G.pins[e]) {
        const la = +d.pin[0], lo = +d.pin[1]; if (!(la >= -90 && la <= 90 && lo >= -180 && lo <= 180)) return;
        G.pins[e] = [la, lo]; if (alleSvaret(H, G)) afslør(H, G);
      }
    },
    frakoblet(H, G) { if (!G.afsl && alleSvaret(H, G)) afslør(H, G); },
    skiftEnhed(H, G, gl, ny) { ['pins', 'km', 'pt', 'sum'].forEach(k => { if (G[k] && gl in G[k]) { G[k][ny] = G[k][gl]; delete G[k][gl]; } }); },
    view(H, G, e) {
      const v = { kort: G.kort, nr: G.nr, total: RUNDER, sted: G.sted, svaret: Object.keys(G.pins), min: G.pins[e] || null, afsl: G.afsl, sum: G.sum, slut: G.slut };
      if (G.afsl) Object.assign(v, { rigtig: G.rigtig, pins: G.pins, km: G.km, pt: G.pt });
      return v;
    },
    tegn(el, v, api) {
      const K = STEDER[v.kort];
      if (!el.querySelector('#kn-kort') || el._kort !== v.kort) {
        el._kort = v.kort;
        el.innerHTML = '<div id="kn-top"></div><canvas id="kn-kort" style="width:100%;border-radius:14px;background:#0f2a5a"></canvas><div id="kn-bund"></div>';
        const cv = el.querySelector('#kn-kort');
        cv.addEventListener('pointerdown', ev => {
          const s = el._v; if (!s || s.afsl || s.min) return;
          const r = cv.getBoundingClientRect(); el._kladde = proj.inv(K, cv, (ev.clientX - r.left) / r.width * cv.width, (ev.clientY - r.top) / r.height * cv.height);
          api.lyd.klik(); tegnKort(el, s, api); tegnBund(el, s, api);
        });
        hentLand().then(() => { if (el._v) tegnKort(el, el._v, api); });
      }
      if (el._nr !== v.nr) { el._nr = v.nr; el._kladde = null; }
      el._v = v;
      const sig = JSON.stringify(v);
      if (el._sig === sig) return; el._sig = sig;
      const svaret = v.svaret.length, n = api.spillere.filter(p => p.online).length;
      el.querySelector('#kn-top').innerHTML = '<p class="hint center" style="margin:0">' + esc(K.navn) + ' · sted ' + v.nr + ' af ' + v.total + '</p>'
        + '<div class="banner' + (!v.afsl && !v.min ? ' min' : '') + '" style="font-size:22px">📍 Hvor ligger ' + esc(v.sted) + '?</div>';
      tegnKort(el, v, api); tegnBund(el, v, api, svaret, n);
      if (v.afsl && el._lyd !== v.nr) { el._lyd = v.nr; (v.pt && v.pt[api.mig] === 3) ? api.lyd.vind() : api.lyd.ok(); }
    },
  });

  function tegnBund(el, v, api, svaret, n) {
    svaret = svaret == null ? v.svaret.length : svaret; n = n || api.spillere.filter(p => p.online).length;
    let h = '';
    if (!v.afsl) {
      if (v.min) h += '<p class="hint center">✅ Nål sat · ' + svaret + ' af ' + n + ' er klar</p>';
      else h += '<p class="hint center">Tryk på kortet for at sætte din nål' + (el._kladde ? ' – tryk igen for at flytte den' : '') + '</p>'
        + '<button class="btn big ok" id="kn-ok"' + (el._kladde ? '' : ' disabled') + '>📍 Sæt nålen her</button>';
      if (api.vært) h += '<div class="hostbar"><button class="btn gh" id="kn-vis">Vis svaret nu</button></div>';
    } else {
      const rk = Object.keys(v.km).sort((a, b) => v.km[a] - v.km[b]);
      h += '<div style="margin-top:10px">' + rk.map((e, i) => '<div class="chip' + (e === api.mig ? ' mig' : '') + '" style="display:flex;margin:6px 0"><i style="background:' + api.farve(e) + '"></i>'
        + (i + 1) + '. ' + esc(api.navn(e)) + '<span style="margin-left:auto">' + v.km[e].toLocaleString('da-DK') + ' km' + (v.pt[e] ? ' · +' + v.pt[e] : '') + '</span></div>').join('') + '</div>';
      if (v.slut) h += '<div class="banner min">🏆 ' + v.slut.vindere.map(e => esc(api.navn(e))).join(' og ') + ' vandt kortspillet!</div>';
      else if (api.vært) h += '<div class="hostbar"><button class="btn ok big" id="kn-næste">Næste sted →</button></div>';
      else h += '<p class="hint center">Venter på næste sted…</p>';
    }
    el.querySelector('#kn-bund').innerHTML = h;
    const q = s => el.querySelector(s);
    if (q('#kn-ok')) q('#kn-ok').onclick = () => { if (el._kladde) api.kald({ pin: el._kladde }); };
    if (q('#kn-vis')) q('#kn-vis').onclick = () => api.kald({ vis: 1 });
    if (q('#kn-næste')) q('#kn-næste').onclick = () => api.kald({ næste: 1 });
  }

  /* ---------- kort ---------- */
  const proj = {
    k(K) { const [x0, y0, x1, y1] = K.box; const midt = (y0 + y1) / 2; return { x0, y0, x1, y1, kx: K === STEDER.ver ? 1 : Math.cos(midt * Math.PI / 180) }; },
    størrelse(K, bredde) { const p = this.k(K); const w = (p.x1 - p.x0) * p.kx, h = p.y1 - p.y0; return [bredde, Math.round(bredde * h / w)]; },
    til(K, cv, la, lo) { const p = this.k(K); return [(lo - p.x0) / (p.x1 - p.x0) * cv.width, (p.y1 - la) / (p.y1 - p.y0) * cv.height]; },
    inv(K, cv, x, y) { const p = this.k(K); return [+(p.y1 - y / cv.height * (p.y1 - p.y0)).toFixed(4), +(p.x0 + x / cv.width * (p.x1 - p.x0)).toFixed(4)]; },
  };
  let LAND = null, henter = null;
  function hentScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function hentLand() {
    if (LAND) return Promise.resolve(LAND);
    if (!henter) henter = (window.topojson ? Promise.resolve() : hentScript('https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js'))
      .then(() => fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-50m.json')).then(r => r.json())
      .then(t => { LAND = window.topojson.feature(t, t.objects.land); return LAND; })
      .catch(e => { henter = null; BS.toast('Kortet kunne ikke hentes – tjek internettet'); throw e; });
    return henter;
  }
  function tegnKort(el, v, api) {
    const K = STEDER[v.kort], cv = el.querySelector('#kn-kort');
    const bredde = Math.min(1200, Math.round(cv.clientWidth * (window.devicePixelRatio || 1)) || 700);
    const [w, h] = proj.størrelse(K, bredde); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const c = cv.getContext('2d'), sk = w / 700;
    c.fillStyle = '#0f2a5a'; c.fillRect(0, 0, w, h);
    if (LAND) {
      c.fillStyle = '#e8dcc0'; c.strokeStyle = '#b8a77f'; c.lineWidth = 1 * sk; c.beginPath();
      const ring = r => { r.forEach(([lo, la], i) => { const [x, y] = proj.til(K, cv, la, lo); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); };
      LAND.features.forEach(f => { const g = f.geometry; (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).forEach(poly => poly.forEach(ring)); });
      c.fill('evenodd'); c.stroke();
    } else { c.fillStyle = '#9fb0d6'; c.font = (20 * sk) + 'px sans-serif'; c.textAlign = 'center'; c.fillText(BS.t('Henter kort…'), w / 2, h / 2); }
    const nål = (la, lo, farve, stor) => {
      const [x, y] = proj.til(K, cv, la, lo), r = (stor ? 11 : 8) * sk;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - r * .7, y - r * 1.6); c.arc(x, y - r * 1.9, r, Math.PI * .8, Math.PI * 2.2); c.closePath();
      c.fillStyle = farve; c.fill(); c.lineWidth = 2 * sk; c.strokeStyle = '#0b1630'; c.stroke();
      c.beginPath(); c.arc(x, y - r * 1.9, r * .35, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
    };
    if (v.afsl) {
      const [rx, ry] = proj.til(K, cv, v.rigtig[0], v.rigtig[1]);
      Object.entries(v.pins).forEach(([e, p]) => { const [x, y] = proj.til(K, cv, p[0], p[1]); c.setLineDash([6 * sk, 5 * sk]); c.strokeStyle = api.farve(e); c.lineWidth = 2.5 * sk; c.beginPath(); c.moveTo(x, y); c.lineTo(rx, ry); c.stroke(); c.setLineDash([]); });
      Object.entries(v.pins).forEach(([e, p]) => nål(p[0], p[1], api.farve(e)));
      c.beginPath(); c.arc(rx, ry, 9 * sk, 0, Math.PI * 2); c.fillStyle = '#ffd166'; c.fill(); c.lineWidth = 3 * sk; c.strokeStyle = '#0b1630'; c.stroke();
      c.font = 'bold ' + (18 * sk) + 'px sans-serif'; c.fillStyle = '#0b1630'; c.textAlign = 'center'; c.fillText(BS.t(v.sted), rx, ry - 16 * sk);
    } else {
      const p = v.min || el._kladde; if (p) nål(p[0], p[1], api.farve(api.mig), true);
    }
  }
})();
