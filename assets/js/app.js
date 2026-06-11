/**
 * Cuatro Catorce (414) Galería — app.js
 * Lógica interactiva premium para la web de 414.
 */

(function () {
  'use strict';

  /* ── 1. Utilidades Generales ── */
  const $ = (id) => document.getElementById(id);
  const qs = (selector, context) => (context || document).querySelector(selector);
  const qsa = (selector, context) => Array.from((context || document).querySelectorAll(selector));
  
  // Formateador de moneda (Pesos Argentinos sin decimales)
  const fmt = (num) => {
    return '$' + Number(num).toLocaleString('es-AR', {
      maximumFractionDigits: 0
    });
  };

  // Configuración de la Ruleta
  const WA_NUMBER = '5493513073743';
  const RULETA_COOLDOWN_MINS = 120; // 2 horas de cooldown
  const RULETA_COOLDOWN_KEY = 'cuatrocatorce_ruleta_cooldown';
  const RULETA_PREMIO_KEY = 'cuatrocatorce_ruleta_premio';
  
  const PREMIOS = [
    { id: 'p1', label: '🔥 20% OFF Gastro', desc: 'Obtené un 20% de descuento en nuestras pizzas de masa madre y platos.', color: '#ff2e93', win: true },
    { id: 'p2', label: '🍹 15% OFF Barra', desc: 'Disfrutá de un 15% de descuento en tragos de autor y vermutería.', color: '#bc34fa', win: true },
    { id: 'p3', label: '🍕 10% OFF Gastro', desc: 'Un 10% de descuento en toda la carta gastronómica para deleitarte.', color: '#00f0ff', win: true },
    { id: 'p4', label: '🥂 10% OFF Barra', desc: 'Un 10% de descuento en cualquiera de nuestras bebidas y copas.', color: '#ff007f', win: true },
    { id: 'p5', label: '🍸 Trago de Regalo', desc: 'Un trago clásico de cortesía (Vermut, Gin Tonic o Pinta tirada) para arrancar.', color: '#00ffd8', win: true },
    { id: 'p6', label: '🍋 2x1 en Caipis', desc: 'Comprás una Caipi clásica o de autor y la segunda va por nuestra cuenta.', color: '#bc34fa', win: true },
    { id: 'p7', label: '⚡ Happy Hour +30m', desc: '¡Sumá 30 minutos extras de Happy Hour extendido exclusivo para tu mesa!', color: '#ff2e93', win: true },
    { id: 'p8', label: '🍀 Próxima Visita', desc: 'Esta vez no hubo suerte. ¡Volvé a girar en tu próxima visita a 414!', color: '#3d1b6e', win: false }
  ];


  /* ── 1.5. Audio Synthesizer (Web Audio API) ── */
  let audioCtx = null;
  const getAudioContext = () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  };

  const playTickSound = () => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (err) {
      console.warn('Audio click error:', err);
    }
  };

  const playVictorySound = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Retro arpeggio (C major)
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.05, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.3);
      });
    } catch (err) {
      console.warn('Audio victory error:', err);
    }
  };

  const playLossSound = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(147, now + 0.28);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch (err) {
      console.warn('Audio loss error:', err);
    }
  };

  const playSwitchSound = (isOn) => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isOn ? 1400 : 700, now);
      osc.frequency.exponentialRampToValueAtTime(isOn ? 1800 : 350, now + 0.07);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch (err) {
      console.warn('Audio switch error:', err);
    }
  };

  const simulateRouletteTicks = (durationMs) => {
    let time = 0;
    let delay = 35;
    const tick = () => {
      if (time >= durationMs - 350) return;
      playTickSound();
      const progress = time / durationMs;
      delay = 35 + Math.pow(progress, 2.5) * 580;
      time += delay;
      setTimeout(tick, delay);
    };
    setTimeout(tick, delay);
  };


  /* ── 2. Navegación & Menú Móvil ── */
  (function initNavbar() {
    const navbar = $('navbar');
    if (!navbar) return;

    // Efecto scrolled en header
    const handleScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Lógica menú móvil
    const hamburger = qs('.hamburger', navbar);
    const mobileMenu = $('mobile-menu');
    const mmClose = qs('.mm-close', mobileMenu);
    const mmLinks = qsa('.mm-link', mobileMenu);

    const openMenu = () => {
      mobileMenu.classList.add('open');
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    };

    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', openMenu);
    }
    if (mmClose) {
      mmClose.addEventListener('click', closeMenu);
    }
    mmLinks.forEach(link => {
      link.addEventListener('click', closeMenu);
    });
  })();


  /* ── 3. Revelado al hacer scroll (Intersection Observer) ── */
  (function initScrollReveal() {
    const reveals = qsa('.reveal');
    if (!reveals.length) return;

    if (!('IntersectionObserver' in window)) {
      reveals.forEach(el => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.05
    });

    reveals.forEach(el => observer.observe(el));
  })();


  /* ── 4. Videos Perezosos (Lazy Load Videos) ── */
  (function initLazyVideos() {
    const lazyVideos = qsa('.lazy-video');
    if (!lazyVideos.length) return;

    if (!('IntersectionObserver' in window)) {
      lazyVideos.forEach(v => {
        const source = qs('source[data-src]', v);
        if (source) {
          source.src = source.getAttribute('data-src');
          source.removeAttribute('data-src');
          v.load();
        }
      });
      return;
    }

    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const video = entry.target;
          const source = qs('source[data-src]', video);
          if (source) {
            source.src = source.getAttribute('data-src');
            source.removeAttribute('data-src');
            video.load();
            video.play().catch(() => {}); // evita errores si el browser bloquea autoplay
          }
          videoObserver.unobserve(video);
        }
      });
    }, {
      rootMargin: '200px'
    });

    lazyVideos.forEach(v => videoObserver.observe(v));
  })();


  /* ── 5. Galería con Visor (Lightbox) ── */
  (function initLightbox() {
    const lightbox = $('lightbox');
    if (!lightbox) return;

    const content = $('lb-content');
    const counter = $('lb-counter');
    const items = qsa('.gal-card[data-lb-src]');
    let currentIndex = 0;

    const openLightbox = (index) => {
      if (!items.length) return;
      currentIndex = (index + items.length) % items.length;
      renderItem();
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
      lightbox.classList.remove('open');
      content.innerHTML = '';
      document.body.style.overflow = '';
    };

    const renderItem = () => {
      content.innerHTML = '';
      const el = items[currentIndex];
      const src = el.getAttribute('data-lb-src');
      const type = el.getAttribute('data-lb-type') || 'image';

      if (type === 'video') {
        const video = document.createElement('video');
        video.src = src;
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.controls = true;
        video.style.cssText = 'max-width: 90vw; max-height: 80vh; border-radius: 4px;';
        content.appendChild(video);
      } else {
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Imagen Galería 414';
        content.appendChild(img);
      }

      if (counter) {
        counter.textContent = `${currentIndex + 1} / ${items.length}`;
      }
    };

    // Agregar eventos a las tarjetas de la galería
    items.forEach((item, index) => {
      item.addEventListener('click', () => openLightbox(index));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(index);
        }
      });
    });

    // Controles de visor
    const btnClose = qs('.lb-close', lightbox);
    const btnPrev = qs('.lb-prev', lightbox);
    const btnNext = qs('.lb-next', lightbox);

    if (btnClose) btnClose.addEventListener('click', closeLightbox);
    if (btnPrev) btnPrev.addEventListener('click', () => openLightbox(currentIndex - 1));
    if (btnNext) btnNext.addEventListener('click', () => openLightbox(currentIndex + 1));

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    // Accesibilidad teclado
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') openLightbox(currentIndex - 1);
      if (e.key === 'ArrowRight') openLightbox(currentIndex + 1);
    });

    // Control táctil (Swipes)
    let startX = 0;
    lightbox.addEventListener('touchstart', (e) => {
      startX = e.changedTouches[0].clientX;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
      const deltaX = e.changedTouches[0].clientX - startX;
      if (Math.abs(deltaX) > 60) {
        if (deltaX < 0) {
          openLightbox(currentIndex + 1); // Deslizar izquierda -> siguiente
        } else {
          openLightbox(currentIndex - 1); // Deslizar derecha -> anterior
        }
      }
    });
  })();


  /* ── 6. Lógica de la Ruleta de la Fortuna ── */
  (function initRuleta() {
    const svgEl = $('ruleta-svg');
    const wheelWrap = $('ruleta-wheel-wrap');
    
    const statusIcon = $('ruleta-result-icon');
    const statusLbl = $('ruleta-result-lbl');
    const statusMsg = $('ruleta-result-msg');
    const statusCard = $('ruleta-status-card');

    const formWrap = $('ruleta-form-wrap');
    const cooldownWrap = $('ruleta-cooldown-wrap');
    const resultWrap = $('ruleta-result-wrap');
    const clockEl = $('ruleta-clock-display');

    const ruletaForm = $('ruleta-form');
    const btnGirar = $('btn-girar');
    const btnRetry = $('btn-retry-ruleta');
    const btnRestartView = $('btn-restart-ruleta-view');

    const modalEmoji = $('ruleta-modal-emoji');
    const modalPremio = $('ruleta-modal-premio');
    const modalDesc = $('ruleta-modal-desc');
    const couponCodeEl = $('coupon-code');

    let spinning = false;
    let currentRotation = 0;
    let clockInterval = null;

    // Construir Ruleta SVG dinámicamente
    const buildWheel = () => {
      if (!svgEl) return;
      svgEl.innerHTML = ''; // Limpiar fallback
      
      const ns = 'http://www.w3.org/2000/svg';
      const cx = 160, cy = 160, r = 155;
      const totalSectors = PREMIOS.length;
      const anglePerSector = 360 / totalSectors;

      // Círculo de Fondo
      const bgCircle = document.createElementNS(ns, 'circle');
      bgCircle.setAttribute('cx', cx);
      bgCircle.setAttribute('cy', cy);
      bgCircle.setAttribute('r', r);
      bgCircle.setAttribute('fill', '#0e0d12');
      svgEl.appendChild(bgCircle);

      // Dibujar sectores
      PREMIOS.forEach((premio, i) => {
        const startDeg = i * anglePerSector;
        const endDeg = startDeg + anglePerSector;
        
        // Conversión a radianes (desfasando 90 grados para centrar en norte)
        const sRad = (startDeg - 90) * Math.PI / 180;
        const eRad = (endDeg - 90) * Math.PI / 180;

        const x1 = cx + r * Math.cos(sRad);
        const y1 = cy + r * Math.sin(sRad);
        const x2 = cx + r * Math.cos(eRad);
        const y2 = cy + r * Math.sin(eRad);
        
        const path = document.createElementNS(ns, 'path');
        // Comando d: M (inicio centro) -> L (ir a x1,y1) -> A (arco hasta x2,y2) -> Z (cerrar)
        path.setAttribute('d', `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 0 1 ${x2},${y2} Z`);
        path.setAttribute('fill', premio.color);
        path.setAttribute('stroke', '#09080c');
        path.setAttribute('stroke-width', '1.5');
        svgEl.appendChild(path);

        // Texto del sector
        const midDeg = startDeg + (anglePerSector / 2);
        const midRad = (midDeg - 90) * Math.PI / 180;
        const textRadius = r * 0.62;
        const tx = cx + textRadius * Math.cos(midRad);
        const ty = cy + textRadius * Math.sin(midRad);

        const textGroup = document.createElementNS(ns, 'g');
        textGroup.setAttribute('transform', `rotate(${midDeg}, ${tx}, ${ty})`);

        // Dividir texto largo en líneas
        const words = premio.label.split(' ');
        const midIndex = Math.ceil(words.length / 2);
        const l1 = words.slice(0, midIndex).join(' ');
        const l2 = words.slice(midIndex).join(' ');

        const addTextLine = (txt, dy) => {
          if (!txt) return;
          const t = document.createElementNS(ns, 'text');
          t.setAttribute('x', tx);
          t.setAttribute('y', ty);
          t.setAttribute('dy', dy);
          t.setAttribute('text-anchor', 'middle');
          t.setAttribute('dominant-baseline', 'middle');
          t.setAttribute('fill', '#ffffff');
          t.setAttribute('font-family', varFontSerifShort(premio.label));
          t.setAttribute('font-size', premio.label.length > 18 ? '7.5' : '9');
          t.setAttribute('font-weight', '700');
          t.setAttribute('paint-order', 'stroke');
          t.setAttribute('stroke', '#09080c');
          t.setAttribute('stroke-width', '2.5');
          t.textContent = txt;
          textGroup.appendChild(t);
        };

        if (l2) {
          addTextLine(l1, '-4');
          addTextLine(l2, '6');
        } else {
          addTextLine(l1, '0');
        }

        svgEl.appendChild(textGroup);
      });

      // Anillo decorativo exterior
      const borderCircle = document.createElementNS(ns, 'circle');
      borderCircle.setAttribute('cx', cx);
      borderCircle.setAttribute('cy', cy);
      borderCircle.setAttribute('r', r);
      borderCircle.setAttribute('fill', 'none');
      borderCircle.setAttribute('stroke', 'rgba(217, 190, 143, 0.4)');
      borderCircle.setAttribute('stroke-width', '2');
      svgEl.appendChild(borderCircle);
    };

    const varFontSerifShort = (text) => {
      return "'Plus Jakarta Sans', system-ui, sans-serif";
    };

    // Cooldown & LocalStorage
    const getCooldownRemaining = () => {
      const stored = localStorage.getItem(RULETA_COOLDOWN_KEY);
      if (!stored) return 0;
      const diff = parseInt(stored, 10) - Date.now();
      return diff > 0 ? diff : 0;
    };

    const setCooldown = () => {
      const expireTime = Date.now() + (RULETA_COOLDOWN_MINS * 60 * 1000);
      localStorage.setItem(RULETA_COOLDOWN_KEY, expireTime);
    };

    const formatTime = (ms) => {
      const totalSeconds = Math.floor(ms / 1000);
      const hrs = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const updateClock = () => {
      const rem = getCooldownRemaining();
      if (rem <= 0) {
        clearInterval(clockInterval);
        cooldownWrap.style.display = 'none';
        formWrap.style.display = 'block';
        resultWrap.style.display = 'none';
        return;
      }
      if (clockEl) {
        clockEl.textContent = formatTime(rem);
      }
    };

    const startClock = () => {
      if (clockInterval) clearInterval(clockInterval);
      updateClock();
      clockInterval = setInterval(updateClock, 1000);
    };

    // Confetti Fx
    const spawnConfetti = () => {
      let container = qs('.confetti-container', resultWrap);
      if (!container) {
        container = document.createElement('div');
        container.className = 'confetti-container';
        resultWrap.appendChild(container);
      }
      container.innerHTML = '';
      
      const colors = ['#d9be8f', '#e27d42', '#7b52ab', '#ffffff', '#25d366'];
      for (let i = 0; i < 40; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.top = '-10px';
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration = (1.5 + Math.random() * 2) + 's';
        piece.style.animationDelay = (Math.random() * 0.5) + 's';
        piece.style.width = (5 + Math.random() * 6) + 'px';
        piece.style.height = (5 + Math.random() * 6) + 'px';
        piece.style.borderRadius = Math.random() > 0.4 ? '50%' : '2px';
        container.appendChild(piece);
      }
    };

    const showView = (viewName) => {
      formWrap.style.display = viewName === 'form' ? 'block' : 'none';
      cooldownWrap.style.display = viewName === 'cooldown' ? 'block' : 'none';
      resultWrap.style.display = viewName === 'result' ? 'block' : 'none';
    };

    // Mostrar premio guardado
    const showPreviousPrize = () => {
      const storedPrize = localStorage.getItem(RULETA_PREMIO_KEY);
      if (storedPrize) {
        try {
          const prizeObj = JSON.parse(storedPrize);
          
          if (modalEmoji) modalEmoji.textContent = prizeObj.win ? '🎉' : '😅';
          if (modalPremio) modalPremio.textContent = prizeObj.label;
          if (modalDesc) modalDesc.textContent = prizeObj.desc;
          if (couponCodeEl) couponCodeEl.textContent = prizeObj.code;
          
          // Actualizar banner de estado inferior
          if (statusIcon) statusIcon.textContent = prizeObj.win ? '🎉' : '🎡';
          if (statusLbl) statusLbl.textContent = prizeObj.win ? 'Premio Ganado' : 'Sin premios';
          if (statusMsg) statusMsg.textContent = prizeObj.win ? `${prizeObj.label}. Código: ${prizeObj.code}` : 'Intentá de nuevo en tu próxima visita.';
          
          showView('result');
          if (prizeObj.win) spawnConfetti();
        } catch (e) {
          showView('form');
        }
      } else {
        showView('form');
      }
    };

    // Inicializar estado de vistas
    const checkState = () => {
      if (getCooldownRemaining() > 0) {
        showView('cooldown');
        startClock();
      } else {
        showView('form');
      }
    };

    // Selección ponderada de ganadores
    const chooseWinner = () => {
      // 80% probabilidad acumulada de ganar, 20% de perder
      const rand = Math.random();
      if (rand < 0.20) {
        // Devuelve el último elemento ("Seguí participando")
        return PREMIOS[PREMIOS.length - 1];
      } else {
        // Devuelve cualquier premio ganador (del index 0 al 6)
        const winIndex = Math.floor(Math.random() * (PREMIOS.length - 1));
        return PREMIOS[winIndex];
      }
    };

    // Ejecutar Giro
    const executeSpin = (winner) => {
      if (spinning) return;
      spinning = true;

      const sectorAngle = 360 / PREMIOS.length;
      const winnerIndex = PREMIOS.indexOf(winner);

      // Calcular el ángulo intermedio del sector del ganador
      const winnerAngle = (winnerIndex * sectorAngle) + (sectorAngle / 2);
      
      // Ajustar rotación para que se detenga frente al puntero superior (12 en punto)
      // La ruleta gira en sentido de las agujas del reloj, por ende restamos el ángulo al total
      const adjustToArrow = (360 - winnerAngle) % 360;
      
      // Sumamos 5 giros completos de inercia
      currentRotation += (5 * 360) + adjustToArrow;

      if (wheelWrap) {
        wheelWrap.style.transition = 'transform 4.5s cubic-bezier(0.15, 0.75, 0.1, 1)';
        wheelWrap.style.transform = `rotate(${currentRotation}deg)`;
        simulateRouletteTicks(4500);
      }

      // Esperar finalización
      setTimeout(() => {
        spinning = false;
        setCooldown();
        
        if (winner.win) {
          playVictorySound();
        } else {
          playLossSound();
        }
        
        const generatedCode = '414-' + Math.floor(1000 + Math.random() * 9000);
        const prizeToStore = {
          label: winner.label,
          desc: winner.desc,
          win: winner.win,
          code: generatedCode
        };
        
        localStorage.setItem(RULETA_PREMIO_KEY, JSON.stringify(prizeToStore));

        // Rellenar datos del resultado
        if (modalEmoji) modalEmoji.textContent = winner.win ? '🎉' : '😅';
        if (modalPremio) modalPremio.textContent = winner.label;
        if (modalDesc) modalDesc.textContent = winner.desc;
        if (couponCodeEl) {
          couponCodeEl.textContent = generatedCode;
          couponCodeEl.style.display = winner.win ? 'inline-block' : 'none';
        }
        
        // Actualizar banner
        if (statusIcon) statusIcon.textContent = winner.win ? '🎉' : '🎡';
        if (statusLbl) statusLbl.textContent = winner.win ? '¡Premio Ganado!' : 'Esta vez no';
        if (statusMsg) statusMsg.textContent = winner.win ? `${winner.label}. Mostrale esta pantalla a tu mozo.` : 'Más suerte en la próxima.';
        
        showView('result');
        if (winner.win) spawnConfetti();
        
        if (ruletaForm) ruletaForm.reset();
        if (btnGirar) {
          btnGirar.disabled = false;
          qs('span', btnGirar).textContent = 'GIRAR LA RULETA';
        }
      }, 4800);
    };

    // Form Event Listener
    if (ruletaForm) {
      ruletaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (spinning) return;

        // Limpiar errores previos
        qsa('.field-error', ruletaForm).forEach(err => err.remove());

        const inputNombre = $('r-nombre');
        const inputCelular = $('r-celular');
        const inputNacimiento = $('r-nacimiento');
        let valid = true;

        const showError = (el, msg) => {
          valid = false;
          const err = document.createElement('span');
          err.className = 'field-error';
          err.style.cssText = 'color: #e27d42; font-size: 0.7rem; margin-top: 4px; display: block;';
          err.textContent = msg;
          el.parentNode.appendChild(err);
        };

        // Validación Nombre
        if (!inputNombre.value.trim()) {
          showError(inputNombre, 'El nombre es obligatorio.');
        }

        // Validación Celular (mínimo 7 dígitos)
        const cellVal = inputCelular.value.trim().replace(/[\s\-\+\(\)]/g, '');
        if (!cellVal) {
          showError(inputCelular, 'El celular es obligatorio.');
        } else if (!/^\d+$/.test(cellVal) || cellVal.length < 7) {
          showError(inputCelular, 'Número de celular inválido (mínimo 7 números).');
        }

        // Validación Mayor de 18 años
        if (!inputNacimiento.value) {
          showError(inputNacimiento, 'La fecha de nacimiento es requerida.');
        } else {
          const birthday = new Date(inputNacimiento.value);
          const today = new Date();
          let age = today.getFullYear() - birthday.getFullYear();
          const monthDiff = today.getMonth() - birthday.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
            age--;
          }
          if (age < 18) {
            showError(inputNacimiento, 'Debes ser mayor de 18 años para participar.');
          }
        }

        if (!valid) return;

        // Iniciar Giro
        const winner = chooseWinner();
        if (btnGirar) {
          btnGirar.disabled = true;
          qs('span', btnGirar).textContent = 'GIRANDO...';
        }
        
        executeSpin(winner);
      });
    }

    if (btnRetry) {
      btnRetry.addEventListener('click', showPreviousPrize);
    }
    
    if (btnRestartView) {
      btnRestartView.addEventListener('click', checkState);
    }

    // Dibujar ruleta e iniciar
    buildWheel();
    checkState();
  })();


  /* ── 7. La Carta (Tabs & Carrito con Panel Drawer) ── */
  (function initCarta() {
    // Tabs Navigation
    const tabs = qsa('.menu-tab-btn');
    const panels = qsa('.menu-panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Desactivar todos
        tabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        panels.forEach(p => p.classList.remove('active'));

        // Activar seleccionado
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        
        const targetId = `panel-${tab.getAttribute('data-cat')}`;
        const targetPanel = $(targetId);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }
      });
    });

    // Lógica del Carrito
    let cart = {};

    const getCartCount = () => {
      return Object.values(cart).reduce((total, item) => total + item.qty, 0);
    };

    const getCartTotal = () => {
      return Object.values(cart).reduce((total, item) => total + (item.precio * item.qty), 0);
    };

    const updateFloatingBar = () => {
      const cartFloat = $('cart-float');
      const countEl = $('cf-count');
      const totalEl = $('cf-total');
      const count = getCartCount();

      if (cartFloat) {
        if (count > 0) {
          cartFloat.classList.add('visible');
          if (countEl) countEl.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
          if (totalEl) totalEl.textContent = fmt(getCartTotal());
        } else {
          cartFloat.classList.remove('visible');
        }
      }
    };

    const syncDishCards = (id) => {
      const cards = qsa(`.dish-card[data-id="${id}"]`);
      const qty = cart[id] ? cart[id].qty : 0;

      cards.forEach(card => {
        const countEl = qs('.qty-count', card);
        if (countEl) {
          countEl.textContent = qty;
          countEl.classList.toggle('active', qty > 0);
        }
        card.classList.toggle('in-cart', qty > 0);
      });
    };

    const addToCart = (id, nombre, precio) => {
      if (!cart[id]) {
        cart[id] = { id, nombre, precio, qty: 0 };
      }
      cart[id].qty++;
      syncDishCards(id);
      updateFloatingBar();
    };

    const removeFromCart = (id) => {
      if (!cart[id]) return;
      cart[id].qty--;
      if (cart[id].qty <= 0) {
        delete cart[id];
      }
      syncDishCards(id);
      updateFloatingBar();
    };

    // Delegación de Click para aumentar/disminuir platos en la carta
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.qty-btn');
      if (!btn) return;
      
      const card = btn.closest('.dish-card');
      if (!card) return;

      const id = card.getAttribute('data-id');
      const nombre = card.getAttribute('data-nombre');
      const precio = parseInt(card.getAttribute('data-precio'), 10);

      if (btn.classList.contains('qty-plus')) {
        addToCart(id, nombre, precio);
      } else if (btn.classList.contains('qty-minus')) {
        removeFromCart(id);
      }
    });

    // Drawer Cart Panel Lógica
    const cartDrawer = $('cart-drawer');
    const btnCartOpen = $('btn-cart-open');
    const btnCartClose = $('btn-cart-close');
    const drawerOverlay = qs('.drawer-overlay', cartDrawer);
    const orderItemsList = $('order-items-list');
    const orderTotalDisplay = $('order-total-display');

    const openDrawer = () => {
      renderDrawerItems();
      if (cartDrawer) {
        cartDrawer.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    };

    const closeDrawer = () => {
      if (cartDrawer) {
        cartDrawer.classList.remove('open');
        document.body.style.overflow = '';
      }
    };

    const renderDrawerItems = () => {
      if (!orderItemsList) return;
      orderItemsList.innerHTML = '';

      const items = Object.values(cart);
      if (!items.length) {
        orderItemsList.innerHTML = '<p style="color: var(--text-muted); text-align: center; font-size: 0.85rem; padding: 20px 0;">Tu bandeja está vacía.</p>';
        if (orderTotalDisplay) orderTotalDisplay.textContent = '$0';
        return;
      }

      items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'drawer-item-row';
        row.innerHTML = `
          <div class="drawer-item-info">
            <span class="item-row-title">${item.nombre}</span>
            <span class="item-row-qty">${item.qty} x ${fmt(item.precio)}</span>
          </div>
          <span class="item-row-price">${fmt(item.precio * item.qty)}</span>
        `;
        orderItemsList.appendChild(row);
      });

      if (orderTotalDisplay) {
        orderTotalDisplay.textContent = fmt(getCartTotal());
      }
    };

    if (btnCartOpen) btnCartOpen.addEventListener('click', openDrawer);
    if (btnCartClose) btnCartClose.addEventListener('click', closeDrawer);
    if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

    // Enviar pedido por WhatsApp
    const btnSendOrder = $('btn-send-order');
    if (btnSendOrder) {
      btnSendOrder.addEventListener('click', () => {
        const inputNombre = $('o-nombre');
        const inputMesa = $('o-mesa');

        const nombre = inputNombre ? inputNombre.value.trim() : '';
        const mesa = inputMesa ? inputMesa.value.trim() : '';

        // Validar campos
        if (!mesa) {
          alert('Por favor, ingresá tu número de mesa.');
          return;
        }
        
        // Validación nombre y apellido (mínimo 2 palabras)
        const nameParts = nombre.split(/\s+/).filter(Boolean);
        if (!nombre || nameParts.length < 2) {
          alert('Por favor, ingresá tu nombre y apellido completos.');
          return;
        }

        const items = Object.values(cart);
        if (!items.length) {
          alert('Tu bandeja de pedido está vacía.');
          return;
        }

        // Generar texto
        const header = `🍽️ *PEDIDO — MESA ${mesa}* 🍽️\n`;
        const dateStr = `Cliente: *${nombre}*\n\n`;
        
        const lines = items.map(item => `• *${item.qty}x* ${item.nombre} (_${fmt(item.precio * item.qty)}_)`);
        const footerText = `\n\n*Total a pagar: ${fmt(getCartTotal())}*`;

        const finalMsg = header + dateStr + lines.join('\n') + footerText;
        
        // Abrir WhatsApp en pestaña nueva
        const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(finalMsg)}`;
        window.open(waUrl, '_blank');

        // Resetear carrito
        cart = {};
        updateFloatingBar();
        qsa('.dish-card').forEach(card => {
          const countEl = qs('.qty-count', card);
          if (countEl) {
            countEl.textContent = '0';
            countEl.classList.remove('active');
          }
          card.classList.remove('in-cart');
        });

        if (inputNombre) inputNombre.value = '';
        if (inputMesa) inputMesa.value = '';

        closeDrawer();
      });
    }

    // Acordeón deslizante para las subsecciones del menú
    const subsectionHeaders = qsa('.subsection-header');
    subsectionHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const subsection = header.closest('.menu-subsection');
        if (subsection) {
          subsection.classList.toggle('active');
        }
      });
    });

    // ── Selector de Cócteles por Estado de Ánimo ──
    (function initMoodMatcher() {
      const moodBtns = qsa('.mood-btn');
      const loader = $('mood-shaker-loader');
      const resultBox = $('mood-result-display');
      const drinkName = $('mood-drink-name');
      const drinkPrice = $('mood-drink-price');
      const drinkDesc = $('mood-drink-desc');
      const btnAdd = $('btn-mood-add-cart');

      if (!moodBtns.length || !loader || !resultBox || !btnAdd) return;

      const DRINKS = {
        fiestero: { id: 'caipi-art', nombre: 'Caipi de Maracuyá', precio: 9500, desc: 'Vibrante y refrescante. Caipiriña premium con maracuyá fresco, lima y cachaza de primera.' },
        misterioso: { id: 'negroni-414', nombre: 'Negroni 414', precio: 9000, desc: 'Intenso y herbáceo. Campari, Gin Heráclito y nuestro vermut artesanal macerado con pieles de cítricos.' },
        relajado: { id: 'vermut-torr', nombre: 'Vermut Torrontés Casa', precio: 8500, desc: 'Suave y botánico. Vermut blanco de uvas Torrontés con notas de peperina y poleo cordobés.' },
        intenso: { id: 'jager', nombre: 'Jagermeister con Speed', precio: 20000, desc: 'Licor de hierbas alemán servido extremadamente frío con energizante para encender tu noche.' }
      };

      let selectedDrink = null;

      moodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          // Quitar activo de todos
          moodBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const mood = btn.getAttribute('data-mood');
          const drink = DRINKS[mood];
          if (!drink) return;

          selectedDrink = drink;
          resultBox.style.display = 'none';
          loader.style.display = 'flex';

          // Simular batido de coctelera
          setTimeout(() => {
            loader.style.display = 'none';
            drinkName.textContent = drink.nombre;
            drinkPrice.textContent = fmt(drink.precio);
            drinkDesc.textContent = drink.desc;

            // Guardar atributos en el botón de agregar
            btnAdd.setAttribute('data-id', drink.id);
            btnAdd.setAttribute('data-nombre', drink.nombre);
            btnAdd.setAttribute('data-precio', drink.precio);

            resultBox.style.display = 'block';
          }, 1200);
        });
      });

      btnAdd.addEventListener('click', () => {
        if (!selectedDrink) return;
        addToCart(selectedDrink.id, selectedDrink.nombre, selectedDrink.precio);
        
        // Efecto visual de agregado
        const originalText = btnAdd.querySelector('span').textContent;
        btnAdd.querySelector('span').textContent = '¡AGREGADO! 🛒';
        btnAdd.style.backgroundColor = 'var(--accent-magenta)';
        btnAdd.style.boxShadow = 'var(--shadow-neon-magenta)';
        
        setTimeout(() => {
          btnAdd.querySelector('span').textContent = originalText;
          btnAdd.style.backgroundColor = '';
          btnAdd.style.boxShadow = '';
        }, 1500);
      });
    })();

    // 3D Tilt Effect on cards and buttons
    (function init3DTilt() {
      const tiltTargets = qsa('.dish-card, .promo-ticket, .gal-card, .shots-vip-card, .ruleta-form-card, .ruleta-cooldown-card, .ruleta-result-card, .btn-primary, .btn-outline, .btn-primary-glow, .wheel-outer-glowing-ring, .whatsapp-float');
      
      tiltTargets.forEach(el => {
        el.addEventListener('mousemove', (e) => {
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const xc = rect.width / 2;
          const yc = rect.height / 2;
          
          // Calculate tilt degrees (max 10 degrees)
          const angleX = ((yc - y) / yc) * 10;
          const angleY = ((x - xc) / xc) * 10;
          
          el.style.transform = `perspective(800px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale(1.02)`;
        });
        
        el.addEventListener('mouseleave', () => {
          el.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)`;
        });
      });
    })();

  })();

  /* ── 8. Reproductor Tech House ── */
  (function initLofiPlayer() {
    const audio = $('speakeasy-audio');
    const btnPlay = $('btn-play-pause');
    const btnMute = $('btn-mute');
    const slider = $('volume-slider');
    const disk = $('vinyl-disk');
    const btnSpeakeasy = $('btn-speakeasy-toggle');
    if (!audio || !btnPlay || !btnMute || !slider || !disk) return;

    let prevVolume = 25;
    audio.volume = 0.25;
    slider.value = 25;

    // Handle audio loading errors (e.g. 404 on Vercel for the large techhouse mp3)
    audio.addEventListener('error', (e) => {
      console.warn("Audio loading error, trying fallback...", e);
      const currentSrc = audio.currentSrc || '';
      if (currentSrc.includes('speakeasy-techhouse.mp3')) {
        audio.src = 'assets/audio/speakeasy-lofi.mp3?v=5.6';
        audio.load();
        if (document.body.classList.contains('speakeasy-active') || !audio.paused) {
          startPlayback();
        }
      }
    }, true); // useCapture because error events on <source> don't bubble

    const startPlayback = () => {
      return audio.play().then(() => {
        btnPlay.textContent = '⏸';
        disk.classList.add('spinning');
      }).catch(() => {});
    };

    const pausePlayback = () => {
      audio.pause();
      btnPlay.textContent = '▶';
      disk.classList.remove('spinning');
    };

    // Try immediate autoplay (works if user already interacted before)
    startPlayback();

    // Fallback: start on very first user gesture anywhere on the page
    const onFirstGesture = () => {
      if (audio.paused) startPlayback();
    };
    ['click','touchstart','scroll','keydown'].forEach(evt =>
      document.addEventListener(evt, onFirstGesture, { once: true, passive: true })
    );

    btnPlay.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.paused ? startPlayback() : pausePlayback();
    });

    btnMute.addEventListener('click', (e) => {
      e.stopPropagation();
      if (audio.muted) {
        audio.muted = false;
        btnMute.textContent = '🔊';
        slider.value = prevVolume;
        audio.volume = prevVolume / 100;
      } else {
        prevVolume = parseInt(slider.value, 10);
        audio.muted = true;
        btnMute.textContent = '🔇';
        slider.value = 0;
        audio.volume = 0;
      }
    });

    slider.addEventListener('input', (e) => {
      e.stopPropagation();
      const val = parseInt(slider.value, 10);
      audio.volume = val / 100;
      audio.muted = (val === 0);
      btnMute.textContent = (val === 0) ? '🔇' : '🔊';
    });

    if (btnSpeakeasy) {
      btnSpeakeasy.addEventListener('click', () => {
        const isActive = document.body.classList.toggle('speakeasy-active');
        playSwitchSound(isActive);
        btnSpeakeasy.textContent = isActive ? '⚡' : '🕯️';
        btnSpeakeasy.title = isActive ? 'Modo Speakeasy (Encender luces)' : 'Modo Speakeasy (Apagar luces)';
        if (isActive && audio.paused) { startPlayback(); }
      });
    }
  })();


  /* ── 9. Custom Cursor & Title Hover Effect ── */
  (function initCustomCursor() {
    // Only enable if device supports hover
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);

    document.addEventListener('mousemove', (e) => {
      cursor.style.display = 'block';
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });

    document.addEventListener('mouseleave', () => {
      cursor.style.display = 'none';
    });

    // Add hover effect on all interactive elements
    const updateHoverStatus = () => {
      const clickables = document.querySelectorAll('a, button, input, textarea, select, [role="button"], .clickable, .menu-tab-btn, .mood-btn, .wheel-pointer, .gal-card, .subsection-header, .lb-close, .lb-prev, .lb-next, .drawer-close');
      clickables.forEach(el => {
        if (el.dataset.hasCursorListener) return;
        el.dataset.hasCursorListener = 'true';
        
        el.addEventListener('mouseenter', () => {
          cursor.classList.add('cursor-hover');
        });
        el.addEventListener('mouseleave', () => {
          cursor.classList.remove('cursor-hover');
        });
      });
    };
    
    updateHoverStatus();
    setInterval(updateHoverStatus, 1000);
  })();

  (function initTitleHoverEffect() {
    const titleEditorial = document.querySelector('.title-editorial');
    const titleAccent = document.querySelector('.title-accent');
    
    const wrapChars = (el) => {
      if (!el) return;
      const text = el.textContent.trim();
      el.innerHTML = '';
      [...text].forEach(char => {
        const span = document.createElement('span');
        span.className = 'hover-char';
        span.textContent = char === ' ' ? '\u00A0' : char;
        el.appendChild(span);
      });
    };

    wrapChars(titleEditorial);
    wrapChars(titleAccent);
  })();

})();
