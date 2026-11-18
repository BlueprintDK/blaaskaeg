/* Blå skæg – Hangman for 2-4 spillere.
 * På skift gætter man et bogstav. Rigtigt bogstav: +1 og man fortsætter. Forkert: næste spiller.
 * Den, der gætter sidste bogstav – eller gætter hele ordet på sin tur – får +3. Seks fejl, og alle taber ordet.
 * Ordet ligger kun hos værten, indtil runden er slut. */
(function () {
  const { esc, rnd } = BS;
  const ORD = [
    ['ELEFANT', 'Dyr'], ['KÆNGURU', 'Dyr'], ['PINGVIN', 'Dyr'], ['SKILDPADDE', 'Dyr'], ['BLÆKSPRUTTE', 'Dyr'], ['GIRAF', 'Dyr'], ['ISBJØRN', 'Dyr'],
    ['KROKODILLE', 'Dyr'], ['FLAMINGO', 'Dyr'], ['EGERN', 'Dyr'], ['PAPEGØJE', 'Dyr'], ['HVALROS', 'Dyr'],
    ['JORDBÆR', 'Frugt og grønt'], ['ANANAS', 'Frugt og grønt'], ['BLOMKÅL', 'Frugt og grønt'], ['AGURK', 'Frugt og grønt'], ['VANDMELON', 'Frugt og grønt'],
    ['PANDEKAGE', 'Mad'], ['FLÆSKESTEG', 'Mad'], ['FRIKADELLE', 'Mad'], ['RUGBRØD', 'Mad'], ['PIZZA', 'Mad'], ['RISALAMANDE', 'Mad'], ['LAKRIDS', 'Slik'],
    ['MOTORCYKEL', 'Transport'], ['HELIKOPTER', 'Transport'], ['UBÅD', 'Transport'], ['TRAKTOR', 'Transport'], ['RUMRAKET', 'Transport'], ['CYKEL', 'Transport'],
    ['TROMPET', 'Musik'], ['GUITAR', 'Musik'], ['TROMMESÆT', 'Musik'], ['KLAVER', 'Musik'],
    ['FYRTÅRN', 'Bygning'], ['SLOT', 'Bygning'], ['VINDMØLLE', 'Bygning'], ['KIRKETÅRN', 'Bygning'],
    ['VULKAN', 'Natur'], ['REGNBUE', 'Natur'], ['VANDFALD', 'Natur'], ['TORDENVEJR', 'Natur'], ['GLETSJER', 'Natur'],
    ['PARAPLY', 'Ting'], ['TANDBØRSTE', 'Ting'], ['KØLESKAB', 'Ting'], ['STØVSUGER', 'Ting'], ['KOMPAS', 'Ting'], ['SKRUETRÆKKER', 'Ting'],
    ['FODBOLD', 'Sport'], ['HÅNDBOLD', 'Sport'], ['SVØMNING', 'Sport'], ['BADMINTON', 'Sport'], ['SKISPORT', 'Sport'],
    ['ASTRONAUT', 'Job'], ['BRANDMAND', 'Job'], ['TANDLÆGE', 'Job'], ['POLITIBETJENT', 'Job'], ['KOK', 'Job'],
    ['JULEMAND', 'Højtid'], ['PÅSKEÆG', 'Højtid'], ['FASTELAVN', 'Højtid'], ['NYTÅRSRAKET', 'Højtid'],
    ['SØRØVER', 'Eventyr'], ['DRAGE', 'Eventyr'], ['TROLDMAND', 'Eventyr'], ['HAVFRUE', 'Eventyr'], ['SKATTEKORT', 'Eventyr'],
    ['TRAMPOLIN', 'Leg'], ['GYNGE', 'Leg'], ['SJIPPETOV', 'Leg'], ['VERDENSKORT', 'Ting'], ['BLÅBÆR', 'Frugt og grønt'],
  ];
  /* 18/11-2026 (Michael): engelske ord, når værten har valgt English på startskærmen */
  const ORD_EN = [
    ['ELEPHANT', 'Animals'], ['KANGAROO', 'Animals'], ['PENGUIN', 'Animals'], ['TURTLE', 'Animals'], ['OCTOPUS', 'Animals'], ['GIRAFFE', 'Animals'], ['POLAR BEAR', 'Animals'],
    ['CROCODILE', 'Animals'], ['FLAMINGO', 'Animals'], ['SQUIRREL', 'Animals'], ['PARROT', 'Animals'], ['WALRUS', 'Animals'],
    ['STRAWBERRY', 'Fruit and veg'], ['PINEAPPLE', 'Fruit and veg'], ['CAULIFLOWER', 'Fruit and veg'], ['CUCUMBER', 'Fruit and veg'], ['WATERMELON', 'Fruit and veg'], ['BLUEBERRY', 'Fruit and veg'],
    ['PANCAKE', 'Food'], ['SPAGHETTI', 'Food'], ['MEATBALL', 'Food'], ['SANDWICH', 'Food'], ['PIZZA', 'Food'], ['CHEESEBURGER', 'Food'], ['LIQUORICE', 'Sweets'],
    ['MOTORCYCLE', 'Transport'], ['HELICOPTER', 'Transport'], ['SUBMARINE', 'Transport'], ['TRACTOR', 'Transport'], ['ROCKET', 'Transport'], ['BICYCLE', 'Transport'],
    ['TRUMPET', 'Music'], ['GUITAR', 'Music'], ['DRUM KIT', 'Music'], ['PIANO', 'Music'],
    ['LIGHTHOUSE', 'Building'], ['CASTLE', 'Building'], ['WINDMILL', 'Building'], ['SKYSCRAPER', 'Building'],
    ['VOLCANO', 'Nature'], ['RAINBOW', 'Nature'], ['WATERFALL', 'Nature'], ['THUNDERSTORM', 'Nature'], ['GLACIER', 'Nature'],
    ['UMBRELLA', 'Things'], ['TOOTHBRUSH', 'Things'], ['FRIDGE', 'Things'], ['VACUUM CLEANER', 'Things'], ['COMPASS', 'Things'], ['SCREWDRIVER', 'Things'], ['WORLD MAP', 'Things'],
    ['FOOTBALL', 'Sport'], ['HANDBALL', 'Sport'], ['SWIMMING', 'Sport'], ['BADMINTON', 'Sport'], ['SKIING', 'Sport'],
    ['ASTRONAUT', 'Job'], ['FIREFIGHTER', 'Job'], ['DENTIST', 'Job'], ['POLICE OFFICER', 'Job'], ['CHEF', 'Job'],
    ['SANTA CLAUS', 'Holiday'], ['EASTER EGG', 'Holiday'], ['FIREWORKS', 'Holiday'], ['SNOWMAN', 'Holiday'],
    ['PIRATE', 'Fairy tale'], ['DRAGON', 'Fairy tale'], ['WIZARD', 'Fairy tale'], ['MERMAID', 'Fairy tale'], ['TREASURE MAP', 'Fairy tale'],
    ['TRAMPOLINE', 'Play'], ['SWING', 'Play'], ['SKIPPING ROPE', 'Play'], ['HIDE AND SEEK', 'Play'],
  ];
  const ALF = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ'.split(''), ALF_EN = ALF.slice(0, 26);
  /* 18/11-2026 (Michael): 30 sek. pr. tur. Gætter man ikke i tide, går turen videre, og man mister 2 point. */
  const FRIST = 30000, STRAF = 2;
  const næste = (H, G, i) => { const n = G.rk.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; const p = H.find(G.rk[j]); if (p && p.online) return j; } return i; };
  function nytOrd(H, G) {
    const L = G.en ? ORD_EN : ORD;
    let w; do { w = L[rnd(L.length)]; } while (G.brugt.includes(w[0]) && G.brugt.length < L.length - 1);
    G.brugt.push(w[0]);
    Object.assign(G, { ord: w[0], hint: w[1], gaet: [], fejl: 0, slut: null, sidst: null, frist: Date.now() + FRIST });
  }
  BS.registrer({
    id: 'hangman', navn: 'Hangman', e: '🪢', min: 2, max: 4,
    d: 'Gæt et bogstav på skift. Rigtigt = point, og du fortsætter.',
    start(H) {
      const G = { rk: H.spillere().map(p => p.enhed), tur: 0, brugt: [], runde: 0, en: BS.sprog === 'en' };
      G.tur = rnd(G.rk.length); nytOrd(H, G); return G;
    },
    tickMs: 500,
    tick(H, G) {
      if (G.slut || !G.frist || Date.now() < G.frist) return false;
      const e = G.rk[G.tur]; H.giv(e, -STRAF);
      G.sidst = { navn: H.navn(e), tid: true, n: (G.sidst && G.sidst.n || 0) + 1 };
      G.tur = næste(H, G, G.tur); G.frist = Date.now() + FRIST;
      return true;
    },
    kald(H, G, e, d) {
      if (d.ny) { if (G.slut) { G.runde++; G.tur = næste(H, G, G.tur); nytOrd(H, G); } return; }
      if (G.slut || G.rk[G.tur] !== e) return;
      this.handling(H, G, e, d);
      G.frist = Date.now() + FRIST;          // hver handling giver en frisk tur-tid
    },
    handling(H, G, e, d) {
      const navn = H.navn(e);
      if (d.helt) {
        const g = String(d.helt).toUpperCase().replace(/\s+/g, '');
        if (g === G.ord.replace(/\s+/g, '')) { H.giv(e, 3 + [...new Set(g)].filter(c => !G.gaet.includes(c)).length); G.gaet = [...new Set(g)]; G.slut = { vandt: true, af: e }; G.sidst = { navn, b: g, ok: true }; }
        else { G.fejl = Math.min(6, G.fejl + 2); G.sidst = { navn, b: g, ok: false }; if (G.fejl >= 6) G.slut = { vandt: false }; else G.tur = næste(H, G, G.tur); }
        return;
      }
      const b = String(d.b || '').toUpperCase();
      if (!(G.en ? ALF_EN : ALF).includes(b) || G.gaet.includes(b)) return;
      G.gaet.push(b);
      if (G.ord.includes(b)) {
        H.giv(e, 1); G.sidst = { navn, b, ok: true };
        if ([...G.ord].every(c => c === ' ' || G.gaet.includes(c))) { H.giv(e, 3); G.slut = { vandt: true, af: e }; }
      } else {
        G.fejl++; G.sidst = { navn, b, ok: false };
        if (G.fejl >= 6) G.slut = { vandt: false }; else G.tur = næste(H, G, G.tur);
      }
    },
    frakoblet(H, G, e) { if (G.rk[G.tur] === e && !G.slut) { G.tur = næste(H, G, G.tur); G.frist = Date.now() + FRIST; } },
    skiftEnhed(H, G, gl, ny) { G.rk = G.rk.map(x => x === gl ? ny : x); },
    view(H, G) {
      return { maske: [...G.ord].map(c => c === ' ' || G.gaet.includes(c) ? c : '_'), ord: G.slut ? G.ord : null, hint: G.hint, en: !!G.en, gaet: G.gaet, fejl: G.fejl,
        tur: G.rk[G.tur], sidst: G.sidst, slut: G.slut, runde: G.runde, rest: G.slut ? 0 : Math.max(0, G.frist - Date.now()) };
    },
    felles: true,
    tegn(el, v, api) {
      const min = v.tur === api.mig && !v.slut;
      const g = (n, s) => (v.fejl >= n ? s : '');
      const død = v.slut && !v.slut.vandt;
      let h = '<p class="hint center" style="margin:0">Kategori: <b>' + esc(v.hint) + '</b> · ' + (6 - v.fejl) + ' liv tilbage</p>'
        + '<svg viewBox="0 0 200 200" style="width:min(170px,46vw);display:block;margin:4px auto"><g stroke="#9fb0d6" stroke-width="6" stroke-linecap="round" fill="none">'
        + '<line x1="16" y1="190" x2="132" y2="190"/><line x1="54" y1="190" x2="54" y2="14"/><line x1="54" y1="14" x2="140" y2="14"/><line x1="140" y1="14" x2="140" y2="34"/></g>'
        + '<g stroke="' + (død ? '#ef476f' : '#ffd166') + '" stroke-width="6" stroke-linecap="round" fill="none">'
        + g(1, '<circle cx="140" cy="50" r="16"/>') + g(2, '<line x1="140" y1="66" x2="140" y2="116"/>') + g(3, '<line x1="140" y1="80" x2="118" y2="104"/>')
        + g(4, '<line x1="140" y1="80" x2="162" y2="104"/>') + g(5, '<line x1="140" y1="116" x2="122" y2="150"/>') + g(6, '<line x1="140" y1="116" x2="158" y2="150"/>') + '</g></svg>'
        + '<div style="font-size:clamp(26px,8vw,44px);font-weight:900;letter-spacing:.22em;text-align:center;margin:6px 0;word-break:break-all">' + esc((v.ord ? [...v.ord] : v.maske).join('')) + '</div>';
      if (v.sidst) h += '<p class="hint center">' + (v.sidst.tid ? '⏰ ' + esc(v.sidst.navn) + ' nåede ikke at gætte – <b>−' + STRAF + ' point</b>'
        : esc(v.sidst.navn) + ' gættede <b>' + esc(v.sidst.b) + '</b> ' + (v.sidst.ok ? '✅' : '❌')) + '</p>';
      if (v.slut) {
        h += '<div class="banner' + (v.slut.vandt ? ' min' : '') + '">' + (v.slut.vandt ? '🎉 ' + esc(api.navn(v.slut.af)) + ' løste ordet!' : '💀 Hængt! Ordet var ' + esc(v.ord)) + '</div>';
        if (api.vært) h += '<div class="hostbar"><button class="btn ok big" id="hg-ny">Nyt ord →</button></div>';
      } else {
        h += '<div class="banner' + (min ? ' min' : '') + '">' + (min ? '🎯 Din tur – vælg et bogstav' : '⏳ ' + esc(api.navn(v.tur)) + 's tur') + '</div><div id="hg-ur"></div>'
          + '<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px">' + (v.en ? ALF_EN : ALF).map(c => '<button class="btn" data-b="' + c + '" style="padding:10px 0;' + (v.gaet.includes(c) ? 'opacity:.2' : '') + '"' + (!min || v.gaet.includes(c) ? ' disabled' : '') + '>' + c + '</button>').join('') + '</div>'
          + (min ? '<div class="row" style="margin-top:12px"><input class="in" id="hg-helt" placeholder="Gæt hele ordet" style="font-size:16px"><button class="btn sec" id="hg-gaet" style="flex:0 0 30%">Gæt</button></div><p class="hint center">Forkert gæt på hele ordet koster 2 liv.</p>' : '');
      }
      const sig = JSON.stringify(v) + api.mig;
      if (el.dataset.s === sig) return; el.dataset.s = sig;
      if (v.sidst && el.dataset.sidst !== JSON.stringify(v.sidst)) { el.dataset.sidst = JSON.stringify(v.sidst); v.sidst.ok ? api.lyd.ok() : api.lyd.fejl(); if (v.slut && v.slut.vandt) api.lyd.vind(); }
      el.innerHTML = h;
      const ur = el.querySelector('#hg-ur'); if (ur) BS.turUr(ur, v.rest, FRIST);
      el.querySelectorAll('[data-b]').forEach(b => { b.onclick = () => { b.disabled = true; api.kald({ b: b.dataset.b }); }; });
      const gb = el.querySelector('#hg-gaet'); if (gb) gb.onclick = () => { const t = el.querySelector('#hg-helt').value.trim(); if (t) api.kald({ helt: t }); };
      const ny = el.querySelector('#hg-ny'); if (ny) ny.onclick = () => api.kald({ ny: 1 });
      if (min) api.vib(40);
    },
  });
})();
