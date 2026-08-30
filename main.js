(function(){
  "use strict";

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header scroll state */
  var header = document.getElementById('siteHeader');
  if(header){
    var onScroll = function(){
      if(window.scrollY > 40){ header.classList.add('scrolled'); }
      else{ header.classList.remove('scrolled'); }
    };
    document.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
  }

  /* Mobile nav */
  var menuToggle = document.getElementById('menuToggle');
  var mobileNav = document.getElementById('mobileNav');
  if(menuToggle && mobileNav){
    menuToggle.addEventListener('click', function(){
      var open = mobileNav.classList.toggle('open');
      menuToggle.classList.toggle('open', open);
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileNav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        mobileNav.classList.remove('open');
        menuToggle.classList.remove('open');
      });
    });
  }

  /* Ember particle field (ambient, decorative) */
  var field = document.getElementById('emberField');
  if(field && !reduceMotion){
    var count = window.innerWidth < 700 ? 16 : 30;
    for(var i=0;i<count;i++){
      var d = document.createElement('span');
      d.className = 'ember-dot';
      var size = 2 + Math.random()*3;
      d.style.width = size+'px';
      d.style.height = size+'px';
      d.style.left = (Math.random()*100)+'%';
      d.style.setProperty('--drift', (Math.random()*80-40)+'px');
      d.style.animationDuration = (7 + Math.random()*9)+'s';
      d.style.animationDelay = (Math.random()*12)+'s';
      field.appendChild(d);
    }
  }

  /* Scroll reveal */
  var revealEls = document.querySelectorAll('.reveal');
  if(revealEls.length){
    if('IntersectionObserver' in window && !reduceMotion){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, {threshold:.15, rootMargin:'0px 0px -40px 0px'});
      revealEls.forEach(function(el){ io.observe(el); });
    } else {
      revealEls.forEach(function(el){ el.classList.add('is-visible'); });
    }
  }

  /* FAQ accordion */
  document.querySelectorAll('.faq-item').forEach(function(item){
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    if(!q || !a) return;
    q.addEventListener('click', function(){
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function(other){
        if(other !== item){
          other.classList.remove('open');
          other.querySelector('.faq-a').style.maxHeight = null;
        }
      });
      if(isOpen){
        item.classList.remove('open');
        a.style.maxHeight = null;
      } else {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  /* ============================================================
     PROCESS MOCKUP (Cómo funciona) — auto-playing step sequence
     ============================================================ */
  var scene = document.getElementById('processScene');
  var steps = document.querySelectorAll('.process-step');
  if(scene && steps.length){
    var stepCount = steps.length;
    var current = 0;
    var stageEls = scene.querySelectorAll('[data-min-stage]');
    function setStage(n){
      scene.setAttribute('data-stage', n);
      steps.forEach(function(s, idx){
        s.classList.toggle('active', idx === n);
      });
      stageEls.forEach(function(el){
        var min = parseInt(el.getAttribute('data-min-stage'), 10);
        el.classList.toggle('on', n >= min);
      });
    }
    setStage(0);
    steps.forEach(function(s, idx){
      s.addEventListener('click', function(){
        current = idx;
        setStage(current);
        restart();
      });
    });
    var timer = null;
    function tick(){
      current = (current + 1) % stepCount;
      setStage(current);
    }
    function restart(){
      if(timer) clearInterval(timer);
      if(!reduceMotion){ timer = setInterval(tick, 2600); }
    }
    restart();
  }

  /* ============================================================
     COTIZADOR — multi-step logic
     ============================================================ */
  var quoteBox = document.getElementById('quoteBox');
  if(quoteBox){
    var state = { tipo:null, m2:null, zona:null, agua:null, retardante:null, gabinete:null, nombre:'', comuna:'' };
    var currentStep = 1;
    var totalSteps = 5;

    function goToStep(n){
      currentStep = n;
      quoteBox.querySelectorAll('.q-step').forEach(function(s){
        s.classList.toggle('active', parseInt(s.getAttribute('data-step'),10) === n);
      });
      quoteBox.querySelectorAll('.rail-step').forEach(function(r){
        var rn = parseInt(r.getAttribute('data-rail'),10);
        r.classList.toggle('active', rn === n);
        r.classList.toggle('done', rn < n);
      });
      if(n === totalSteps){ renderSummary(); }
    }

    /* single-select option cards */
    quoteBox.querySelectorAll('.option-grid[data-group]').forEach(function(group){
      var key = group.getAttribute('data-group');
      var multi = group.hasAttribute('data-multi');
      group.querySelectorAll('.option-card').forEach(function(card){
        card.addEventListener('click', function(){
          if(multi){
            var on = card.classList.toggle('selected');
            state[key] = on ? card.getAttribute('data-value') : null;
          } else {
            group.querySelectorAll('.option-card').forEach(function(c){ c.classList.remove('selected'); });
            card.classList.add('selected');
            state[key] = card.getAttribute('data-value');
          }
          var stepEl = group.closest('.q-step');
          var nextBtn = stepEl ? stepEl.querySelector('[data-next]') : null;
          if(nextBtn && !multi){ nextBtn.disabled = false; }
        });
      });
    });

    var m2Input = document.getElementById('q-m2');
    if(m2Input){
      m2Input.addEventListener('input', function(){
        state.m2 = m2Input.value;
        checkStep2();
      });
    }
    function checkStep2(){
      var stepEl = quoteBox.querySelector('[data-step="2"]');
      if(!stepEl) return;
      var nextBtn = stepEl.querySelector('[data-next]');
      if(nextBtn){ nextBtn.disabled = !(state.m2 && state.zona); }
    }
    quoteBox.querySelectorAll('[data-group="zona"] .option-card').forEach(function(c){
      c.addEventListener('click', checkStep2);
    });

    quoteBox.querySelectorAll('[data-next]').forEach(function(btn){
      btn.addEventListener('click', function(){
        if(currentStep < totalSteps){ goToStep(currentStep+1); }
      });
    });
    quoteBox.querySelectorAll('[data-back]').forEach(function(btn){
      btn.addEventListener('click', function(){
        if(currentStep > 1){ goToStep(currentStep-1); }
      });
    });

    var nombreInput = document.getElementById('q-nombre');
    var comunaInput = document.getElementById('q-comuna');
    if(nombreInput){ nombreInput.addEventListener('input', function(){ state.nombre = nombreInput.value; renderSummary(); updateWaLink(); }); }
    if(comunaInput){ comunaInput.addEventListener('input', function(){ state.comuna = comunaInput.value; renderSummary(); updateWaLink(); }); }

    function renderSummary(){
      var list = document.getElementById('summaryList');
      if(!list) return;
      var rows = [
        ['Tipo de propiedad', state.tipo || '—'],
        ['Tamaño', state.m2 ? state.m2 + ' m² aprox.' : '—'],
        ['Ubicación', state.zona || '—'],
        ['Fuente de agua', state.agua || '—'],
        ['Retardante Clase A (upgrade)', state.retardante ? 'Sí, incluir' : 'No por ahora'],
        ['Gabinete contra incendio', state.gabinete ? 'Sí, incluir' : 'No por ahora']
      ];
      list.innerHTML = rows.map(function(r){
        return '<div class="srow"><span>'+r[0]+'</span><span>'+r[1]+'</span></div>';
      }).join('');
      updateWaLink();
    }

    function updateWaLink(){
      var link = document.getElementById('sendWa');
      if(!link) return;
      var nombre = state.nombre || 'Sin nombre indicado';
      var comuna = state.comuna || 'Sin comuna indicada';
      var msg = "Hola, quiero cotizar un sistema AQUADEFENSA.\n\n"
        + "Nombre: " + nombre + "\n"
        + "Comuna: " + comuna + "\n"
        + "Tipo de propiedad: " + (state.tipo || '-') + "\n"
        + "Tamaño: " + (state.m2 ? state.m2 + ' m2 aprox.' : '-') + "\n"
        + "Ubicación: " + (state.zona || '-') + "\n"
        + "Fuente de agua: " + (state.agua || '-') + "\n"
        + "Upgrade retardante Clase A: " + (state.retardante ? 'Sí' : 'No') + "\n"
        + "Gabinete contra incendio: " + (state.gabinete ? 'Sí' : 'No');
      link.href = "https://wa.me/56988154096?text=" + encodeURIComponent(msg);
    }

    renderSummary();
  }
})();
