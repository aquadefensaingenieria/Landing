(function(){
  'use strict';
  var storageKey = 'aqd:estimacion:v1';
  var ttl = 30 * 60 * 1000;
  var observer;
  function readQuote(){
    try {
      var saved = JSON.parse(sessionStorage.getItem(storageKey));
      if(!saved) return null;
      var l = saved.lead;
      if(!Number.isFinite(saved.at) || Date.now() - saved.at > ttl || saved.at > Date.now() ||
        !['cotizador.html','landing.html'].includes(saved.page) || !l ||
        !Number.isSafeInteger(l.m2) || l.m2 <= 0 || !Number.isSafeInteger(l.pisos) || l.pisos <= 0 ||
        typeof l.piscina !== 'boolean' || !['nombre','telefono','email','comuna','region'].every(function(k){ return typeof l[k] === 'string' && l[k].length <= 200; })) {
        sessionStorage.removeItem(storageKey);
        return null;
      }
      return saved;
    } catch(ignore){ return null; }
  }
  window.aqdSaveQuote = function(lead){
    // Same-tab return only: no personal data in URLs; snapshot expires after 30 minutes.
    try {
      var page = location.pathname.replace(/\/+$/, '').split('/').pop();
      if(page === 'cotizador' || page === 'landing') page += '.html';
      if(!['cotizador.html','landing.html'].includes(page)) return;
      var data = {};
      ['m2','pisos','piscina','nombre','telefono','email','comuna','region'].forEach(function(k){ data[k] = lead[k]; });
      sessionStorage.setItem(storageKey, JSON.stringify({at:Date.now(), page:page, lead:data}));
    } catch(ignore){}
  };
  window.aqdRestoreQuote = function(lead, calculate, render){
    if(location.hash !== '#mi-estimacion') return;
    var saved = readQuote();
    if(!saved) return;
    Object.assign(lead, saved.lead);
    var estimate = calculate();
    if(estimate.estado !== 'OK') return;
    lead.estimacionManual = estimate.netoAsistida;
    lead.estimacionAutonoma = estimate.netoAutonoma;
    render(estimate); // Restore locally, without submitting the lead again.
  };
  window.aqdSetupQuoteReturn = function(){
    var link = document.getElementById('return-to-quote');
    var saved = readQuote();
    if(!link || !saved) return;
    link.href = saved.page + '#mi-estimacion';
    link.textContent = 'Volver a mi estimación →';
  };
  window.aqdMountExplainer = function(){
    if(observer) observer.disconnect();
    var slot = document.getElementById('result-explainer-slot');
    var template = document.getElementById('explainer-template');
    if(!slot || !template) return;
    slot.replaceChildren(template.content.cloneNode(true));
    var details = slot.querySelector('details');
    details.addEventListener('toggle',function(){
      if(details.open){
        details.classList.remove('cta-attention');
        if(window.aqdTrack) window.aqdTrack('cotizador_animacion_open');
      }
    });
    if(matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(function(entries){
      if(entries.some(function(e){return e.isIntersecting;})){
        details.classList.add('cta-attention');
        observer.disconnect();
      }
    },{threshold:.6});
    observer.observe(details.querySelector('summary'));
  };
  window.addEventListener('message',function(event){
    var frame = document.querySelector('.result-explainer iframe');
    if(frame && event.source === frame.contentWindow && event.data &&
      event.data.type === 'aqd-animation-height' && Number.isFinite(event.data.height)) {
      frame.style.height = Math.max(300, Math.min(2400,event.data.height)) + 'px';
    }
  });
})();
