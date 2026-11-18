/* Blå skæg – Tegn og gæt for 2-4 spillere.
 * På skift vælger én et af tre ord og tegner det på sin telefon. Stregerne vises live hos de andre, som skriver gæt.
 * 1. rigtige gæt +3, 2. +2, resten +1. Tegneren får +1 for hver, der gætter. 80 sek. pr. tegning, alle tegner 2 gange. */
(function () {
  const { esc, rnd, bland } = BS;
  const ORD = ('hund kat hest ko gris får høne and fisk haj hval delfin elefant giraf løve tiger zebra abe slange frø skildpadde sommerfugl edderkop bi myre snegl ugle pingvin '
    + 'hus slot kirke fyrtårn bro tog bil bus cykel motorcykel fly helikopter båd ubåd raket traktor ambulance '
    + 'sol måne stjerne sky regn sne lyn regnbue træ blomst kaktus palme svampe bjerg vulkan ø strand bølge '
    + 'æble banan pære jordbær gulerod pizza burger is kage pandekage pølse æg ost brød kop gaffel '
    + 'stol bord seng lampe ur telefon computer fjernsyn guitar trommer klaver bog blyant saks paraply briller hat sko sok handske nøgle lås '
    + 'fodbold tennis ski skøjter drage ballon gave juletræ snemand spøgelse robot pirat konge prinsesse trold dinosaur drage-flyver '
    + 'hjerte smil tand øje næse øre hånd fod skæg tandbørste toilet badekar brusebad køleskab komfur grill telt bål kompas skattekiste').split(' ').filter(Boolean);
  const VÆLG = 15000, TEGNE = 80000, VIS = 5000;
  const norm = s => String(s || '').toLowerCase().replace(/[^a-zæøå]/g, '');
  const FARVER = ['#0b1630', '#ef476f', '#3a86ff', '#06d6a0', '#ffd166', '#ff8c42', '#8338ec', '#ffffff'];

  function nyRunde(H, G) {
    G.nr++;
    if (G.nr > G.maks) { G.fase = 'slut'; const top = Math.max(...Object.values(G.sum)); G.slut = { vindere: Object.keys(G.sum).filter(e => G.sum[e] === top) }; return; }
    G.tur = (G.nr - 1) % G.rk.length;
    let n = 0; while (!(H.find(G.rk[G.tur]) || {}).online && n++ < G.rk.length) G.tur = (G.tur + 1) % G.rk.length;
    G.valg = bland(ORD.filter(o => !G.brugt.includes(o))).slice(0, 3);
    Object.assign(G, { fase: 'vælg', ord: null, streger: [], gættet: [], gæt: [], frist: Date.now() + VÆLG, start: 0 });
  }
  function begynd(G, i) { G.ord = G.valg[i] || G.valg[0]; G.brugt.push(G.ord); G.fase = 'tegn'; G.frist = Date.now() + TEGNE; G.start = Date.now(); }
  function maske(G) {
    const gået = G.start ? (Date.now() - G.start) / TEGNE : 0, vis = gået > .5 ? Math.floor((gået - .5) * 2 * Math.ceil(G.ord.length / 3)) + 1 : 0;
    const pos = [...G.ord].map((_, i) => i).filter(i => (i * 7 + G.nr) % G.ord.length < vis);
    return [...G.ord].map((c, i) => c === ' ' || c === '-' ? c : pos.includes(i) ? c : '_');
  }
  BS.registrer({
    id: 'tegn', navn: 'Tegn og gæt', e: '🎨', min: 2, max: 4, tickMs: 500,
    d: 'Én tegner, resten gætter. Hurtigste gæt får flest point.',
    start(H) { const rk = H.spillere().map(p => p.enhed), sum = {}; rk.forEach(e => { sum[e] = 0; }); const G = { rk, nr: 0, maks: rk.length * 2, brugt: [], sum, slut: null }; nyRunde(H, G); return G; },
    tick(H, G) {
      if (G.fase === 'slut') return false;
      const nu = Date.now();
      if (G.fase === 'vælg' && nu > G.frist) { begynd(G, 0); return true; }
      if (G.fase === 'tegn') { if (nu > G.frist) { G.fase = 'vis'; G.frist = nu + VIS; return true; } const m = maske(G).join(''); if (m !== G.sidstMaske) { G.sidstMaske = m; return true; } }
      if (G.fase === 'vis' && nu > G.frist) { nyRunde(H, G); return true; }
      return false;
    },
    kald(H, G, e, d) {
      if (G.fase === 'slut') return;
      const tegner = G.rk[G.tur] === e;
      if (d.vælg != null && G.fase === 'vælg' && tegner) { begynd(G, +d.vælg); return; }
      if (G.fase !== 'tegn') return;
      if (tegner) {
        if (d.streg) { const s = d.streg, p = (s.p || []).map(n => Math.max(0, Math.min(1000, n | 0))).slice(0, 400);
          if (s.ny || !G.streger.length) { if (G.streger.length < 400) G.streger.push({ f: FARVER.includes(s.f) ? s.f : '#0b1630', w: s.w === 18 ? 18 : s.w === 3 ? 3 : 8, p }); }
          else { const l = G.streger[G.streger.length - 1]; if (l.p.length < 3000) l.p = l.p.concat(p); } }
        if (d.ryd) G.streger = [];
        if (d.fortryd) G.streger.pop();
        if (d.giv) { G.fase = 'vis'; G.frist = Date.now() + VIS; }
        return;
      }
      if (d.gæt && !G.gættet.includes(e)) {
        const t = String(d.gæt).slice(0, 40);
        if (norm(t) === norm(G.ord)) {
          const p = [3, 2][G.gættet.length] || 1; G.gættet.push(e); H.giv(e, p); G.sum[e] += p; H.giv(G.rk[G.tur], 1); G.sum[G.rk[G.tur]] += 1;
          G.gæt.push({ e, ok: true, p });
          const gættere = G.rk.filter(x => x !== G.rk[G.tur] && (H.find(x) || {}).online);
          if (gættere.every(x => G.gættet.includes(x))) { G.fase = 'vis'; G.frist = Date.now() + VIS; }
        } else G.gæt.push({ e, t });
        G.gæt = G.gæt.slice(-8);
      }
    },
    skiftEnhed(H, G, gl, ny) { G.rk = G.rk.map(x => x === gl ? ny : x); if (gl in G.sum) { G.sum[ny] = G.sum[gl]; delete G.sum[gl]; } G.gættet = G.gættet.map(x => x === gl ? ny : x); },
    view(H, G, e) {
      const tegner = G.rk[G.tur] === e, kender = tegner || G.gættet.includes(e) || G.fase === 'vis';
      return { fase: G.fase, nr: G.nr, maks: G.maks, tegner: G.rk[G.tur], valg: tegner && G.fase === 'vælg' ? G.valg : null,
        ord: G.ord && kender ? G.ord : null, maske: G.ord ? maske(G) : null, streger: G.streger, gættet: G.gættet, gæt: G.gæt, sum: G.sum, rk: G.rk,
        rest: Math.max(0, (G.frist || 0) - Date.now()), slut: G.slut };
    },
    tegn(el, v, api) {
      const tegner = v.tegner === api.mig;
      const runde = v.nr + ':' + v.fase;
      if (el._runde !== runde || !el.querySelector('#tg-cv')) {
        el._runde = runde; el._lokal = null;
        let h = '<div id="tg-top"></div><div style="position:relative"><canvas id="tg-cv" width="1000" height="750" style="width:100%;background:#fff;border-radius:14px;touch-action:none;display:block"></canvas></div><div id="tg-bund"></div>';
        el.innerHTML = h;
        const cv = el.querySelector('#tg-cv');
        el._farve = el._farve || '#0b1630'; el._bredde = el._bredde || 8;
        if (tegner && v.fase === 'tegn') tegneStyring(el, cv, api);
      }
      el._v = v;
      tegnStreger(el, v);
      const sig = JSON.stringify([v.fase, v.nr, v.valg, v.ord, v.maske, v.gæt, v.gættet, v.sum, v.slut, el._farve, el._bredde]) + api.mig;
      const ur = Math.max(0, v.rest);
      if (el._sig !== sig) {
        el._sig = sig;
        let top = '';
        if (v.slut) top = '<div class="banner min">🏆 ' + v.slut.vindere.map(x => esc(api.navn(x))).join(' og ') + ' vandt Tegn og gæt!</div>';
        else if (v.fase === 'vælg') top = '<div class="banner' + (tegner ? ' min' : '') + '">' + (tegner ? '✏️ Vælg et ord at tegne' : '⏳ ' + esc(api.navn(v.tegner)) + ' vælger et ord…') + '</div>';
        else if (v.fase === 'vis') top = '<div class="banner">Ordet var: <b>' + esc(v.ord) + '</b></div>';
        else if (tegner) top = '<div class="banner min">✏️ Tegn: <b style="font-size:24px">' + esc(v.ord) + '</b></div>';
        else top = '<div class="banner' + (v.ord ? ' min' : '') + '">' + (v.ord ? '🎉 Du gættede det: ' + esc(v.ord) : '🤔 <span style="letter-spacing:.3em;font-size:22px">' + esc(v.maske.join('')) + '</span> <small>(' + v.maske.length + ' bogstaver)</small>') + '</div>';
        top += '<div id="tg-ur"></div><p class="hint center" style="margin:0 0 6px">Runde ' + Math.min(v.nr, v.maks) + ' af ' + v.maks + ' · ' + esc(api.navn(v.tegner)) + ' tegner</p>';
        el.querySelector('#tg-top').innerHTML = top;
        let b = '';
        if (v.fase === 'vælg' && v.valg) b += '<div class="row" style="margin-top:10px;flex-wrap:wrap">' + v.valg.map((o, i) => '<button class="btn ok" data-vælg="' + i + '" style="flex:1 1 30%">' + esc(o) + '</button>').join('') + '</div>';
        if (v.fase === 'tegn' && tegner) {
          b += '<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:10px">' + FARVER.map(f => '<button data-farve="' + f + '" style="width:34px;height:34px;border-radius:50%;background:' + f + ';border:3px solid ' + (el._farve === f ? '#ffd166' : '#2a4180') + '"></button>').join('') + '</div>'
            + '<div class="row" style="margin-top:8px">' + [[3, 'Tynd'], [8, 'Normal'], [18, 'Tyk']].map(([w, t]) => '<button class="btn ' + (el._bredde === w ? '' : 'sec') + '" data-bredde="' + w + '">' + t + '</button>').join('')
            + '<button class="btn sec" id="tg-fortryd">↶</button><button class="btn sec" id="tg-ryd">🗑</button></div>'
            + (v.gættet.length ? '' : '<p class="hint center">Tegn ordet – ingen bogstaver eller tal!</p>');
        }
        if (v.fase === 'tegn' && !tegner && !v.ord) b += '<div class="row" style="margin-top:10px"><input class="in" id="tg-gæt" placeholder="Skriv dit gæt" autocomplete="off" style="font-size:17px"><button class="btn ok" id="tg-send" style="flex:0 0 28%">Gæt</button></div>';
        b += '<div style="margin-top:8px">' + v.gæt.slice().reverse().map(g => '<div class="hint" style="margin:2px 0"><b style="color:' + api.farve(g.e) + '">' + esc(api.navn(g.e)) + ':</b> ' + (g.ok ? '🎉 gættede det! (+' + g.p + ')' : esc(g.t)) + '</div>').join('') + '</div>';
        b += '<div class="chips" style="justify-content:center;margin-top:8px">' + v.rk.slice().sort((a, c) => v.sum[c] - v.sum[a]).map(x => '<span class="chip' + (x === api.mig ? ' mig' : '') + '"><i style="background:' + api.farve(x) + '"></i>' + esc(api.navn(x)) + ' ' + v.sum[x] + '</span>').join('') + '</div>';
        const inp = el.querySelector('#tg-gæt'), gemt = inp ? inp.value : '';
        el.querySelector('#tg-bund').innerHTML = b;
        const ni = el.querySelector('#tg-gæt'); if (ni && gemt) ni.value = gemt;
        el.querySelectorAll('[data-vælg]').forEach(x => { x.onclick = () => api.kald({ vælg: +x.dataset.vælg }); });
        el.querySelectorAll('[data-farve]').forEach(x => { x.onclick = () => { el._farve = x.dataset.farve; el._sig = ''; this.tegn(el, v, api); }; });
        el.querySelectorAll('[data-bredde]').forEach(x => { x.onclick = () => { el._bredde = +x.dataset.bredde; el._sig = ''; this.tegn(el, v, api); }; });
        const q = s => el.querySelector(s);
        if (q('#tg-ryd')) q('#tg-ryd').onclick = () => api.kald({ ryd: 1 });
        if (q('#tg-fortryd')) q('#tg-fortryd').onclick = () => api.kald({ fortryd: 1 });
        const send = () => { const i = q('#tg-gæt'); if (i && i.value.trim()) { api.kald({ gæt: i.value.trim() }); i.value = ''; i.focus(); } };
        if (q('#tg-send')) q('#tg-send').onclick = send;
        if (q('#tg-gæt')) q('#tg-gæt').onkeydown = e => { if (e.key === 'Enter') send(); };
        const nyeOk = v.gæt.filter(g => g.ok).length; if (el._ok !== undefined && nyeOk > el._ok) api.lyd.ok(); el._ok = nyeOk;
        if (v.slut && el._vundet !== 1) { el._vundet = 1; v.slut.vindere.includes(api.mig) ? api.lyd.vind() : api.lyd.klik(); }
      }
      const urEl = el.querySelector('#tg-ur'); if (urEl && !v.slut) BS.turUr(urEl, ur, v.fase === 'vælg' ? VÆLG : v.fase === 'vis' ? VIS : TEGNE);
    },
  });

  function tegnStreger(el, v) {
    const cv = el.querySelector('#tg-cv'); if (!cv) return; const c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, 1000, 750); c.lineCap = 'round'; c.lineJoin = 'round';
    const alle = v.streger.slice(); if (el._lokal) alle.push(el._lokal);
    alle.forEach(s => {
      const p = s.p; if (!p || p.length < 2) return;
      c.strokeStyle = s.f; c.lineWidth = s.w * 1.3; c.beginPath(); c.moveTo(p[0], p[1] * .75);
      if (p.length === 2) c.lineTo(p[0] + .1, p[1] * .75);
      for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1] * .75);
      c.stroke();
    });
  }
  /* tegneren: punkter samles lokalt og sendes i små pakker hver 120 ms */
  function tegneStyring(el, cv, api) {
    let tegner = false, kø = [], ny = true, sidst = null;
    const pkt = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 1000), Math.round((e.clientY - r.top) / r.height * 1000)]; };
    const sendKø = () => { if (!kø.length) return; api.kald({ streg: { f: el._farve, w: el._bredde, p: kø, ny } }); ny = false; kø = []; };
    const int = setInterval(() => { if (!cv.isConnected) { clearInterval(int); return; } sendKø(); }, 120);
    cv.addEventListener('pointerdown', e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {} tegner = true; ny = true; const p = pkt(e); kø = p.slice(); sidst = p; el._lokal = { f: el._farve, w: el._bredde, p: p.slice() }; tegnStreger(el, el._v); });
    cv.addEventListener('pointermove', e => {
      if (!tegner) return; const p = pkt(e); if (sidst && Math.hypot(p[0] - sidst[0], p[1] - sidst[1]) < 6) return; sidst = p;
      kø.push(p[0], p[1]); el._lokal.p.push(p[0], p[1]); tegnStreger(el, el._v);
    });
    const slut = () => { if (!tegner) return; tegner = false; sendKø(); setTimeout(() => { el._lokal = null; }, 400); };
    cv.addEventListener('pointerup', slut); cv.addEventListener('pointercancel', slut);
  }
})();
