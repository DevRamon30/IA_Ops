const json = (body, status = 200) => Response.json(body, { status });

export default {
  async fetch(request) {
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

    const webhookUrl = process.env.MAKE_INTAKE_WEBHOOK_URL;
    if (!webhookUrl) return json({ error: 'automation_not_configured' }, 500);

    try {
      const form = await request.formData();
      const payload = Object.fromEntries(form);
      const upstream = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json; charset=utf-8' }
      });
    } catch {
      return json({ error: 'automation_unavailable', message: 'Não foi possível enviar a solicitação.' }, 502);
    }
  }
};
