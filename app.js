(() => {
  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];
  const routes = {
    "": renderHome,
    "/": renderHome,
    "/series/:id": renderSeries,
    "/series/:id/season/:n": renderSeason,
    "/echoes": renderEchoes,
    "/plots": renderPlots,
    "/grime": renderGrime,
    "/characters": renderCharacters,
  };
  const app = $("#app"), search = $("#search"),
        modal = $("#modal"), modalContent = $("#modalContent"), modalClose = $("#modalClose");

  // helpers
  // Episodes-only list for a season (no header, no banner)
  function seasonEpisodesList(s, ss){
    return `
      <section class="card section">
        <div class="season">
          ${ss.episodes.map(ep => `
            <div class="ep" data-series="${s.id}" data-season="${ss.n}" data-ep="${ep.n}">
              <div class="idx">E${ep.n}</div>
              <div>
                <h4>${ep.title}</h4>
                ${ep.summary ? `<p class="small">${ep.summary}</p>` : ``}
                <div class="tags">
                  ${(ep.tags||[]).map(t=>`<span class="badge">${t}</span>`).join(" ")}
                  ${(ep.plots||[]).map(p=>`<span class="badge">plot:${p}</span>`).join(" ")}
                </div>
              </div>
              <div><button class="btn js-open" data-series="${s.id}" data-season="${ss.n}" data-ep="${ep.n}">Details</button></div>
            </div>
          `).join(" ")}
        </div>
      </section>`;
  }

  function getSeries(id){ return DB.series.find(s=>s.id===id); }

  function seasonBlock(s, ss){
    const bannerImgs = buildSeasonBanner(s.id, ss.n, 5);
    return `
      <section class="card section">
        <h3>Season ${ss.n}: <span class="hl">${ss.title}</span></h3>
        ${renderBanner(bannerImgs)}
        <div class="season">
          ${ss.episodes.map(ep => `
            <div class="ep" data-series="${s.id}" data-season="${ss.n}" data-ep="${ep.n}">
              <div class="idx">E${ep.n}</div>
              <div>
                <h4>${ep.title}</h4>
                ${ep.summary ? `<p class="small">${ep.summary}</p>` : ``}
                <div class="tags">
                  ${(ep.tags||[]).map(t=>`<span class="badge">${t}</span>`).join(" ")}
                  ${(ep.plots||[]).map(p=>`<span class="badge">plot:${p}</span>`).join(" ")}
                </div>
              </div>
              <div><button class="btn js-open" data-series="${s.id}" data-season="${ss.n}" data-ep="${ep.n}">Details</button></div>
            </div>
          `).join(" ")}
        </div>
      </section>`;
  }

  // --- Gallery helpers ---
  function getFirstN(arr, n){ return (arr||[]).slice(0, n); }

  // Make a small banner for an episode using its gallery (fallback to promos if empty)
  function buildEpisodeBanner(seriesId, seasonN, epN, n=5){
    let imgs = buildEpisodeGallery(seriesId, seasonN, epN);
    if (!imgs.length && window.ASSETS_MANIFEST?.["0000"]) {
      imgs = getFirstN(ASSETS_MANIFEST["0000"].map(f=>`assets/0000/${f}`), n);
    }
    return getFirstN(imgs, n);
  }

  // Build a banner for a season using the first episode with images (fallback to promos)
  function buildSeasonBanner(seriesId, seasonN, n=5){
    const s = getSeries(seriesId); if(!s) return [];
    const ss = s.seasons.find(x=>x.n===Number(seasonN)); if(!ss) return [];
    for(const ep of ss.episodes){
      const imgs = buildEpisodeGallery(seriesId, seasonN, ep.n);
      if(imgs.length) return getFirstN(imgs, n);
    }
    // fallback to promos
    return getFirstN((ASSETS_MANIFEST?.["0000"]||[]).map(f=>`assets/0000/${f}`), n);
  }

  // Simple banner renderer
  function renderBanner(images){
    if(!images || !images.length) return "";
    return `<div class="banner5">
      ${images.map(src => `<img loading="lazy" src="${src}" alt="">`).join(" ")}
    </div>`;
  }

  function pad(n, w) { return String(n).padStart(w, '0'); }

  // Compute the global episode ordinal (1..54) across *all series in DB order*
  function episodeOrdinal(seriesId, seasonN, epN) {
    let ord = 0;
    for (const s of DB.series) {
      for (const season of s.seasons) {
        for (const ep of season.episodes) {
          ord += 1;
          if (s.id === seriesId && season.n === Number(seasonN) && ep.n === Number(epN)) {
            return ord;
          }
        }
      }
    }
    return null; // not found
  }

  // Build the 60 image URLs for this episode
  function buildEpisodeGallery(seriesId, seasonN, epN) {
    const k = episodeOrdinal(seriesId, seasonN, epN); // 1..54
    if (!k || !window.ASSETS_MANIFEST) return [];
    const urls = [];
    for (let f = 1; f <= 60; f++) {
      const folder = String(f).padStart(4, '0'); // "0001"..."0060"
      const files = (window.ASSETS_MANIFEST[folder] || []);
      const first = files[0] || "";
      const m = first.match(/_(\d{5})\.png$/i);
      const firstIs00000 = !!m && m[1] === "00000";
      const idx = firstIs00000 ? k : (k - 1);
      const fname = files[idx];
      if (fname) urls.push(`assets/${folder}/${fname}`);
    }
    return urls;
  }

  // --- Promo helpers (use manifest 0000) ---
  function promoFiles() {
    return (window.ASSETS_MANIFEST?.["0000"] || []).map(f => `assets/0000/${f}`);
  }

  function pickRandomN(arr, n){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a.slice(0, n);
  }

  function renderMainBannerMosaic(images){
    if(!images?.length) return "";
    return `<div class="banner5 banner--home">
      ${images.map(src=>`<figure><img loading="lazy" src="${src}" alt="Promo"></figure>`).join(" ")}
    </div>`;
  }

  // --- Renderers ---
  function renderHome() {
    app.classList.remove("grid-1");
    const promos = promoFiles();
    const bannerImgs = pickRandomN(promos, 5);
    const seriesCards = DB.series.map(s => `
      <section class="card">
        <h2>${s.title}</h2>
        <p class="small">${s.logline}</p>
        <div class="badges">
          ${(s.tags || []).map(t => `<span class="badge">${t}</span>`).join(" ")}
        </div>
        <hr class="sep"/>
        <div class="kv">
          <div>Seasons</div><div>${s.seasons.length}</div>
          <div>Episodes</div><div>${s.seasons.reduce((a,ss)=>a+ss.episodes.length,0)}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          ${s.seasons.map(ss=>`<a class="btn" href="#/series/${s.id}/season/${ss.n}">S${ss.n}: ${ss.title}</a>`).join(" ")}
        </div>
      </section>
    `).join(" ");
    app.innerHTML = `
      <section class="card" style="text-align:center">
        ${renderMainBannerMosaic(bannerImgs)}
      </section>
      ${seriesCards}
    `;
  }

  function renderSeries(params){
    const s = getSeries(params.id); if(!s) return renderNotFound();
    app.classList.add("grid-1");
    app.innerHTML = `
      <section class="card">
        <h2>${s.title}</h2>
        <p class="small">${s.logline}</p>
        <div class="badges">${s.tags.map(t=>`<span class="badge">${t}</span>`).join(" ")}</div>
      </section>
      ${s.seasons.map(ss=> seasonBlock(s, ss)).join(" ")}
    `;
  }

  function renderSeason(params){
    const s = getSeries(params.id); if(!s) return renderNotFound();
    const ss = s.seasons.find(x=> String(x.n)===String(params.n)); if(!ss) return renderNotFound();
    app.classList.add("grid-1");
    app.innerHTML = `
      <section class="card">
        <a class="btn" href="#/series/${s.id}">← ${s.title}</a>
        <h2 style="margin-top:10px">Season ${ss.n}: <span class="hl">${ss.title}</span></h2>
        <div id="__season_banner__"></div>
        <p class="small">${s.logline}</p>
      </section>
      ${seasonEpisodesList(s, ss)}
    `;
    const bannerImgs = buildSeasonBanner(s.id, ss.n, 5);
    $("#__season_banner__").outerHTML = renderBanner(bannerImgs);
  }

  function renderEchoes(){
    app.classList.add("grid-1");
    app.innerHTML = `
      <section class="card">
        <h2>Echo Timeline</h2>
        <p class="small">Cross-series rhymes and callbacks.</p>
        <div class="season">
          ${DB.echoes.map(e => `
            <div class="ep">
              <div class="idx">⟲</div>
              <div>
                <h4>${e.title}</h4>
                <p class="small">${e.notes}</p>
                <div class="tags">
                  ${e.refs.map(([sid,sn,en]) => {
                    const series = getSeries(sid); const season = series?.seasons.find(ss=>ss.n===sn);
                    const ep = season?.episodes.find(x=>x.n===en);
                    return `<a class="badge" href="#/series/${sid}/season/${sn}" title="${series?.title} S${sn}E${en}">${series?.title} S${sn}E${en}${ep?": "+ep.title:" "}</a>`;
                  }).join(" ")}
                </div>
              </div>
            </div>
          `).join(" ")}
        </div>
      </section>
    `;
  }

  function renderPlots(){
    const table = collectPlots();
    app.classList.add("grid-1");
    app.innerHTML = `
      <section class="card">
        <h2>Plot Tracker</h2>
        <p class="small">All threads across both series. Click a chip to jump to the season.</p>
      </section>
      ${Object.keys(table).sort().map(name => {
        const rows = table[name];
        return `
          <section class="card">
            <h3>${name}</h3>
            <div class="chips">
              ${rows.map(r => `<a class="chip" href="#/series/${r.sid}/season/${r.sn}" title="${r.seriesTitle} S${r.sn}E${r.en}">${r.seriesShort} S${r.sn}E${r.en}</a>`).join(" ")}
            </div>
          </section>
        `;
      }).join(" ")}
    `;
  }

  function collectPlots(){
    const out = {};
    DB.series.forEach(s=>{
      s.seasons.forEach(ss=>{
        ss.episodes.forEach(ep=>{
          (ep.plots||[]).forEach(p=>{
            if(!out[p]) out[p]=[];
            out[p].push({sid:s.id,sn:ss.n,en:ep.n,seriesTitle:s.title,seriesShort:s.title.includes("Ankyra")?"CFA":"SC"});
          });
        });
      });
    });
    return out;
  }

  function renderGrime(){
    const items = collectGrime();
    app.classList.add("grid-1");
    const list = Object.entries(items).sort((a,b)=>a[0].localeCompare(b[0]));
    app.innerHTML = `
      <section class="card">
        <h2>Grime & Crud Index</h2>
        <div class="filterbar">
          <input id="grimeSearch" class="input" placeholder="Filter grime motif (e.g., 'phlegm', 'mold', 'sewer')"/>
        </div>
      </section>
      <section class="card section" id="grimeList">
        ${renderGrimeList(list)}
      </section>
    `;
    $("#grimeSearch").addEventListener("input", e=>{
      const q = e.target.value.trim().toLowerCase();
      const filtered = list.filter(([k]) => k.toLowerCase().includes(q));
      $("#grimeList").innerHTML = renderGrimeList(filtered);
    });
  }

  function collectGrime(){
    const map = {};
    DB.series.forEach(s=>{
      s.seasons.forEach(ss=>{
        ss.episodes.forEach(ep=>{
          (ep.grime||[]).forEach(g=>{
            if(!map[g]) map[g]=[];
            map[g].push({sid:s.id,sn:ss.n,en:ep.n,series:s.title});
          });
        });
      });
    });
    return map;
  }

  function renderGrimeList(entries){
    if(!entries.length) return `<p class="small">No matches.</p>`;
    return `
      <div class="season">
        ${entries.map(([k,refs])=>`
          <div class="ep">
            <div class="idx">☣</div>
            <div>
              <h4>${k}</h4>
              <div class="tags">
                ${refs.map(r=>`<a class="badge" href="#/series/${r.sid}/season/${r.sn}">${r.series} S${r.sn}E${r.en}</a>`).join(" ")}
              </div>
            </div>
          </div>
        `).join(" ")}
      </div>
    `;
  }

  function allCharacters(){
    const out = [];
    DB.series.forEach(s => (s.characters||[]).forEach(c=>{
      if(c.ref){
        const [sid, id] = c.ref.split(":");
        const srcSeries = getSeries(sid);
        const srcChar = (srcSeries.characters||[]).find(cc=>cc.id===id);
        out.push({...srcChar, from:`${srcSeries.title} → ${s.title}`});
      } else {
        out.push({...c, from:s.title});
      }
    }));
    const map = new Map(); out.forEach(c=>{ if(!map.has(c.name)) map.set(c.name,c); });
    return [...map.values()];
  }

  function renderCharacters(){
    const chars = allCharacters().sort((a,b)=>a.name.localeCompare(b.name));
    app.classList.remove("grid-1");
    app.innerHTML = chars.map(c=>`
      <section class="card">
        <h3>${c.name}</h3>
        ${c.bio?`<p class="small">${c.bio}</p>`:""}
        <div class="badges">${(c.tags||[]).map(t=>`<span class="badge">${t}</span>`).join(" ")}</div>
        ${c.from?`<p class="small">Appears in: ${c.from}</p>`:""}
      </section>
    `).join(" ");
  }

  function renderNotFound(){
    app.classList.add("grid-1");
    app.innerHTML = `<section class="card"><h2>Not found</h2><p class="small">That route doesn’t exist.</p></section>`;
  }

  // Router
  function parseHash(){
    const segs = location.hash.replace(/^#/, "").split("/").filter(Boolean);
    const table = [
      {pat:[], fn:""},
      {pat:["series",":id"], fn:"/series/:id"},
      {pat:["series",":id","season",":n"], fn:"/series/:id/season/:n"},
      {pat:["echoes"], fn:"/echoes"},
      {pat:["plots"], fn:"/plots"},
      {pat:["grime"], fn:"/grime"},
      {pat:["characters"], fn:"/characters"},
    ];
    for(const r of table){
      if(r.pat.length!==segs.length) continue;
      let ok=true, params={};
      for(let i=0;i<segs.length;i++){
        if(r.pat[i]?.startsWith(":")) params[r.pat[i].slice(1)] = decodeURIComponent(segs[i]);
        else if(r.pat[i]!==segs[i]) { ok=false; break; }
      }
      if(ok) return {path:r.fn, params};
    }
    return {path:(segs.length?"/404":"/"), params:{}};
  }

  function tick(){ const {path, params} = parseHash(); (routes[path]||renderNotFound)(params); }

  window.addEventListener("hashchange", tick);
  window.addEventListener("load", tick);

  // Episode modal (plots + grime + beats + gallery without diagnostics)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-open");
    if (!btn) return;
    const sid = btn.dataset.series, sn = +btn.dataset.season, en = +btn.dataset.ep;
    const s = getSeries(sid);
    const ss = s?.seasons.find(x => x.n === sn);
    const ep = ss?.episodes.find(x => x.n === en);

    // Build base HTML with a placeholder for the banner
    modalContent.innerHTML = `
      <h2 id="modal-title">${s.title} — S${sn}E${en}: <span class="hl">${ep.title}</span></h2>
      <div id="__banner__"></div>
      ${ep.summary ? `<p>${ep.summary}</p>` : ""}
      <div class="meta">
        ${(ep.tags || []).map(t => `<span class="badge">${t}</span>`).join(" ")}
      </div>
      ${(ep.plots && ep.plots.length) ? `<h3>Plots</h3><ul class="list">${ep.plots.map(p => `<li>${p}</li>`).join(" ")}</ul>` : " "}
      ${(ep.grime && ep.grime.length) ? `<h3>Grime & Crud</h3><ul class="list">${ep.grime.map(g => `<li>${g}</li>`).join(" ")}</ul>` : " "}
      ${(ep.beats && ep.beats.length) ? `<h3>Beats</h3><ul class="list">${ep.beats.map(b => `<li>${b}</li>`).join(" ")}</ul>` : " "}
      ${(ep.echoes || []).length ? `<div class="alert small"><strong>Echoes:</strong> ${ep.echoes.map(ec => ec.note).join(" • ")}</div>` : " "}
    `;

    // Fill the banner placeholder
    const bannerImgs = buildEpisodeBanner(s.id, ss.n, ep.n, 5);
    $("#__banner__").outerHTML = renderBanner(bannerImgs);

    // Gallery without debug
    const gallery = buildEpisodeGallery(s.id, ss.n, ep.n);
    if (gallery.length) {
      modalContent.insertAdjacentHTML("beforeend", `
        <h3>Gallery (${gallery.length} images)</h3>
        <div class="gallery">
          ${gallery.map(src => `
            <figure title="${src}">
              <img loading="lazy" src="${src}" alt="">
            </figure>
          `).join("")}
        </div>
      `);
    } else {
      const msg = !window.ASSETS_MANIFEST
        ? `No gallery yet — generate <code>assets_manifest.js</code> with <code>node scripts/build-manifest.js</code>.`
        : `No images selected. Check each folder 0001…0060 has at least <code>${episodeOrdinal(s.id, ss.n, ep.n)}</code> files and filenames end with <code>_00001.png</code>… style 5-digit indices.`;
      modalContent.insertAdjacentHTML("beforeend", `<div class="alert small">${msg}</div>`);
    }

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  });

  function closeModal(){ modal.classList.remove("open"); modal.setAttribute("aria-hidden","true"); }

  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeModal(); });

  // Global search now includes plots + grime
  search.addEventListener("input", ()=>{
    const q = search.value.trim().toLowerCase();
    if(!q){ tick(); return; }
    app.classList.add("grid-1");
    const hits = [];
    DB.series.forEach(s=>{
      s.seasons.forEach(ss=>{
        ss.episodes.forEach(ep=>{
          const hay = [
            s.title, ss.title, ep.title,
            (ep.summary||" "), ...(ep.tags||[]), ...(ep.chars||[]),
            ...(ep.plots||[]), ...(ep.grime||[])
          ].join(" ").toLowerCase();
          if(hay.includes(q)) hits.push({s, ss, ep});
        });
      });
    });
    app.innerHTML = `
      <section class="card">
        <h2>Search results for “${q}”</h2>
        <p class="small">${hits.length} match(es)</p>
      </section>
      <section class="card section">
        <div class="season">
          ${hits.map(({s,ss,ep})=>`
            <div class="ep">
              <div class="idx">S${ss.n}E${ep.n}</div>
              <div>
                <h4>${s.title}: ${ep.title}</h4>
                ${ep.summary?`<p class="small">${ep.summary}</p>`:" "}
                ${(ep.plots&&ep.plots.length)?`<div class="tags">${ep.plots.map(p=>`<span class="badge">plot:${p}</span>`).join(" ")}</div>`:" "}
                ${(ep.grime&&ep.grime.length)?`<div class="tags">${ep.grime.slice(0,3).map(g=>`<span class="badge">grime:${g}</span>`).join(" ")}${ep.grime.length>3?`<span class="badge">+${ep.grime.length-3} more</span>`:" "}</div>`:" "}
              </div>
              <div><a class="btn" href="#/series/${s.id}/season/${ss.n}">Open</a></div>
            </div>
          `).join(" ")}
        </div>
      </section>
    `;
  });
})();