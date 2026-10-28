# Testes e evidências

Use apenas dados fictícios. Não inclua chaves, URLs de webhook ou tokens nas capturas.

| Caso | Ação | Resultado esperado | Situação |
| --- | --- | --- | --- |
| T01 | Enviar solicitação nova ao cenário 1 | Registro criado e resposta `202` | Validado |
| T02 | Classificar solicitação com Gemini | Categoria, prioridade, confiança e resumo persistidos | Validado |
| T03 | Criar token de revisão | Demanda fica `pending_approval`; hash é salvo | Validado |
| T04 | Aprovar pelo cenário 2 | Resposta `200`, demanda `approved`, `decided_at` preenchido | Validado |
| T05 | Reutilizar o mesmo token | Resposta `404`; nenhuma segunda decisão é criada | Validado |
| T06 | Consultar auditoria | `received`, `classified`, `review_requested` e `approved` | Validado |
| T07 | Reenviar mesmo `external_id` | Caminho de protocolo duplicado | Pendente de evidência final |
| T08 | Rejeitar uma nova solicitação | Demanda `rejected` e evento `rejected` | Pendente de evidência final |

## Evidências já obtidas

- Demanda `DEMO-0011` classificada como `acesso`, prioridade `high` e encaminhada para aprovação.
- Demanda `DEMO-0011` atualizada para `approved`.
- `approval_token_hash` removido e `decided_at` preenchido após a decisão.
- Auditoria da demanda 14: `received`, `classified`, `review_requested` e `approved`; ator `Vitor Revisor` na decisão.
- Reenvio do token consumido retornou HTTP `404`.

## Consultas para demonstração

```sql
select id, external_id, category, priority, confidence, status, decided_at
from public.demands
order by id desc;

select demand_id, event_type, actor, details, created_at
from public.audit_events
order by id desc;
```

## Capturas recomendadas

1. Cenário 1 completo no Make, com a rota de nova solicitação.
2. Resultado do Gemini estruturado.
3. Linha de `DEMO-0011` em `public.demands`, mostrando `approved`.
4. Eventos de auditoria da demanda 14.
5. Rota `Token inválido ou usado` no Make, sem mostrar o token.
