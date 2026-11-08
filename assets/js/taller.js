async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* probar selección local */ }
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.style.cssText = 'position:fixed;opacity:0';
  document.body.append(area);
  area.select();
  const copied = document.execCommand('copy');
  area.remove();
  if (!copied) throw new Error('Copia no disponible');
}

function revealHash() {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (!target) return;
  for (let node = target; node; node = node.parentElement) if (node.tagName === 'DETAILS') node.open = true;
  target.scrollIntoView();
}
window.addEventListener('hashchange', revealHash);
if (location.hash) requestAnimationFrame(revealHash);

document.addEventListener('click', async event => {
  const copy = event.target.closest('[data-copy-url], [data-copy-inline]');
  if (copy) {
    const container = copy.closest('.code-card, .terminal');
    const status = container.querySelector('.copy-status');
    copy.disabled = true;
    try {
      let text;
      if (copy.dataset.copyUrl) {
        const response = await fetch(copy.dataset.copyUrl);
        if (!response.ok) throw new Error('Archivo no disponible');
        text = await response.text();
      } else text = container.querySelector('code').textContent;
      await copyText(text);
      status.textContent = 'Copiado completo. Reemplaza el contenido del archivo indicado y guarda.';
    } catch {
      status.textContent = 'No se pudo copiar. Usa Descargar y abre el archivo; en Terminal, selecciona el comando manualmente.';
    } finally { copy.disabled = false; }
  }
  const next = event.target.closest('[data-next-change]');
  if (next) {
    const marks = [...next.closest('.code-card').querySelectorAll('[data-change]')];
    const index = Number(next.dataset.index || 0) % marks.length;
    marks[index].scrollIntoView({ block: 'center' });
    marks[index].focus({ preventScroll: true });
    next.dataset.index = index + 1;
    next.textContent = `Cambio ${index + 1} de ${marks.length} · siguiente`;
  }
  const projector = event.target.closest('[data-projector]');
  if (projector) {
    const active = document.body.classList.toggle('projector');
    projector.setAttribute('aria-pressed', active);
    projector.textContent = active ? 'Vista normal' : 'Ampliar para proyectar';
  }
});

const links = [...document.querySelectorAll('.sidebar a')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      links.forEach(link => link.removeAttribute('aria-current'));
      links.find(link => link.hash === `#${entry.target.id}`)?.setAttribute('aria-current', 'step');
    }
  }, { rootMargin: '-5% 0px -75% 0px' });
  document.querySelectorAll('.lesson').forEach(section => observer.observe(section));
}
