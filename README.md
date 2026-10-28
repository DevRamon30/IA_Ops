# AIOps — triagem inteligente com Make.com

Projeto acadêmico de automação empresarial que recebe solicitações, usa IA para classificá-las, encaminha demandas de risco para decisão humana e mantém uma trilha de auditoria no banco de dados.

> A IA classifica e resume. Ela não aprova solicitações nem executa decisões críticas.

## Implementação validada

| Camada | Serviço | Papel |
| --- | --- | --- |
| Interface e proxy | Vercel | Site público e rotas de servidor que protegem os webhooks |
| Orquestração | Make.com | Webhooks, roteamento e chamadas HTTP |
| IA | Google Gemini AI | Categoria, prioridade, confiança e resumo estruturados |
| Persistência | Supabase PostgreSQL | Demandas, auditoria e funções RPC |

## Fluxo entregue

```text
Solicitante
  -> Webhook do Make (cenário 1)
  -> Supabase: register_intake
  -> Google Gemini AI: classificação estruturada
  -> Supabase: save_classification + create_review_token
  -> resposta 202: pending_approval

Revisor humano
  -> Vercel `/api/decision` -> Webhook do Make (cenário 2)
  -> Supabase: consume_review_token
  -> 200: decisão registrada | 404: token inválido ou já utilizado
```

O Supabase registra os eventos `received`, `classified`, `review_requested`, `approved` ou `rejected`. O token de revisão é persistido apenas como SHA-256 e removido na mesma operação que grava a decisão, impedindo uso repetido.

## Cenários do Make

1. **AIOps - 01 Receber e registrar**: recebe a solicitação, evita duplicidade, classifica com Gemini, persiste a classificação, cria o token de revisão e responde `202`.
2. **AIOps - 02 Decisão humana**: recebe token, decisão e revisor; consome o token atomicamente e responde sucesso ou token inválido.

Consulte [docs/MAKE_SETUP.md](docs/MAKE_SETUP.md) para a configuração e [docs/TESTES.md](docs/TESTES.md) para os testes e evidências.

## Banco de dados

Execute [supabase/schema.sql](supabase/schema.sql) no SQL Editor de um projeto Supabase. O arquivo cria:

- `demands` — solicitações e estado do ciclo;
- `audit_events` — trilha de auditoria;
- `automation_errors` — estrutura para erros operacionais;
- funções RPC `register_intake`, `save_classification`, `create_review_token` e `consume_review_token`.

## Publicação no Vercel

O diretório `dist/` contém os arquivos estáticos e `api/` contém dois proxies de servidor. No painel do Vercel, importe o repositório e registre estas variáveis de ambiente para Production, Preview e Development:

- `MAKE_INTAKE_WEBHOOK_URL`;
- `MAKE_DECISION_WEBHOOK_URL`.

Os valores são as URLs dos respectivos webhooks do Make e não devem ser adicionados ao GitHub. Após salvar variáveis, faça um novo deploy.

## Segurança e limites

- Chaves de Supabase e Gemini ficam somente nas conexões do Make.
- Não inclua token de revisão, URL de webhook ou credenciais em capturas, repositórios ou documentação pública.
- RLS está ativado e as funções são executadas pelo serviço de automação.
- Para produção, seriam necessários autenticação do revisor, RBAC, limites de requisição, monitoramento, retentativas e políticas de privacidade/LGPD.

## Resultado de teste comprovado

A demanda de teste `DEMO-0011` percorreu o fluxo completo: classificação, solicitação de revisão, aprovação por `Vitor Revisor`, atualização para `approved`, registro dos quatro eventos de auditoria e bloqueio de uma tentativa de reutilizar o mesmo token com HTTP `404`.
