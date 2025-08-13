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
  function getSeries(id){ return DB.series.find(s=>s.id===id); }
  function seasonBlock(s, ss){
    return `
    <section class="card section">
      <h3>Season ${ss.n}: <span class="hl">${ss.title}</span></h3>
      <div class="season">
        ${ss.episodes.map(ep => `
          <div class="ep" data-series="${s.id}" data-season="${ss.n}" data-ep="${ep.n}">
            <div class="idx">E${ep.n}</div>
            <div>
              <h4>${ep.title}</h4>
              ${ep.summary ? `<p class="small">${ep.summary}</p>` : ``}
              <div class="tags">
                ${(ep.tags||[]).map(t=>`<span class="badge">${t}</span>`).join("")}
                ${(ep.plots||[]).map(p=>`<span class="badge">plot:${p}</span>`).join("")}
              </div>
            </div>
            <div><button class="btn js-open" data-series="${s.id}" data-season="${ss.n}" data-ep="${ep.n}">Details</button></div>
          </div>
        `).join("")}
      </div>
    </section>`;
  }

  // renderers
  function renderHome(){
    app.classList.remove("grid-1");
    app.innerHTML = DB.series.map(s => `
      <section class="card">
        <h2>${s.title}</h2>
        <p class="small">${s.logline}</p>
        <div class="badges">${s.tags.map(t=>`<span class="badge">${t}</span>`).join("")}</div>
        <hr class="sep"/>
        <div class="kv">
          <div>Seasons</div><div>${s.seasons.length}</div>
          <div>Episodes</div><div>${s.seasons.reduce((a,ss)=>a+ss.episodes.length,0)}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          ${s.seasons.map(ss=>`<a class="btn" href="#/series/${s.id}/season/${ss.n}">S${ss.n}: ${ss.title}</a>`).join("")}
        </div>
      </section>
    `).join("");
  }
  function renderSeries(params){
    const s = getSeries(params.id); if(!s) return renderNotFound();
    app.classList.add("grid-1");
    app.innerHTML = `
      <section class="card">
        <h2>${s.title}</h2>
        <p class="small">${s.logline}</p>
        <div class="badges">${s.tags.map(t=>`<span class="badge">${t}</span>`).join("")}</div>
      </section>
      ${s.seasons.map(ss=> seasonBlock(s, ss)).join("")}
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
        <p class="small">${s.logline}</p>
      </section>
      ${seasonBlock(s, ss)}
    `;
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
                    return `<a class="badge" href="#/series/${sid}/season/${sn}" title="${series?.title} S${sn}E${en}">${series?.title} S${sn}E${en}${ep?": "+ep.title:""}</a>`;
                  }).join("")}
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  // Plot Tracker
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
              ${rows.map(r => `<a class="chip" href="#/series/${r.sid}/season/${r.sn}" title="${r.seriesTitle} S${r.sn}E${r.en}">${r.seriesShort} S${r.sn}E${r.en}</a>`).join("")}
            </div>
          </section>
        `;
      }).join("")}
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

  // Grime Index
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
                ${refs.map(r=>`<a class="badge" href="#/series/${r.sid}/season/${r.sn}">${r.series} S${r.sn}E${r.en}</a>`).join("")}
              </div>
            </div>
          </div>
        `).join("")}
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
        <div class="badges">${(c.tags||[]).map(t=>`<span class="badge">${t}</span>`).join("")}</div>
        ${c.from?`<p class="small">Appears in: ${c.from}</p>`:""}
      </section>
    `).join("");
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

  // Episode modal (now shows plots + grime + beats)
  document.addEventListener("click", (e)=>{
    const btn = e.target.closest(".js-open");
    if(btn){
      const sid = btn.dataset.series, sn = +btn.dataset.season, en = +btn.dataset.ep;
      const s = getSeries(sid); const ss = s.seasons.find(x=>x.n===sn); const ep = ss.episodes.find(x=>x.n===en);
      modalContent.innerHTML = `
        <h2 id="modal-title">${s.title} — S${sn}E${en}: <span class="hl">${ep.title}</span></h2>
        ${ep.summary?`<p>${ep.summary}</p>`:""}
        <div class="meta">
          ${(ep.tags||[]).map(t=>`<span class="badge">${t}</span>`).join("")}
        </div>
        ${(ep.plots&&ep.plots.length)?`
          <h3>Plots</h3>
          <ul class="list">${ep.plots.map(p=>`<li>${p}</li>`).join("")}</ul>
        `:""}
        ${(ep.grime&&ep.grime.length)?`
          <h3>Grime & Crud</h3>
          <ul class="list">${ep.grime.map(g=>`<li>${g}</li>`).join("")}</ul>
        `:""}
        ${(ep.beats&&ep.beats.length)?`
          <h3>Beats</h3>
          <ul class="list">${ep.beats.map(b=>`<li>${b}</li>`).join("")}</ul>
        `:""}
        ${(ep.echoes||[]).length?`<div class="alert small"><strong>Echoes:</strong> ${ep.echoes.map(ec=>ec.note).join(" • ")}</div>`:""}
      `;
      modal.classList.add("open"); modal.setAttribute("aria-hidden","false");
    }
    if(e.target.id==="modalClose" || e.target===modal){ closeModal(); }
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
            (ep.summary||""), ...(ep.tags||[]), ...(ep.chars||[]),
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
                ${ep.summary?`<p class="small">${ep.summary}</p>`:""}
                ${(ep.plots&&ep.plots.length)?`<div class="tags">${ep.plots.map(p=>`<span class="badge">plot:${p}</span>`).join("")}</div>`:""}
                ${(ep.grime&&ep.grime.length)?`<div class="tags">${ep.grime.slice(0,3).map(g=>`<span class="badge">grime:${g}</span>`).join("")}${ep.grime.length>3?`<span class="badge">+${ep.grime.length-3} more</span>`:""}</div>`:""}
              </div>
              <div><a class="btn" href="#/series/${s.id}/season/${ss.n}">Open</a></div>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  });
})();

