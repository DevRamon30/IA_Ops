/*
 * Configuração local do frontend.
 * Em produção no Vercel, o navegador chama as rotas internas /api.
 * As URLs reais do Make ficam somente nas variáveis de ambiente do Vercel.
 */
window.AIOPS_CONFIG = {
  intakeWebhookUrl: '/api/intake',
  decisionWebhookUrl: '/api/decision'
};
