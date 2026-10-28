# Roteiro do pitch (máximo 4 minutos)

**0:00-0:35 - Problema:** solicitações chegam por vários canais; copiar dados, priorizar e encaminhar manualmente cria atraso, retrabalho e pouca rastreabilidade. A IA não decide ações jurídicas ou de acesso.

**0:35-1:10 - Arquitetura:** mostre a interface no Cloudflare Pages, os cenários no Make, OpenAI para interpretação, Supabase para estado/auditoria e Gmail para notificações. Não há servidor próprio ou n8n.

**1:10-2:30 - Demonstração real:** envie uma solicitação de contrato pelo formulário; mostre o webhook e os módulos no Make, a linha criada no Supabase e o e-mail de revisão.

**2:30-3:10 - Human-in-the-Loop:** abra o link de revisão, aprove ou rejeite, mostre a decisão e o evento de auditoria. Reabra o mesmo link e prove que o token não pode ser reutilizado.

**3:10-3:35 - Exceções:** mostre um `external_id` duplicado e explique o fallback: se a IA falhar ou responder algo inválido, a demanda vai para uma pessoa.

**3:35-4:00 - Valor e próximos passos:** cite redução de transferências manuais e rastreabilidade; não apresente estimativas como resultado obtido. Para produção: Auth/SSO, RBAC, HTTPS, rate limit, outbox de e-mails e política LGPD.

**Antes de enviar:** grave uma execução verdadeira, oculte URLs de webhook, chaves, tokens e dados pessoais, publique em YouTube não listado/Loom/Drive e teste o link em janela anônima.
