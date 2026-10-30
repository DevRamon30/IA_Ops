(() => {
  const config = window.AIOPS_CONFIG || {};
  const token = new URLSearchParams(window.location.search).get('token');
  const reviewForm = document.querySelector('#review-form');
  const details = document.querySelector('#request-details');
  const show = (output, message, kind = '') => { output.textContent = message; output.className = `result ${kind}`; };
  const setLoading = (button, loading) => {
    button.disabled = loading;
    if (loading) {
      button.dataset.label = button.innerHTML;
      button.innerHTML = '<span aria-hidden="true">◌</span> Processando...';
    } else if (button.dataset.label) button.innerHTML = button.dataset.label;
  };
  const renderDetails = (data) => {
    const values = [
      ['Protocolo', data.external_id],
      ['Solicitante', data.requester_name],
      ['E-mail', data.requester_email],
      ['Descrição', data.description]
    ];
    details.replaceChildren();
    values.forEach(([label, value]) => {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value || 'Não informado';
      row.append(dt, dd);
      details.append(row);
    });
  };
  async function loadDetails() {
    renderDetails({
      external_id: 'Carregando…',
      requester_name: 'Carregando…',
      requester_email: 'Carregando…',
      description: 'Carregando os dados protegidos da solicitação.'
    });
    try {
      const response = await fetch(config.reviewDetailsUrl, {
        method: 'POST',
        body: new URLSearchParams({ token })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Não foi possível carregar os dados da solicitação.');
      renderDetails(payload.request);
    } catch (error) {
      renderDetails({
        external_id: 'Dados indisponíveis',
        requester_name: 'Não informado',
        requester_email: 'Não informado',
        description: error.message
      });
    }
  }
  if (!token) {
    document.querySelector('.review-form').classList.add('hidden');
    show(document.querySelector('#review-result'), 'Este link de decisão é inválido ou está incompleto.', 'error');
  } else {
    document.querySelector('#review-token').value = token;
    loadDetails();
  }
  async function post(url, data) {
    if (!url || url.includes('SEU_WEBHOOK')) throw new Error('Não foi possível localizar a integração. Tente novamente em alguns instantes.');
    const response = await fetch(url, { method: 'POST', body: new URLSearchParams(data) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || payload.detail || payload.error || 'Não foi possível concluir a decisão.');
    return payload;
  }
  reviewForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!reviewForm.reportValidity() || !token) return;
    const output = document.querySelector('#review-result');
    const clicked = event.submitter;
    const buttons = reviewForm.querySelectorAll('button');
    buttons.forEach((button) => setLoading(button, true));
    show(output, 'Registrando a decisão no fluxo de auditoria.');
    try {
      const data = Object.fromEntries(new FormData(reviewForm));
      data.decision = clicked.value;
      const result = await post(config.decisionWebhookUrl, data);
      sessionStorage.removeItem(`aiops-review-${token}`);
      show(output, result.message || 'Decisão registrada com sucesso.', 'success');
      reviewForm.reset();
    } catch (error) {
      show(output, error.message, 'error');
    } finally {
      buttons.forEach((button) => setLoading(button, false));
    }
  });
})();
