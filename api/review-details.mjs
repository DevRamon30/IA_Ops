const json = (body, status = 200) => Response.json(body, { status });

export default {
  async fetch(request) {
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'review_details_not_configured' }, 500);

    try {
      const form = await request.formData();
      const token = String(form.get('token') || '').trim();
      if (!token) return json({ error: 'invalid_token', message: 'O link de decisão é inválido ou está incompleto.' }, 400);

      const upstream = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/get_review_request`, {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_raw_token: token })
      });

      if (!upstream.ok) return json({ error: 'review_details_unavailable', message: 'Não foi possível carregar os dados da solicitação.' }, 502);

      const rows = await upstream.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return json({ error: 'invalid_or_used_token', message: 'Este link expirou, já foi utilizado ou não está disponível.' }, 404);
      }

      return json({ request: rows[0] });
    } catch {
      return json({ error: 'review_details_unavailable', message: 'Não foi possível carregar os dados da solicitação.' }, 502);
    }
  }
};
