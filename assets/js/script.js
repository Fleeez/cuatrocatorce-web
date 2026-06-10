/* 414 Galería — script.js v2.5.0 */
(function () {
  'use strict';

  /* ── Utilidades ────────────────────────────────────── */
  var $ = function(id){ return document.getElementById(id); };
  var qs  = function(s,c){ return (c||document).querySelector(s); };
  var qsa = function(s,c){ return Array.prototype.slice.call((c||document).querySelectorAll(s)); };
  var fmt = function(n){ return '$' + Number(n).toLocaleString('es-AR',{maximumFractionDigits:0}); };

  /* ── Config ────────────────────────────────────────── */
  var G             = (typeof G414 !== 'undefined') ? G414 : {};
  var WA_NUMBER     = G.waNumber      || '5493513073743';
  var CONSENT_ON    = G.consentEnabled !== '0';
  var AJAXURL       = G.ajaxurl       || '/wp-admin/admin-ajax.php';
  var NONCE         = G.nonce         || '';
  var RULETA_CFG    = G.ruleta        || {};
  var PREMIOS       = RULETA_CFG.premios    || [];
  var COOLDOWN_MINS = parseInt(RULETA_CFG.cooldownMins || '120', 10);
  var COOLDOWN_MS   = COOLDOWN_MINS * 60 * 1000;
  var COOLDOWN_KEY  = 'g414_ruleta_v1';

  /* ══════════════════════════════════════════════════
     1. NAVBAR
  ══════════════════════════════════════════════════ */
  (function initNavbar() {
    var nb = qs('#navbar'); if (!nb) return;
    var burger = qs('.hamburger', nb);
    var menu   = $('mobile-menu');
    var links  = qsa('.mm-link', menu);

    function setScrolled(){ nb.classList.toggle('scrolled', window.scrollY > 50); }
    setScrolled();
    window.addEventListener('scroll', setScrolled, { passive:true });

    if (burger && menu) {
      burger.addEventListener('click', function(){
        var open = menu.classList.toggle('open');
        burger.classList.toggle('open', open);
        burger.setAttribute('aria-expanded', String(open));
        document.body.style.overflow = open ? 'hidden' : '';
      });
      links.forEach(function(l){
        l.addEventListener('click', function(){
          menu.classList.remove('open');
          burger.classList.remove('open');
          burger.setAttribute('aria-expanded','false');
          document.body.style.overflow = '';
        });
      });
    }
  })();

  /* ══════════════════════════════════════════════════
     2. REVEAL ON SCROLL
  ══════════════════════════════════════════════════ */
  (function initReveal() {
    if (!('IntersectionObserver' in window)) {
      qsa('.reveal').forEach(function(el){ el.classList.add('visible'); });
      return;
    }
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { rootMargin:'0px 0px -60px 0px', threshold:0.07 });
    qsa('.reveal').forEach(function(el){ obs.observe(el); });
  })();

  /* ══════════════════════════════════════════════════
     3. LAZY VIDEO
  ══════════════════════════════════════════════════ */
  (function initLazyVideo() {
    var videos = qsa('.lazy-video');
    if (!videos.length) return;
    if (!('IntersectionObserver' in window)) {
      videos.forEach(function(v){
        var s = v.querySelector('source[data-src]');
        if (s){ s.src = s.getAttribute('data-src'); s.removeAttribute('data-src'); v.load(); }
      });
      return;
    }
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (!e.isIntersecting) return;
        var v = e.target;
        var s = v.querySelector('source[data-src]');
        if (s){ s.src = s.getAttribute('data-src'); s.removeAttribute('data-src'); v.load(); v.play().catch(function(){}); }
        obs.unobserve(v);
      });
    }, { rootMargin:'200px' });
    videos.forEach(function(v){ obs.observe(v); });
  })();

  /* ══════════════════════════════════════════════════
     4. LIGHTBOX (imagen + video + History API)
  ══════════════════════════════════════════════════ */
  (function initLightbox() {
    var lb = $('lightbox'); if (!lb) return;
    var content = $('lb-content');
    var counter = $('lb-counter');
    var items   = qsa('.gal-item:not(.slot-empty)[data-lb-src]').filter(function(el){
      return el.getAttribute('data-lb-src');
    });
    var cur = 0, histPushed = false;

    function openLb(idx) {
      if (!items.length) return;
      cur = ((idx % items.length) + items.length) % items.length;
      render();
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (!histPushed){ history.pushState({lbOpen:true},''); histPushed=true; _modalStack.push('__lightbox__'); }
    }
    function closeLb() {
      lb.classList.remove('open');
      document.body.style.overflow = '';
      content.innerHTML = '';
      histPushed = false;
    }
    function render() {
      content.innerHTML = '';
      var el   = items[cur];
      var src  = el.getAttribute('data-lb-src');
      var type = el.getAttribute('data-lb-type') || 'image';
      if (type === 'video') {
        var v = document.createElement('video');
        v.src = src; v.autoplay = true; v.muted = true; v.loop = true; v.controls = true;
        v.style.cssText = 'max-width:90vw;max-height:86svh;border-radius:12px';
        content.appendChild(v);
      } else {
        var img = document.createElement('img');
        img.src = src; img.alt = '';
        content.appendChild(img);
      }
      if (counter) counter.textContent = (cur+1) + ' / ' + items.length;
    }

    qsa('.gal-item:not(.slot-empty)[data-lb-src]').forEach(function(el){
      if (!el.getAttribute('data-lb-src')) return;
      el.addEventListener('click', function(){ openLb(items.indexOf(el)); });
      el.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openLb(items.indexOf(el)); } });
    });

    var closeBtn = $('lb-close'); if(closeBtn) closeBtn.addEventListener('click', closeLb);
    var prevBtn  = $('lb-prev');  if(prevBtn)  prevBtn.addEventListener('click', function(){ openLb(cur-1); });
    var nextBtn  = $('lb-next');  if(nextBtn)  nextBtn.addEventListener('click', function(){ openLb(cur+1); });
    lb.addEventListener('click', function(e){ if(e.target===lb) closeLb(); });
    document.addEventListener('keydown', function(e){
      if (!lb.classList.contains('open')) return;
      if (e.key==='Escape') closeLb();
      if (e.key==='ArrowLeft')  openLb(cur-1);
      if (e.key==='ArrowRight') openLb(cur+1);
    });
    var tx = 0;
    lb.addEventListener('touchstart', function(e){ tx = e.changedTouches[0].clientX; }, {passive:true});
    lb.addEventListener('touchend',   function(e){ var dx=e.changedTouches[0].clientX-tx; if(Math.abs(dx)>50){ dx<0?openLb(cur+1):openLb(cur-1); } });
    // Integrar closeLb con el stack unificado de modales
    var _origCloseLb = closeLb;
    closeLb = function() {
      _origCloseLb();
      var lbIdx = _modalStack.indexOf('__lightbox__');
      if (lbIdx !== -1) _modalStack.splice(lbIdx, 1);
      histPushed = false;
      if (_modalStack.length === 0) document.body.style.overflow = '';
    };
    // Registrar que el lightbox es cerrable via closeTopModal
    var _baseCloseTop = closeTopModal;
    closeTopModal = function() {
      if (_modalStack.length > 0 && _modalStack[_modalStack.length-1] === '__lightbox__') {
        closeLb(); return true;
      }
      return _baseCloseTop();
    };
  })();

  /* ══════════════════════════════════════════════════
     5. MODAL HELPER — con History API para interceptar
        swipe-back / gesto atras en mobile sin cerrar la pagina
  ══════════════════════════════════════════════════ */
  var _modalStack = [];

  function openModal(id) {
    var m = $(id); if (!m) return;
    m.classList.add('open');
    m.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    history.pushState({ modalOpen: id }, '');
    _modalStack.push(id);
  }
  function closeModal(id) {
    var m = $(id); if (!m) return;
    m.classList.remove('open');
    m.style.display = '';
    var idx = _modalStack.indexOf(id);
    if (idx !== -1) _modalStack.splice(idx, 1);
    if (_modalStack.length === 0) document.body.style.overflow = '';
  }
  function closeTopModal() {
    if (_modalStack.length === 0) return false;
    var id = _modalStack[_modalStack.length - 1];
    closeModal(id);
    return true;
  }
  function setupClose(mid, bid) {
    var b = $(bid); if(b) b.addEventListener('click', function(){ closeModal(mid); });
    var m = $(mid); if(m) m.addEventListener('click', function(e){ if(e.target===m) closeModal(mid); });
    document.addEventListener('keydown', function(e){
      if (e.key==='Escape' && m && m.classList.contains('open')) closeModal(mid);
    });
  }
  setupClose('modal-ruleta',  'close-modal-ruleta');
  setupClose('modal-item',    'close-modal-item');
  setupClose('modal-order',   'close-modal-order');

  // popstate unificado: intercepta swipe-back sin salir de la pagina
  window.addEventListener('popstate', function() {
    if (closeTopModal()) return;
    // si no habia modal, dejar que el lightbox maneje (seccion 4)
  });

  /* ══════════════════════════════════════════════════
     6. CONSENTIMIENTO
  ══════════════════════════════════════════════════ */
  (function initConsent() {
    var modal  = $('consent-modal'); if (!modal) return;
    var accept = $('consent-accept-btn');
    var reject = $('consent-reject-btn');
    var pendingAction = null;

    if (!CONSENT_ON || sessionStorage.getItem('g414_consent') === '1') {
      modal.style.display = 'none'; return;
    }

    function requireConsent(cb) {
      if (sessionStorage.getItem('g414_consent') === '1') { cb(); return; }
      pendingAction = cb;
      modal.style.display = 'flex';
    }

    window.g414RequireConsent = requireConsent;

    if (accept) {
      accept.addEventListener('click', function(){
        sessionStorage.setItem('g414_consent','1');
        modal.style.display = 'none';
        if (pendingAction) { pendingAction(); pendingAction = null; }
      });
    }
    if (reject) {
      reject.addEventListener('click', function(){ modal.style.display = 'none'; pendingAction = null; });
    }
  })();

  /* ══════════════════════════════════════════════════
     7. RULETA SVG INTERACTIVA
  ══════════════════════════════════════════════════ */
  (function initRuleta() {
    var svgEl       = $('ruleta-svg');
    var wheelWrap   = $('ruleta-wheel-wrap');
    var statusCard  = $('ruleta-status-card');
    var resultIcon  = $('ruleta-result-icon');
    var resultLbl   = $('ruleta-result-lbl');
    var resultMsg   = $('ruleta-result-msg');
    var btnAgain    = $('btn-ruleta-again');
    var coolWrap    = $('ruleta-cooldown-wrap');
    var clockEl     = $('ruleta-clock-display');
    var formWrap    = $('ruleta-form-wrap');
    var resultWrap  = $('ruleta-result-wrap');
    var ruletaForm  = $('ruleta-form');
    var btnGirar    = $('btn-girar');
    var modalEmoji  = $('ruleta-modal-emoji');
    var modalPremio = $('ruleta-modal-premio');
    var modalDesc   = $('ruleta-modal-desc');
    var btnRetry    = $('btn-retry-ruleta');
    var spinning    = false;
    var totalRot    = 0;
    var cdTimer     = null;

    /* -- Construir SVG -- */
    function buildWheel(premios) {
      if (!svgEl || !premios || !premios.length) return;
      while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
      var ns = 'http://www.w3.org/2000/svg';
      var cx = 160, cy = 160, r = 155;

      // Fondo
      var bg = document.createElementNS(ns,'circle');
      bg.setAttribute('cx',cx); bg.setAttribute('cy',cy); bg.setAttribute('r',r);
      bg.setAttribute('fill','#120828'); svgEl.appendChild(bg);

      premios.forEach(function(p){
        var sRad = (p.startDeg - 90) * Math.PI / 180;
        var eRad = (p.endDeg   - 90) * Math.PI / 180;
        var x1 = cx + r * Math.cos(sRad), y1 = cy + r * Math.sin(sRad);
        var x2 = cx + r * Math.cos(eRad), y2 = cy + r * Math.sin(eRad);
        var la = (p.endDeg - p.startDeg > 180) ? 1 : 0;

        var path = document.createElementNS(ns,'path');
        path.setAttribute('d','M '+cx+','+cy+' L '+x1+','+y1+' A '+r+','+r+' 0 '+la+' 1 '+x2+','+y2+' Z');
        path.setAttribute('fill', p.color || '#3d1b6e');
        path.setAttribute('stroke','#07040f'); path.setAttribute('stroke-width','2');
        svgEl.appendChild(path);

        var span = p.endDeg - p.startDeg;
        if (span < 8) return;
        var midDeg = (p.startDeg + p.endDeg) / 2;
        var midRad = (midDeg - 90) * Math.PI / 180;
        var tr = r * 0.62;
        var tx = cx + tr * Math.cos(midRad), ty = cy + tr * Math.sin(midRad);
        var fs = span < 25 ? '9' : (span < 40 ? '10' : '11');
        var words = (p.label || '').split(' ');
        var l1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
        var l2 = words.slice(Math.ceil(words.length / 2)).join(' ');

        var g = document.createElementNS(ns,'g');
        g.setAttribute('transform','rotate('+midDeg+','+tx+','+ty+')');

        function addTxt(txt, dy) {
          if (!txt) return;
          var t = document.createElementNS(ns,'text');
          t.setAttribute('x',tx); t.setAttribute('y',ty); t.setAttribute('dy',dy);
          t.setAttribute('text-anchor','middle'); t.setAttribute('dominant-baseline','middle');
          t.setAttribute('fill','#fff'); t.setAttribute('font-family','Oswald,Arial Narrow,sans-serif');
          t.setAttribute('font-size',fs); t.setAttribute('font-weight','700');
          t.setAttribute('paint-order','stroke'); t.setAttribute('stroke','rgba(0,0,0,.8)'); t.setAttribute('stroke-width','3');
          t.textContent = txt; g.appendChild(t);
        }
        if (l2) { addTxt(l1,'-6'); addTxt(l2,'8'); } else { addTxt(l1,'0'); }
        svgEl.appendChild(g);
      });

      // Borde exterior magenta
      var brd = document.createElementNS(ns,'circle');
      brd.setAttribute('cx',cx); brd.setAttribute('cy',cy); brd.setAttribute('r',r);
      brd.setAttribute('fill','none'); brd.setAttribute('stroke','rgba(200,51,138,.7)'); brd.setAttribute('stroke-width','3');
      svgEl.appendChild(brd);

      // Segundo borde más brillante
      var brd2 = document.createElementNS(ns,'circle');
      brd2.setAttribute('cx',cx); brd2.setAttribute('cy',cy); brd2.setAttribute('r',r-4);
      brd2.setAttribute('fill','none'); brd2.setAttribute('stroke','rgba(255,255,255,.06)'); brd2.setAttribute('stroke-width','2');
      svgEl.appendChild(brd2);

      // Anillo interior decorativo
      var inner = document.createElementNS(ns,'circle');
      inner.setAttribute('cx',cx); inner.setAttribute('cy',cy); inner.setAttribute('r', Math.round(r * 0.22));
      inner.setAttribute('fill','rgba(0,0,0,.35)'); inner.setAttribute('stroke','rgba(200,51,138,.3)'); inner.setAttribute('stroke-width','1.5');
      svgEl.appendChild(inner);
    }

    /* -- Selección ponderada por prob (segmentos visualmente iguales) -- */
    function selectWinner(premios) {
      var total = premios.reduce(function(s,p){ return s + (p.prob || 1); }, 0);
      var rnd = Math.random() * total, acc = 0;
      for (var i = 0; i < premios.length; i++) {
        acc += (premios[i].prob || 1);
        if (rnd <= acc) return premios[i];
      }
      return premios[premios.length - 1];
    }

    /* -- Animación -- */
    function spinWheel(winner, cb) {
      if (!wheelWrap) return;
      var midDeg  = (winner.startDeg + winner.endDeg) / 2;
      var adjust  = (360 - (midDeg % 360)) % 360;
      totalRot   += 5 * 360 + adjust;
      wheelWrap.style.transition = 'transform 4s cubic-bezier(0.17,0.67,0.12,0.99)';
      wheelWrap.style.transform  = 'rotate(' + totalRot + 'deg)';
      setTimeout(function(){ wheelWrap.style.transition = ''; if (cb) cb(); }, 4300);
    }

    /* -- Cooldown -- */
    function setCooldown()  { try{ localStorage.setItem(COOLDOWN_KEY, String(Date.now() + COOLDOWN_MS)); }catch(e){} }
    function getRem()       { try{ var v=localStorage.getItem(COOLDOWN_KEY); if(!v)return 0; var r=parseInt(v,10)-Date.now(); return r>0?r:0; }catch(e){return 0;} }
    function fmtTime(ms)    { var s=Math.floor(ms/1000),h=Math.floor(s/3600); s-=h*3600; var m=Math.floor(s/60); s-=m*60; return (h?h+'h ':'')+('0'+m).slice(-2)+':'+('0'+s).slice(-2); }
    function startCd() {
      if (cdTimer) clearInterval(cdTimer);
      function tick(){ var r=getRem(); if(r<=0){ clearInterval(cdTimer); cdTimer=null; showForm(); return; } if(clockEl) clockEl.textContent=fmtTime(r); }
      tick(); cdTimer = setInterval(tick, 1000);
    }

    /* -- Confetti -- */
    function spawnConfetti(container) {
      if (!container) return;
      container.innerHTML = '';
      var colors = ['#c8338a','#3d1b6e','#e8c842','#d62d2d','#fff','#b85420','#a0f0a0'];
      for (var i = 0; i < 48; i++) {
        var p = document.createElement('div');
        p.className = 'confetti-piece';
        p.style.left   = Math.random() * 100 + '%';
        p.style.top    = '-8px';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.animationDuration  = (1.2 + Math.random() * 2) + 's';
        p.style.animationDelay     = (Math.random() * 0.8) + 's';
        p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        p.style.width  = (6 + Math.random() * 5) + 'px';
        p.style.height = (6 + Math.random() * 5) + 'px';
        container.appendChild(p);
      }
    }

    /* -- Vistas del modal -- */
    function showCooldown() { if(coolWrap){coolWrap.style.display='flex';} if(formWrap){formWrap.style.display='none';} if(resultWrap){resultWrap.style.display='none';} startCd(); }
    function showForm()     { if(coolWrap){coolWrap.style.display='none';} if(formWrap){formWrap.style.display='block';} if(resultWrap){resultWrap.style.display='none';} }
    function showResult(w)  {
      if(coolWrap){coolWrap.style.display='none';} if(formWrap){formWrap.style.display='none';} if(resultWrap){resultWrap.style.display='block';}
      var win = w.id !== 'p8';
      if(modalEmoji)  modalEmoji.textContent  = win ? '🎉' : '😅';
      if(modalPremio) modalPremio.textContent = w.label || '';
      if(modalDesc)   modalDesc.textContent   = w.desc  || '';
      if(resultIcon)  resultIcon.textContent  = win ? '🎉' : '🎡';
      if(resultLbl)   resultLbl.textContent   = win ? 'Premio ganado' : 'Esta vez no';
      if(resultMsg)   resultMsg.textContent   = win ? (w.desc || 'Mostrá esto al staff para canjearlo.') : '¡La próxima puede ser tuya!';
      if(btnAgain)    btnAgain.style.display  = 'inline-flex';
      // Clase visual en status card
      if (statusCard) statusCard.classList.add('has-result');
      // Agregar prize name en status card
      var prizeEl = document.getElementById('ruleta-result-prize');
      if (!prizeEl && statusCard) {
        prizeEl = document.createElement('div');
        prizeEl.id = 'ruleta-result-prize';
        prizeEl.className = 'ruleta-result-prize';
        statusCard.insertBefore(prizeEl, resultMsg);
      }
      if (prizeEl) prizeEl.textContent = w.label || '';
      // Confetti en modal resultado
      if (win) {
        var modalSheet = resultWrap ? resultWrap.closest('.modal-sheet') : null;
        if (modalSheet) {
          var cc = modalSheet.querySelector('.confetti-container');
          if (!cc) {
            cc = document.createElement('div');
            cc.className = 'confetti-container';
            modalSheet.insertBefore(cc, modalSheet.firstChild);
          }
          spawnConfetti(cc);
        }
      }
    }

    /* -- Abrir modal -- */
    function openRuleta() {
      openModal('modal-ruleta');
      if (getRem() > 0) { showCooldown(); } else { showForm(); }
    }

    qsa('#btn-open-ruleta,#btn-ruleta-cta').forEach(function(b){
      if (!b) return;
      b.addEventListener('click', function(){
        if (CONSENT_ON && sessionStorage.getItem('g414_consent') !== '1') {
          if (window.g414RequireConsent) { window.g414RequireConsent(openRuleta); return; }
        }
        openRuleta();
      });
    });

    var btnAgainEl = $('btn-ruleta-again');
    if (btnAgainEl) { btnAgainEl.addEventListener('click', openRuleta); }
    if (btnRetry)   { btnRetry.addEventListener('click', function(){ getRem()>0?showCooldown():showForm(); }); }

    /* -- Submit del formulario -- */
    if (ruletaForm) {
      ruletaForm.addEventListener('submit', function(e){
        e.preventDefault();
        if (spinning) return;
        qsa('.r-err', ruletaForm).forEach(function(el){ el.remove(); });

        var dN = $('r-nombre'),   nombre  = dN  ? dN.value.trim()  : '';
        var dC = $('r-celular'),  celular = dC  ? dC.value.trim()  : '';
        var dD = $('r-nacimiento'), fnac  = dD  ? dD.value         : '';
        var ok = true;

        function err(el, msg) {
          ok = false;
          var s = document.createElement('span');
          s.className = 'r-err';
          s.style.cssText = 'font-size:.7rem;color:#d62d2d;display:block;margin-top:3px';
          s.textContent = msg;
          el.parentNode.appendChild(s);
        }
        if (!nombre)  err(dN, 'Tu nombre es requerido.');
        if (!celular) err(dC, 'Tu celular es requerido.');
        else { var sn=celular.replace(/[\s\-\+\(\)]/g,''); if(!/^\d+$/.test(sn)||sn.length<7) err(dC,'Solo números, mínimo 7 dígitos.'); }
        if (!fnac)    err(dD, 'Tu fecha de nacimiento es requerida.');
        else { var b=new Date(fnac), hoy=new Date(), age=hoy.getFullYear()-b.getFullYear(); if(hoy.getMonth()<b.getMonth()||(hoy.getMonth()===b.getMonth()&&hoy.getDate()<b.getDate()))age--; if(age<18) err(dD,'Debés ser mayor de 18 años.'); }
        if (!ok) return;
        if (!PREMIOS.length) { alert('La ruleta no está configurada. Configurá los premios desde el Personalizador.'); return; }

        var spinDate = new Date().toISOString(); // fecha precisa del giro
        var winner = selectWinner(PREMIOS);
        spinning = true;
        if (btnGirar) { btnGirar.disabled=true; btnGirar.textContent='Girando...'; }
        closeModal('modal-ruleta');

        spinWheel(winner, function(){
          spinning = false;
          setCooldown();
          setTimeout(function(){
            showResult(winner);
            openModal('modal-ruleta');
          }, 300);
          // Guardar en BD
          var fd = new FormData();
          fd.append('action','g414_save_spin'); fd.append('nonce',NONCE);
          fd.append('nombre',nombre); fd.append('celular',celular); fd.append('fecha_nac',fnac);
          fd.append('premio_id',winner.id||''); fd.append('premio_label',winner.label||'');
          fd.append('ganador',winner.id!=='p8'?'1':'0'); fd.append('consent','1');
          fd.append('spin_date',spinDate);
          fetch(AJAXURL,{method:'POST',body:fd}).catch(function(){});
          ruletaForm.reset();
          if (btnGirar) { btnGirar.disabled=false; btnGirar.innerHTML='<span aria-hidden="true">🎡</span> GIRAR LA RULETA'; }
        });
      });
    }

    // Init
    buildWheel(PREMIOS);
    showForm();
  })();

  /* ══════════════════════════════════════════════════
     8. TABS CARTA
  ══════════════════════════════════════════════════ */
  (function initCartaTabs() {
    var tabs   = qsa('.ctab');
    var panels = qsa('.cat-panel');
    tabs.forEach(function(tab){
      tab.addEventListener('click', function(){
        tabs.forEach(function(t){ t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
        panels.forEach(function(p){ p.classList.remove('active'); });
        tab.classList.add('active'); tab.setAttribute('aria-selected','true');
        var panel = $('cat-'+tab.getAttribute('data-cat'));
        if (panel) panel.classList.add('active');
      });
    });
  })();

  /* ══════════════════════════════════════════════════
     9. CARRITO
  ══════════════════════════════════════════════════ */
  var cart = {};

  function cartTotal(){ var t=0; Object.keys(cart).forEach(function(k){ t += cart[k].precio * cart[k].qty; }); return t; }
  function cartCount(){ var c=0; Object.keys(cart).forEach(function(k){ c += cart[k].qty; }); return c; }

  function updateCartUI() {
    var cnt = cartCount(), total = cartTotal();
    var cfCount = $('cf-count'), cfTotal = $('cf-total'), cfFloat = $('cart-float');
    if (cfCount) cfCount.textContent = cnt + (cnt===1?' item':' items');
    if (cfTotal) cfTotal.textContent = fmt(total);
    if (cfFloat) cfFloat.classList.toggle('visible', cnt > 0);
  }

  function addToCart(id, nombre, precio) {
    if (!cart[id]) cart[id] = {id:id, nombre:nombre, precio:precio, qty:0};
    cart[id].qty++;
    updateCartUI();
  }
  function removeFromCart(id) {
    if (!cart[id]) return;
    cart[id].qty = Math.max(0, cart[id].qty - 1);
    if (cart[id].qty === 0) delete cart[id];
    updateCartUI();
  }
  function getQty(id){ return cart[id] ? cart[id].qty : 0; }
  function syncCardQty(id){
    var card = qs('.prod-card[data-id="'+id+'"]');
    if (card) {
      var qn = qs('.qty-num', card);
      var qty = getQty(id);
      if (qn) {
        qn.textContent = String(qty);
        qn.classList.toggle('nonzero', qty > 0);
      }
      card.classList.toggle('in-cart', qty > 0);
    }
  }

  /* Delegación de clicks en botones +/- de la carta (NO en el modal de item) */
  document.addEventListener('click', function(e){
    var btn = e.target.closest ? e.target.closest('.qty-btn') : null;
    if (!btn) return;
    if (btn.closest('#modal-item')) return;  // manejado por el modal
    var card = btn.closest('.prod-card'); if (!card) return;
    e.stopPropagation();
    var id=card.dataset.id, nombre=card.dataset.nombre, precio=parseInt(card.dataset.precio,10)||0;
    if (btn.classList.contains('qty-plus')) addToCart(id,nombre,precio);
    else removeFromCart(id);
    var qty = getQty(id);
    var qn=qs('.qty-num',card);
    if(qn){ qn.textContent=String(qty); qn.classList.toggle('nonzero', qty>0); }
    card.classList.toggle('in-cart', qty>0);
  });

  /* Abrir modal pedido */
  var btnCartOpen = $('btn-cart-open');
  if (btnCartOpen) {
    btnCartOpen.addEventListener('click', function(){
      var list = $('order-items-list'), td = $('order-total-display');
      if (list) {
        list.innerHTML = '';
        var keys = Object.keys(cart);
        if (!keys.length) { list.innerHTML='<p style="color:var(--text-muted);font-size:.82rem">Carrito vacío.</p>'; }
        keys.forEach(function(k){
          var it=cart[k], row=document.createElement('div');
          row.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:.84rem';
          row.innerHTML='<span style="color:var(--text-primary)">'+it.qty+'x '+it.nombre+'</span><span style="color:var(--brand-magenta);font-weight:600">'+fmt(it.precio*it.qty)+'</span>';
          list.appendChild(row);
        });
      }
      if (td) td.textContent = fmt(cartTotal());
      openModal('modal-order');
    });
  }

  /* Enviar pedido */
  var btnSend = $('btn-send-order');
  if (btnSend) {
    btnSend.addEventListener('click', function(){
      var nombre = $('o-nombre') ? $('o-nombre').value.trim() : '';
      var mesa   = $('o-mesa')   ? $('o-mesa').value.trim()   : '';
      if (!mesa){ alert('Ingresá el número de mesa.'); return; }
      if (!nombre || nombre.split(/\s+/).filter(Boolean).length < 2){ alert('Ingresá tu nombre y apellido completos.'); return; }
      var items = Object.keys(cart).map(function(k){ return cart[k]; });
      if (!items.length){ alert('El carrito está vacío.'); return; }
      var lines = items.map(function(it){ return it.qty+'x '+it.nombre+' ('+fmt(it.precio*it.qty)+')'; });
      var msg   = '🍽️ *Pedido — Mesa '+mesa+'*\n\n'+lines.join('\n')+'\n\n*Total: '+fmt(cartTotal())+'*\n\nNombre: '+nombre;
      window.open('https://wa.me/'+WA_NUMBER+'?text='+encodeURIComponent(msg),'_blank');
      // Guardar en BD
      var fd=new FormData();
      fd.append('action','g414_save_pedido'); fd.append('nonce',NONCE);
      fd.append('nombre',nombre); fd.append('mesa',mesa);
      fd.append('items_json',JSON.stringify(items)); fd.append('total',String(cartTotal()));
      fetch(AJAXURL,{method:'POST',body:fd}).catch(function(){});
      cart={};
      updateCartUI();
      qsa('.qty-num').forEach(function(el){ el.textContent='0'; });
      closeModal('modal-order');
    });
  }

  /* ══════════════════════════════════════════════════
     10. MODAL ITEM DE LA CARTA
  ══════════════════════════════════════════════════ */
  (function initItemModal() {
    var modal       = $('modal-item');      if (!modal) return;
    var imgWrap     = $('item-modal-img-wrap');
    var imgEl       = $('item-modal-img');
    var nombreEl    = $('item-modal-nombre');
    var descEl      = $('item-modal-desc');
    var precioEl    = $('item-modal-precio');
    var qtyEl       = $('item-modal-qty');
    var btnMinus    = $('item-modal-minus');
    var btnPlus     = $('item-modal-plus');
    var activeCard  = null;

    function openItemModal(card) {
      activeCard = card;
      var id      = card.dataset.id;
      var nombre  = card.dataset.nombre  || '';
      var precio  = parseInt(card.dataset.precio,10) || 0;
      var desc    = card.dataset.desc    || '';
      var imagen  = card.dataset.imagen  || '';

      if (nombreEl) nombreEl.textContent = nombre;
      if (descEl)   descEl.textContent   = desc;
      if (precioEl) precioEl.textContent = fmt(precio);
      if (qtyEl)    qtyEl.textContent    = String(getQty(id));

      if (imagen && imgWrap && imgEl) {
        imgEl.src = imagen; imgWrap.style.display = 'block';
      } else if (imgWrap) {
        imgWrap.style.display = 'none';
      }
      openModal('modal-item');
    }

    if (btnPlus) {
      btnPlus.addEventListener('click', function(){
        if (!activeCard) return;
        var id=activeCard.dataset.id, nombre=activeCard.dataset.nombre||'', precio=parseInt(activeCard.dataset.precio,10)||0;
        addToCart(id,nombre,precio);
        var q=getQty(id);
        if(qtyEl){ qtyEl.textContent=String(q); }
        syncCardQty(id);
      });
    }
    if (btnMinus) {
      btnMinus.addEventListener('click', function(){
        if (!activeCard) return;
        var id=activeCard.dataset.id;
        removeFromCart(id);
        var q=getQty(id);
        if(qtyEl){ qtyEl.textContent=String(q); }
        syncCardQty(id);
      });
    }

    /* Click en prod-card (no en los botones +/-) abre el modal */
    document.addEventListener('click', function(e){
      if (e.target.closest && e.target.closest('.qty-btn')) return;
      if (e.target.closest && e.target.closest('#modal-item')) return;
      var card = e.target.closest ? e.target.closest('.prod-card') : null;
      if (!card) return;
      openItemModal(card);
    });
  })();

  /* ══════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════ */
  updateCartUI();

})();
