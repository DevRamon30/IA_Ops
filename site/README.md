# Frontend AIOps

Esta pasta contém uma interface estática, sem backend próprio. Ela usa `fetch` para chamar os dois webhooks públicos do Make. Os campos são enviados como formulário (`application/x-www-form-urlencoded`) para evitar o preflight CORS do navegador.

## Antes da publicação

1. No Vercel, cadastre `MAKE_INTAKE_WEBHOOK_URL` e `MAKE_DECISION_WEBHOOK_URL` como variáveis de ambiente.
2. Publique o repositório no Vercel. As rotas `/api/intake` e `/api/decision` repassam os dados para o Make sem expor os webhooks no navegador.
3. Não é necessário configurar CORS no Make, pois o navegador se comunica apenas com o mesmo domínio do Vercel.

## Uso

- A página inicial exibe o formulário de nova solicitação.
- Uma URL no formato `https://SEU-DOMINIO/?token=TOKEN_DE_REVISAO` exibe a tela de aprovação/rejeição.
- Para a demonstração, o cenário 1 devolve `review_token` e a página mostra o link de revisão. Em produção, o token deve ser enviado somente ao revisor autenticado.

Para a demonstração, não mostre tokens, URLs de webhook nem credenciais em capturas públicas.
