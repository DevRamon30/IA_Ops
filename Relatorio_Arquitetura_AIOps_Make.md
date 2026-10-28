# Arquitetura — AIOps com Make.com

## Problema

Solicitações internas exigem leitura, classificação, priorização, encaminhamento e acompanhamento. Quando esse processo é manual, há demora e pouca rastreabilidade. A solução centraliza a entrada, automatiza a triagem repetitiva e mantém a decisão crítica com uma pessoa revisora.

## Arquitetura implementada

```text
Webhook Make (cenário 1)
  -> Supabase RPC: register_intake
  -> Google Gemini AI: dados estruturados
  -> Supabase RPC: save_classification
  -> Supabase RPC: create_review_token

Webhook Make (cenário 2)
  -> Supabase RPC: consume_review_token
  -> demands + audit_events
```

O Make é a camada visual de orquestração. O Google Gemini AI classifica uma descrição em categoria, prioridade, confiança e resumo. O Supabase concentra a persistência e regras que não devem depender apenas do cenário visual: idempotência por `external_id`, auditoria e consumo atômico do token.

## Controle humano e segurança

Demandas classificadas são encaminhadas como `pending_approval`. O cenário de decisão recebe `token`, `decision` e `reviewer`. A função `consume_review_token` compara o hash SHA-256, aceita somente demandas pendentes, atualiza o status, remove o hash e grava a auditoria em uma única operação. Assim, o mesmo token não pode gerar uma segunda decisão.

O teste validado demonstrou a transição para `approved`, o preenchimento de `decided_at`, a remoção do hash e a resposta HTTP 404 em tentativa de reutilização.

## Limites e evolução

A demonstração usa dados fictícios e webhooks disparados manualmente. Uma versão de produção deveria incluir autenticação do revisor, RBAC, limite de requisições, alertas, monitoramento, retentativas, política de retenção e adequação à LGPD. A IA permanece como apoio de triagem, não como autoridade decisória.
