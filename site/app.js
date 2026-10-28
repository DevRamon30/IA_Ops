(() => {
  const config = window.AIOPS_CONFIG || {};
  const intakeForm = document.querySelector('#intake-form');
  const reviewForm = document.querySelector('#review-form');
  const show = (output, message, kind = '') => { output.textContent = message; output.className = `result ${kind}`; };
  const showReviewLink = (output, reviewToken) => {
    if (!reviewToken) return;
    const link = new URL(window.location.href);
    link.search = '';
    link.searchParams.set('token', reviewToken);
    const note = document.createElement('p');
    note.textContent = 'Demonstração: encaminhe este link ao revisor humano: ';
    const anchor = document.createElement('a');
    anchor.href = link.toString();
    anchor.textContent = 'Abrir revisão';
    note.append(anchor);
    output.append(note);
  };
  async function post(url, data) {
    if (!url || url.includes('SEU_WEBHOOK')) throw new Error('Configure as URLs dos webhooks em site/config.js antes de publicar.');
    const response = await fetch(url, { method:'POST', body:new URLSearchParams(data) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || payload.detail || payload.error || 'Não foi possível concluir a solicitação.');
    return payload;
  }
  intakeForm.addEventListener('submit', async (event) => {
    event.preventDefault(); if (!intakeForm.reportValidity()) return;
    const output = document.querySelector('#intake-result'); const button = intakeForm.querySelector('button'); button.disabled = true; show(output, 'Enviando...');
    try { const data = Object.fromEntries(new FormData(intakeForm)); const result = await post(config.intakeWebhookUrl, data); const duplicate = result.duplicate ? ' Solicitação já registrada; não foi reprocessada.' : ''; show(output, `Protocolo ${result.external_id || data.external_id}: ${result.status || 'recebido'}.${duplicate}`, 'success'); showReviewLink(output, result.review_token); if (!result.duplicate) intakeForm.reset(); }
    catch (error) { show(output, error.message, 'error'); } finally { button.disabled = false; }
  });
  const token = new URLSearchParams(window.location.search).get('token');
  if (token) { document.querySelector('#review-card').classList.remove('hidden'); document.querySelector('#review-token').value = token; document.querySelector('#intake-card').classList.add('hidden'); }
  reviewForm.addEventListener('submit', async (event) => {
    event.preventDefault(); if (!reviewForm.reportValidity()) return;
    const output = document.querySelector('#review-result'); const clicked = event.submitter; const buttons = reviewForm.querySelectorAll('button'); buttons.forEach((button) => { button.disabled = true; }); show(output, 'Registrando decisão...');
    try { const data = Object.fromEntries(new FormData(reviewForm)); data.decision = clicked.value; const result = await post(config.decisionWebhookUrl, data); show(output, result.message || `Decisão registrada: ${result.status || 'sucesso'}.`, 'success'); reviewForm.reset(); }
    catch (error) { show(output, error.message, 'error'); } finally { buttons.forEach((button) => { button.disabled = false; }); }
  });
})();
