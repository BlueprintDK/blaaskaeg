/* Blå skæg – Yatzy for 1-4 spillere (danske regler: 15 felter, bonus 50 ved 63+ i øverste del).
 * På sin tur slår man op til 3 gange og holder de terninger, man vil gemme, ved at trykke på dem.
 * Så vælger man et felt på blokken. Vinder af spillet: +5 i stillingen (nr. 2: +2, hvis I er 3-4). */
(function () {
  const { esc, rnd } = BS;
  const FELTER = [
    ['1', 'Enere'], ['2', 'Toere'], ['3', 'Treere'], ['4', 'Firere'], ['5', 'Femmere'], ['6', 'Seksere'],
    ['par', '1 par'], ['topar', '2 par'], ['tre', '3 ens'], ['fire', '4 ens'], ['lille', 'Lille straight'], ['stor', 'Stor straight'],
    ['hus', 'Fuldt hus'], ['chance', 'Chance'], ['yatzy', 'YATZY'],
  ];
  function point(k, t) {
    const n = [0, 0, 0, 0, 0, 0, 0]; t.forEach(x => n[x]++);
    const sum = t.reduce((a, b) => a + b, 0), par = [6, 5, 4, 3, 2, 1].filter(v => n[v] >= 2);
    if (/^[1-6]$/.test(k)) return n[+k] * +k;
    switch (k) {
      case 'par': return par.length ? par[0] * 2 : 0;
      case 'topar': return par.length >= 2 ? par[0] * 2 + par[1] * 2 : 0;
      case 'tre': { const v = [6, 5, 4, 3, 2, 1].find(x => n[x] >= 3); return v ? v * 3 : 0; }
      case 'fire': { const v = [6, 5, 4, 3, 2, 1].find(x => n[x] >= 4); return v ? v * 4 : 0; }
      case 'lille': return [1, 2, 3, 4, 5].every(x => n[x] === 1) ? 15 : 0;
      case 'stor': return [2, 3, 4, 5, 6].every(x => n[x] === 1) ? 20 : 0;
      case 'hus': { const tre = [1, 2, 3, 4, 5, 6].find(x => n[x] === 3), to = [1, 2, 3, 4, 5, 6].find(x => n[x] === 2); return tre && to ? sum : 0; }
      case 'chance': return sum;
      case 'yatzy': return n.some(x => x === 5) ? 50 : 0;
    }
    return 0;
  }
  const øvre = b => ['1', '2', '3', '4', '5', '6'].reduce((a, k) => a + (b[k] || 0), 0);
  const total = b => Object.values(b).reduce((a, x) => a + x, 0) + (øvre(b) >= 63 ? 50 : 0);
  const næste = (H, G) => { const n = G.rk.length; for (let k = 1; k <= n; k++) { const j = (G.tur + k) % n; if ((H.find(G.rk[j]) || {}).online && Object.keys(G.blok[G.rk[j]]).length < 15) return j; } return -1; };

  BS.registrer({
    id: 'yatzy', navn: 'Yatzy', e: '🎲', min: 1, max: 4,
    d: 'Slå op til 3 gange, hold de gode terninger og fyld blokken ud.',
    start(H) {
      const rk = H.spillere().map(p => p.enhed), blok = {}; rk.forEach(e => { blok[e] = {}; });
      return { rk, blok, tur: 0, t: [1, 1, 1, 1, 1], hold: [false, false, false, false, false], slag: 0, nr: 0, slut: null, sidst: null };
    },
    kald(H, G, e, d) {
      if (G.slut || G.rk[G.tur] !== e) return;
      if (d.slå) { if (G.slag >= 3) return; G.t = G.t.map((x, i) => (G.slag && G.hold[i]) ? x : 1 + rnd(6)); if (!G.slag) G.hold = [false, false, false, false, false]; G.slag++; G.nr++; return; }
      if (d.hold != null) { const i = +d.hold; if (G.slag > 0 && G.slag < 3 && i >= 0 && i < 5) G.hold[i] = !G.hold[i]; return; }
      if (d.felt) {
        const k = d.felt; if (!G.slag || !FELTER.some(f => f[0] === k) || k in G.blok[e]) return;
        const p = point(k, G.t); G.blok[e][k] = p; G.sidst = { e, k, p };
        const nt = næste(H, G);
        if (nt < 0) {
          G.slut = { stilling: G.rk.map(x => [x, total(G.blok[x])]).sort((a, b) => b[1] - a[1]) };
          H.giv(G.slut.stilling[0][0], 5); if (G.rk.length >= 3) H.giv(G.slut.stilling[1][0], 2);
        } else { G.tur = nt; G.slag = 0; G.hold = [false, false, false, false, false]; }
      }
    },
    frakoblet(H, G, e) { if (!G.slut && G.rk[G.tur] === e) { const nt = næste(H, G); if (nt >= 0) { G.tur = nt; G.slag = 0; G.hold = [false, false, false, false, false]; } } },
    skiftEnhed(H, G, gl, ny) { G.rk = G.rk.map(x => x === gl ? ny : x); if (G.blok[gl]) { G.blok[ny] = G.blok[gl]; delete G.blok[gl]; } },
    felles: true,
    view(H, G) { return { rk: G.rk, blok: G.blok, tur: G.rk[G.tur], t: G.t, hold: G.hold, slag: G.slag, nr: G.nr, slut: G.slut, sidst: G.sidst }; },
    tegn(el, v, api) {
      const sig = JSON.stringify(v) + api.mig; if (el._s === sig) return; el._s = sig;
      const min = !v.slut && v.tur === api.mig, rullet = el._nr !== v.nr; el._nr = v.nr;
      let h = '';
      if (v.slut) h += '<div class="banner min">🏆 ' + esc(api.navn(v.slut.stilling[0][0])) + ' vandt med ' + v.slut.stilling[0][1] + ' point!</div>';
      else h += '<div class="banner' + (min ? ' min' : '') + '">' + (min ? '🎯 Din tur – ' + (v.slag === 0 ? 'slå terningerne' : v.slag < 3 ? 'hold og slå igen, eller vælg et felt' : 'vælg et felt') : '⏳ ' + esc(api.navn(v.tur)) + ' slår') + '</div>';
      if (!v.slut) {
        h += '<div style="display:flex;gap:8px;justify-content:center;margin:6px 0 10px">' + v.t.map((x, i) => terning(x, v.slag ? v.hold[i] : false, min && v.slag > 0 && v.slag < 3, i, rullet && v.slag && !v.hold[i])).join('') + '</div>';
        if (min && v.slag < 3) h += '<button class="btn big ok" id="yz-slå">🎲 Slå' + (v.slag ? ' igen (' + (3 - v.slag) + ' tilbage)' : '') + '</button>';
        if (min && v.slag > 0 && v.slag < 3) h += '<p class="hint center" style="margin:6px 0">Tryk på en terning for at holde den</p>';
      }
      if (v.sidst) h += '<p class="hint center">' + esc(api.navn(v.sidst.e)) + ' skrev ' + v.sidst.p + ' i «' + esc(FELTER.find(f => f[0] === v.sidst.k)[1]) + '»</p>';
      /* blokken */
      h += '<div style="overflow-x:auto;margin-top:8px"><table style="width:100%;border-collapse:collapse;font-size:14px">'
        + '<tr><th style="text-align:left;padding:4px"></th>' + v.rk.map(e => '<th style="padding:4px 2px;color:' + api.farve(e) + ';font-size:12.5px">' + esc(api.navn(e).slice(0, 7)) + '</th>').join('') + '</tr>';
      const række = (k, navn) => '<tr style="border-top:1px solid #2a4180"><td style="padding:5px 4px">' + navn + '</td>' + v.rk.map(e => {
        const har = k in v.blok[e];
        if (har) return '<td style="text-align:center;font-weight:800">' + (v.blok[e][k] || '–') + '</td>';
        if (e === api.mig && min && v.slag > 0) { const p = point(k, v.t); return '<td style="text-align:center;padding:2px"><button data-felt="' + k + '" class="btn" style="padding:5px 0;width:100%;font-size:14px;background:' + (p ? '#06d6a0;color:#04251b' : '#2a4180') + '">' + (p || '0') + '</button></td>'; }
        return '<td></td>';
      }).join('') + '</tr>';
      FELTER.slice(0, 6).forEach(([k, n]) => { h += række(k, n); });
      h += '<tr style="border-top:2px solid #3a86ff"><td style="padding:5px 4px;color:#9fb0d6">Sum (bonus ved 63)</td>' + v.rk.map(e => '<td style="text-align:center;color:#9fb0d6">' + øvre(v.blok[e]) + (øvre(v.blok[e]) >= 63 ? ' +50' : '') + '</td>').join('') + '</tr>';
      FELTER.slice(6).forEach(([k, n]) => { h += række(k, n); });
      h += '<tr style="border-top:2px solid #3a86ff"><td style="padding:6px 4px;font-weight:900">I alt</td>' + v.rk.map(e => '<td style="text-align:center;font-weight:900;font-size:16px">' + total(v.blok[e]) + '</td>').join('') + '</tr></table></div>';
      el.innerHTML = h;
      const s = el.querySelector('#yz-slå'); if (s) s.onclick = () => { s.disabled = true; api.kald({ slå: 1 }); };
      el.querySelectorAll('[data-hold]').forEach(b => { b.onclick = () => api.kald({ hold: +b.dataset.hold }); });
      el.querySelectorAll('[data-felt]').forEach(b => { b.onclick = () => api.kald({ felt: b.dataset.felt }); });
      if (rullet && v.slag) api.lyd.klik();
      if (v.slut && v.slut.stilling[0][0] === api.mig && el._vundet !== 1) { el._vundet = 1; api.lyd.vind(); }
    },
  });
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function terning(x, hold, kan, i, ryst) {
    return '<button ' + (kan ? 'data-hold="' + i + '"' : 'disabled') + ' style="width:min(17vw,62px);aspect-ratio:1;border-radius:14px;border:0;padding:8px;display:grid;grid-template-columns:repeat(3,1fr);gap:2px;'
      + 'background:' + (hold ? '#ffd166' : '#fff') + ';box-shadow:0 4px 0 ' + (hold ? '#c9a13e' : '#b8c3da') + (hold ? ',0 0 0 3px #ffd166' : '') + ';opacity:1;'
      + (ryst ? 'animation:ryst .45s' : '') + (hold ? ';transform:translateY(-6px)' : '') + '">'
      + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(p => '<i style="border-radius:50%;background:' + (PIPS[x].includes(p) ? '#0b1630' : 'transparent') + ';aspect-ratio:1"></i>').join('') + '</button>';
  }
  const st = document.createElement('style'); st.textContent = '@keyframes ryst{0%{transform:rotate(0)}25%{transform:rotate(-25deg) scale(.85)}50%{transform:rotate(20deg)}75%{transform:rotate(-10deg)}100%{transform:rotate(0)}}'; document.head.appendChild(st);
})();
