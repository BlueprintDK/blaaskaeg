/* Blå skæg – kortspil: Snyd og Krig (2-4 spillere). Ens kort ses kun på ens egen telefon.
 * Kort = tal 0-51: værdi = k % 13 + 2 (2..14, 14 = es), kulør = k / 13. */
(function () {
  const { esc, rnd, bland } = BS;
  const NAVN = { 11: 'J', 12: 'D', 13: 'K', 14: 'E' }, LANG = { 11: 'knægt', 12: 'dame', 13: 'konge', 14: 'es' };
  const KUL = ['♠', '♥', '♦', '♣'];
  const værdi = k => k % 13 + 2, kulør = k => (k / 13) | 0;
  const vnavn = v => NAVN[v] || String(v), vlang = (v, n) => (LANG[v] ? (n > 1 ? { 11: 'knægte', 12: 'damer', 13: 'konger', 14: 'esser' }[v] : LANG[v]) : (n > 1 ? v + '\'ere' : v + '\'er'));
  function kortHTML(k, opt) {
    opt = opt || {}; const v = værdi(k), s = kulør(k), rød = s === 1 || s === 2;
    const st = 'display:inline-flex;flex-direction:column;justify-content:space-between;width:' + (opt.b || 48) + 'px;height:' + Math.round((opt.b || 48) * 1.4) + 'px;padding:4px 5px;border-radius:8px;background:#fff;color:' + (rød ? '#d62839' : '#0b1630')
      + ';font-weight:900;font-size:' + Math.round((opt.b || 48) * .36) + 'px;line-height:1;box-shadow:0 2px 4px rgba(0,0,0,.4);flex:0 0 auto;border:0;' + (opt.valgt ? 'transform:translateY(-12px);outline:3px solid #ffd166;' : '') + (opt.anim ? 'animation:kortind .35s;' : '');
    return '<' + (opt.knap ? 'button data-kort="' + k + '"' : 'span') + ' style="' + st + '"><span>' + vnavn(v) + '</span><span style="align-self:center;font-size:1.3em">' + KUL[s] + '</span><span style="align-self:flex-end;transform:rotate(180deg)">' + vnavn(v) + '</span></' + (opt.knap ? 'button' : 'span') + '>';
  }
  const bagside = (b, n) => '<span style="display:inline-grid;place-items:center;width:' + b + 'px;height:' + Math.round(b * 1.4) + 'px;border-radius:8px;background:repeating-linear-gradient(45deg,#3a86ff 0 6px,#2563eb 6px 12px);border:2px solid #fff;color:#fff;font-weight:900;box-shadow:0 2px 4px rgba(0,0,0,.4)">' + (n != null ? n : '') + '</span>';
  const st = document.createElement('style'); st.textContent = '@keyframes kortind{from{transform:translateY(-30px) rotate(-8deg);opacity:0}}'; document.head.appendChild(st);
  function giv(rk) { const sæt = bland([...Array(52).keys()]), hånd = {}; rk.forEach(e => { hånd[e] = []; }); sæt.forEach((k, i) => hånd[rk[i % rk.length]].push(k)); return hånd; }
  const sorter = h => h.slice().sort((a, b) => værdi(a) - værdi(b) || kulør(a) - kulør(b));

  /* ==================== SNYD ==================== */
  const RÆKKE = [14, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const TVIVL = 7000;
  function næste(H, G, i) { const n = G.rk.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if ((H.find(G.rk[j]) || {}).online) return j; } return i; }
  function afgør(H, G, kalder) {
    const t = G.tvivl; if (!t) return; G.tvivl = null;
    const løgn = t.kort.some(k => værdi(k) !== t.påstand);
    if (kalder) {
      const taber = løgn ? t.e : kalder;
      G.hånd[taber] = G.hånd[taber].concat(G.bunke); G.bunke = [];
      G.afsløret = { kort: t.kort, af: t.e, kalder, løgn, taber, n: (G.afsløret ? G.afsløret.n : 0) + 1 };
      G.log = H.navn(kalder) + ' råbte SNYD! – ' + (løgn ? H.navn(t.e) + ' snød og tager bunken 😬' : H.navn(t.e) + ' talte sandt – ' + H.navn(kalder) + ' tager bunken 😅');
    } else G.log = 'Ingen råbte snyd.';
    if (G.hånd[t.e].length === 0 && !(kalder && løgn)) { G.slut = { vinder: t.e }; H.giv(t.e, 5); return; }
    G.tur = næste(H, G, G.rk.indexOf(t.e)); G.trin = (G.trin + 1) % 13;
  }
  BS.registrer({
    id: 'snyd', navn: 'Snyd', e: '🃏', min: 2, max: 4, tickMs: 300,
    d: 'Læg kort med bagsiden op og påstå, hvad de er. Råb SNYD, hvis du tror, de lyver!',
    start(H) { const rk = H.spillere().map(p => p.enhed); return { rk, hånd: giv(rk), bunke: [], tur: rnd(rk.length), trin: 0, tvivl: null, log: '', afsløret: null, slut: null, ok: {} }; },
    tick(H, G) { if (G.tvivl && Date.now() > G.tvivl.frist) { afgør(H, G, null); return true; } return false; },
    kald(H, G, e, d) {
      if (G.slut) return;
      if (d.læg && !G.tvivl && G.rk[G.tur] === e) {
        const kort = [...new Set(d.læg)].map(Number).filter(k => G.hånd[e].includes(k)); if (kort.length < 1 || kort.length > 4) return;
        G.hånd[e] = G.hånd[e].filter(k => !kort.includes(k)); G.bunke = G.bunke.concat(kort);
        G.tvivl = { e, kort, påstand: RÆKKE[G.trin], antal: kort.length, frist: Date.now() + TVIVL }; G.ok = {}; G.afsløret = null;
        G.log = H.navn(e) + ' lagde ' + kort.length + ' ' + vlang(RÆKKE[G.trin], kort.length); return;
      }
      if (d.snyd && G.tvivl && G.tvivl.e !== e) { afgør(H, G, e); return; }
      if (d.ok && G.tvivl && G.tvivl.e !== e) { G.ok[e] = true; if (G.rk.filter(x => x !== G.tvivl.e && (H.find(x) || {}).online).every(x => G.ok[x])) afgør(H, G, null); }
    },
    frakoblet(H, G, e) { if (G.tvivl && G.rk.filter(x => x !== G.tvivl.e && (H.find(x) || {}).online).every(x => G.ok[x])) afgør(H, G, null); else if (!G.tvivl && G.rk[G.tur] === e) G.tur = næste(H, G, G.tur); },
    skiftEnhed(H, G, gl, ny) { G.rk = G.rk.map(x => x === gl ? ny : x); if (G.hånd[gl]) { G.hånd[ny] = G.hånd[gl]; delete G.hånd[gl]; } if (G.tvivl && G.tvivl.e === gl) G.tvivl.e = ny; },
    view(H, G, e) {
      return { rk: G.rk, min: sorter(G.hånd[e] || []), antal: G.rk.map(x => (G.hånd[x] || []).length), bunke: G.bunke.length, tur: G.rk[G.tur], påstand: RÆKKE[G.trin],
        tvivl: G.tvivl ? { e: G.tvivl.e, antal: G.tvivl.antal, påstand: G.tvivl.påstand, rest: Math.max(0, G.tvivl.frist - Date.now()), ok: Object.keys(G.ok) } : null,
        afsløret: G.afsløret, log: G.log, slut: G.slut };
    },
    tegn(el, v, api) {
      const sig = JSON.stringify(v) + api.mig + JSON.stringify(el._valg || []); if (el._s === sig) return; el._s = sig;
      el._valg = (el._valg || []).filter(k => v.min.includes(k));
      const min = !v.slut && !v.tvivl && v.tur === api.mig;
      let h = '<div class="chips" style="justify-content:center">' + v.rk.map((x, i) => '<span class="chip' + (x === v.tur && !v.tvivl ? ' mig' : '') + '"><i style="background:' + api.farve(x) + '"></i>' + esc(api.navn(x)) + ' · 🂠 ' + v.antal[i] + '</span>').join('') + '</div>';
      if (v.slut) h += '<div class="banner min">🏆 ' + esc(api.navn(v.slut.vinder)) + ' blev af med alle kort!</div>';
      else if (v.tvivl) {
        const jeg = v.tvivl.e === api.mig;
        h += '<div class="banner' + (jeg ? '' : ' min') + '">' + esc(api.navn(v.tvivl.e)) + ' siger: ' + v.tvivl.antal + ' ' + vlang(v.tvivl.påstand, v.tvivl.antal) + (jeg ? ' – venter…' : ' – tror du på det?') + '</div><div id="sn-ur"></div>';
        if (!jeg) h += '<div class="row"><button class="btn big" id="sn-snyd" style="background:#ef476f">🚨 SNYD!</button><button class="btn big sec" id="sn-ok"' + (v.tvivl.ok.includes(api.mig) ? ' disabled' : '') + '>👍 Tror på det</button></div>';
      } else h += '<div class="banner' + (min ? ' min' : '') + '">' + (min ? '🎯 Din tur – læg 1-4 kort som «' + vlang(v.påstand, 2) + '»' : '⏳ ' + esc(api.navn(v.tur)) + ' skal lægge ' + vlang(v.påstand, 2)) + '</div>';
      h += '<div style="display:flex;gap:16px;align-items:center;justify-content:center;margin:10px 0">' + (v.bunke ? bagside(56, v.bunke) : '<span class="hint">Bunken er tom</span>')
        + (v.afsløret ? '<div style="display:flex;gap:4px">' + v.afsløret.kort.map(k => kortHTML(k, { b: 42, anim: true })).join('') + '</div>' : '') + '</div>';
      if (v.log) h += '<p class="hint center" style="margin:0 0 8px">' + esc(v.log) + '</p>';
      h += '<p class="hint" style="margin:10px 0 4px">Dine kort (' + v.min.length + ')' + (min ? ' – tryk for at vælge' : '') + '</p><div style="display:flex;flex-wrap:wrap;gap:6px;padding-top:12px">'
        + v.min.map(k => kortHTML(k, { knap: min, valgt: el._valg.includes(k) })).join('') + '</div>';
      if (min) h += '<button class="btn big ok" id="sn-læg" style="margin-top:12px"' + (el._valg.length && el._valg.length <= 4 ? '' : ' disabled') + '>Læg ' + (el._valg.length || '') + ' kort som ' + vlang(v.påstand, el._valg.length || 2) + '</button>'
        + '<p class="hint center">Du må gerne snyde – hvis ingen opdager det 😉</p>';
      el.innerHTML = h;
      const q = s => el.querySelector(s);
      if (q('#sn-ur')) BS.turUr(q('#sn-ur'), v.tvivl.rest, TVIVL);
      el.querySelectorAll('[data-kort]').forEach(b => { b.onclick = () => { const k = +b.dataset.kort; el._valg = el._valg.includes(k) ? el._valg.filter(x => x !== k) : el._valg.length < 4 ? el._valg.concat(k) : el._valg; el._s = ''; this.tegn(el, v, api); api.vib(8); }; });
      if (q('#sn-læg')) q('#sn-læg').onclick = () => { api.kald({ læg: el._valg }); el._valg = []; };
      if (q('#sn-snyd')) q('#sn-snyd').onclick = () => api.kald({ snyd: 1 });
      if (q('#sn-ok')) q('#sn-ok').onclick = () => api.kald({ ok: 1 });
      if (v.afsløret && el._af !== v.afsløret.n) { el._af = v.afsløret.n; v.afsløret.løgn ? api.lyd.ram() : api.lyd.fejl(); }
      if (min) api.vib(30);
      if (v.slut && v.slut.vinder === api.mig && el._v !== 1) { el._v = 1; api.lyd.vind(); }
    },
  });

  /* ==================== KRIG ==================== */
  const MAX_RUNDER = 150;
  BS.registrer({
    id: 'krig', navn: 'Krig', e: '⚔️', min: 2, max: 4, tickMs: 700,
    d: 'Alle vender et kort – højeste tager stikket. Ens kort betyder krig!',
    start(H) { const rk = H.spillere().map(p => p.enhed); return { rk, hånd: giv(rk), vendt: {}, auto: {}, bord: null, krig: 0, runde: 0, log: '', slut: null }; },
    tick(H, G) {
      if (G.slut) return false; let æ = false;
      G.rk.forEach(e => { if (G.hånd[e].length && !G.vendt[e] && (G.auto[e] || !(H.find(e) || {}).online)) { G.vendt[e] = true; æ = true; } });
      const aktive = G.rk.filter(e => G.hånd[e].length);
      if (aktive.length && aktive.every(e => G.vendt[e])) { this.stik(H, G, aktive); return true; }
      return æ;
    },
    stik(H, G, aktive) {
      G.runde++; G.vendt = {}; let pulje = [], med = aktive, krig = 0, bord = {};
      for (let loop = 0; loop < 10; loop++) {
        const op = {}; med.forEach(e => { if (loop > 0) { const ned = G.hånd[e].splice(0, Math.min(1, Math.max(0, G.hånd[e].length - 1))); pulje = pulje.concat(ned); } const k = G.hånd[e].shift(); if (k != null) { op[e] = k; pulje.push(k); bord[e] = k; } });
        const tal = Object.entries(op); if (!tal.length) break;
        const max = Math.max(...tal.map(([, k]) => værdi(k))), top = tal.filter(([, k]) => værdi(k) === max).map(([e]) => e);
        if (top.length === 1) { G.hånd[top[0]] = G.hånd[top[0]].concat(bland(pulje)); G.log = H.navn(top[0]) + ' tager ' + pulje.length + ' kort' + (krig ? ' efter KRIG! ⚔️' : ''); G.vinderStik = top[0]; break; }
        krig++; med = top.filter(e => G.hånd[e].length);
        if (!med.length) { G.hånd[top[0]] = G.hånd[top[0]].concat(pulje); G.vinderStik = top[0]; break; }
      }
      G.bord = bord; G.krig = krig; G.stikNr = (G.stikNr || 0) + 1;
      const tilbage = G.rk.filter(e => G.hånd[e].length);
      if (tilbage.length <= 1 || G.runde >= MAX_RUNDER) {
        const v = G.rk.slice().sort((a, b) => G.hånd[b].length - G.hånd[a].length)[0];
        G.slut = { vinder: v, alle: tilbage.length <= 1 }; H.giv(v, 5);
      }
    },
    kald(H, G, e, d) {
      if (G.slut || !G.hånd[e]) return;
      if (d.vend && G.hånd[e].length) G.vendt[e] = true;
      if (d.auto != null) G.auto[e] = !!d.auto;
      const aktive = G.rk.filter(x => G.hånd[x].length);
      if (aktive.every(x => G.vendt[x])) this.stik(H, G, aktive);
    },
    skiftEnhed(H, G, gl, ny) { G.rk = G.rk.map(x => x === gl ? ny : x); ['hånd', 'vendt', 'auto'].forEach(k => { if (gl in G[k]) { G[k][ny] = G[k][gl]; delete G[k][gl]; } }); },
    felles: true,
    view(H, G) { return { rk: G.rk, antal: G.rk.map(e => G.hånd[e].length), vendt: Object.keys(G.vendt), auto: Object.keys(G.auto).filter(e => G.auto[e]), bord: G.bord, krig: G.krig, log: G.log, runde: G.runde, maks: MAX_RUNDER, stikNr: G.stikNr || 0, vinderStik: G.vinderStik, slut: G.slut }; },
    tegn(el, v, api) {
      const sig = JSON.stringify(v) + api.mig; if (el._s === sig) return; el._s = sig;
      const mi = v.rk.indexOf(api.mig), har = mi >= 0 && v.antal[mi] > 0, vendt = v.vendt.includes(api.mig), auto = v.auto.includes(api.mig), nyt = el._stik !== v.stikNr;
      let h = '';
      if (v.slut) h += '<div class="banner min">🏆 ' + esc(api.navn(v.slut.vinder)) + (v.slut.alle ? ' vandt alle kortene!' : ' har flest kort efter ' + v.maks + ' stik!') + '</div>';
      else if (v.krig) h += '<div class="banner" style="background:#ef476f;color:#fff">⚔️ KRIG! ⚔️</div>';
      else h += '<div class="banner' + (har && !vendt ? ' min' : '') + '">' + (!har ? '💀 Du er løbet tør for kort' : vendt ? '⏳ Venter på de andre…' : '🎯 Vend dit kort!') + '</div>';
      h += '<div style="display:grid;grid-template-columns:repeat(' + Math.min(v.rk.length, 2) + ',1fr);gap:12px;margin:8px 0">' + v.rk.map((e, i) => {
        const k = v.bord && v.bord[e];
        return '<div style="text-align:center;padding:10px;border-radius:16px;background:#14244a;' + (v.vinderStik === e && v.bord ? 'outline:3px solid #ffd166' : '') + '">'
          + '<div style="font-weight:800;color:' + api.farve(e) + '">' + esc(api.navn(e)) + '</div><div class="hint">' + v.antal[i] + ' kort' + (v.vendt.includes(e) ? ' · ✅' : '') + '</div>'
          + '<div style="margin-top:8px;min-height:94px">' + (k != null ? kortHTML(k, { b: 66, anim: nyt }) : bagside(66)) + '</div></div>';
      }).join('') + '</div>';
      if (v.log) h += '<p class="hint center">' + esc(v.log) + ' · stik ' + v.runde + '</p>';
      if (!v.slut && har) h += '<div class="row"><button class="btn big ok" id="kr-vend"' + (vendt ? ' disabled' : '') + '>🂠 Vend kort</button><button class="btn sec" id="kr-auto" style="flex:0 0 34%">' + (auto ? '⏸ Stop auto' : '⚡ Auto') + '</button></div>';
      el.innerHTML = h;
      const q = s => el.querySelector(s);
      if (q('#kr-vend')) q('#kr-vend').onclick = () => { q('#kr-vend').disabled = true; api.kald({ vend: 1 }); };
      if (q('#kr-auto')) q('#kr-auto').onclick = () => api.kald({ auto: !auto });
      if (nyt) { el._stik = v.stikNr; if (v.stikNr) v.krig ? api.lyd.ram() : api.lyd.klik(); }
      if (v.slut && v.slut.vinder === api.mig && el._v !== 1) { el._v = 1; api.lyd.vind(); }
    },
  });
})();
