# Configuração validada no Make.com

Este documento registra a automação que foi realmente construída e testada no Make. Ela possui dois cenários, usa Google Gemini AI para classificação e usa funções RPC do Supabase para persistência, auditoria e consumo único do token de revisão.

## Conexões

Crie somente estas conexões no Make:

| Conexão | Uso |
| --- | --- |
| Google Gemini AI | Módulo **Extract structured data**, modelo `gemini-2.5-flash` |
| HTTP - Supabase REST API | Chave de API guardada na conexão; URL permitida do projeto Supabase |

As URLs RPC têm o formato `https://SEU_PROJECT_REF.supabase.co/rest/v1/rpc/NOME_DA_FUNCAO`. Nunca registre a chave da conexão, tokens de aprovação ou URLs de webhook em evidências públicas.

## Cenário 1 — AIOps - 01 Receber e registrar

1. **Webhooks > Custom webhook** recebe `external_id`, `requester_name`, `requester_email` e `description`.
2. **HTTP > Make a request** faz `POST` para `register_intake`.
3. **Iterator** percorre o array retornado pela função RPC.
4. **Router** separa protocolo duplicado (`created=false`) de solicitação nova (`created=true`).
5. A rota de protocolo duplicado responde `200` ao webhook.
6. A rota nova usa **Google Gemini AI > Extract structured data** para produzir:
   - `category`: `contratos`, `faturamento`, `acesso` ou `outros`;
   - `priority`: `low`, `medium` ou `high`;
   - `confidence`: número entre 0 e 1;
   - `summary`: resumo textual.
7. **HTTP > Make a request** chama `save_classification`, enviando os campos retornados pelo Gemini, `p_needs_review=true` e `p_fallback=false`.
8. **Tools > Set variable** cria `approval_token` com `uuid()`.
9. **HTTP > Make a request** chama `create_review_token` com `p_id` e o token bruto. O Supabase grava somente o hash.
10. **Webhooks > Webhook response** retorna `202` com `Content-Type: application/json` e o estado `pending_approval`.

## Cenário 2 — AIOps - 02 Decisão humana

1. **Webhooks > Custom webhook** recebe `token`, `decision` e `reviewer`.
2. **HTTP > Make a request** chama `consume_review_token` com:
   - `p_raw_token` = token do webhook;
   - `p_decision` = `approve` ou `reject`;
   - `p_reviewer` = nome do revisor.
3. **Router** avalia o tamanho do array `Data` retornado pelo HTTP:
   - tamanho maior que `0`: decisão registrada;
   - tamanho igual a `0`: token inválido ou já utilizado.
4. Na rota de sucesso, um **Iterator** percorre `HTTP 2 > Data`; um **Webhook response** devolve `200` com `{"ok":true,"message":"Decisao registrada com sucesso."}`.
5. Na rota de token inválido, o **Webhook response** devolve `404` com `{"ok":false,"error":"invalid_or_used_token"}`.

## Execução manual de teste

1. Clique em **Run once** antes de chamar cada webhook.
2. Envie uma demanda nova ao cenário 1 e obtenha o token apenas localmente no módulo **Tools > Set variable**.
3. Envie a decisão ao cenário 2.
4. Confira `demands` e `audit_events` no Supabase.
5. Reenvie localmente a mesma decisão com o mesmo token: o cenário deve retornar `404`, comprovando uso único.

Os dois cenários podem permanecer desativados enquanto não estão em demonstração. Ative-os somente se for necessário receber requisições automaticamente.
