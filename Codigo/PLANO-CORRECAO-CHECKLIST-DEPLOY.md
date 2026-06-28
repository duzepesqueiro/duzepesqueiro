# Plano de Correção (CHECKLIST-DEPLOY) — Mudanças Mínimas (sem CI/CD, Docker e Kubernetes por enquanto)

Este documento descreve um plano estruturado, passo a passo, para corrigir os pontos identificados na validação do `CHECKLIST-DEPLOY`, considerando também o conteúdo do relatório existente em `Codigo/RELATORIO-AUDITORIA-PREDEPLOY.md`.

Restrições assumidas neste plano:
- Não alterar nada de pipeline CI/CD, Docker e Kubernetes neste momento (apenas ações manuais de verificação local e correções de código/config do app).
- Fazer as mínimas alterações possíveis para eliminar riscos críticos e elevar o sistema ao nível mínimo aceitável de produção sob a ótica do checklist.

Referências principais (evidências no repositório):
- Relatório anterior: [RELATORIO-AUDITORIA-PREDEPLOY.md](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/RELATORIO-AUDITORIA-PREDEPLOY.md)
- Backend: [Codigo/backend](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend)
- Frontend: [Codigo/frontend](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/frontend)

---

## 0) Critérios de Aceitação Globais (para encerrar o plano)

- Segurança:
  - Nenhum endpoint administrativo pode ser acessado por usuário não autorizado (RBAC efetivo e testado).
  - Nenhum segredo/credencial/senha/token pode ser persistido em logs.
  - Sessão do usuário não pode depender de armazenamento persistente acessível a JavaScript (ex.: `localStorage`) para refresh token.
- Operação:
  - Healthcheck funcional e estável.
  - Variáveis de ambiente obrigatórias validadas na inicialização.
  - Observabilidade mínima: logs estruturados e correlação por `requestId`.
- Qualidade:
  - Testes críticos adicionados para prevenir regressões de segurança.
  - Dependências com vulnerabilidades críticas/altas mitigadas (ao menos as exploráveis no runtime).

---

## 1) P0 — Corrigir Broken Access Control (Export Admin)

Contexto no relatório:
- “Export admin sem `RolesGuard`” (P0) em `Codigo/RELATORIO-AUDITORIA-PREDEPLOY.md`.

Evidência no código:
- Controller aplica `@Roles(...)`, mas não aplica `RolesGuard` ([export.controller.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/application/export/export.controller.ts#L12-L17)).
- `RolesGuard` existe ([roles.guard.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/application/auth/guards/roles.guard.ts)).

### Passo a passo (mudança mínima)
1. Alterar o `ExportController` para usar `@UseGuards(JwtAuthGuard, RolesGuard)` no escopo do controller.
2. Fazer uma varredura por `@Roles(` no backend e garantir que todo endpoint que usa `@Roles` também tenha `RolesGuard` aplicado (no método ou na classe), ou que exista um guard global.
3. Adicionar testes de autorização:
   - Caso negativo: usuário `CUSTOMER` com JWT válido deve receber `403` ao acessar `/api/admin/export/...`.
   - Caso positivo: usuário `ADMIN` (ou `MANAGER`) deve receber `200`.

### Critério de aceite
- Export admin bloqueado para não-admin/manager com testes automatizados cobrindo.

---

## 2) P0 — Eliminar Vazamento de Credenciais/PII em Auditoria e Logs

Contexto no relatório:
- “Logs com PII” (P3), mas o comportamento atual pode virar P0 por envolver senha/token dependendo do endpoint.

Evidência no código:
- `AuditInterceptor` grava `changes.request` e `changes.response` para qualquer mutação HTTP (não-GET) ([audit.interceptor.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/shared/common/interceptors/audit.interceptor.ts#L19-L52)).
- Persistência em Mongo não faz redaction (apenas serializa) ([logs-mongo.repository.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/application/logs/services/logs-mongo.repository.ts#L48-L59)).

### Passo a passo (mudança mínima e segura)
1. Trocar a estratégia do `AuditInterceptor` para “deny by default”:
   - Nunca registrar body bruto por padrão.
   - Registrar apenas metadados essenciais: `path`, `method`, `userId`, `entity`, `entityId`, `status`, `durationMs`.
2. Se for necessário manter “changes”, implementar redaction por denylist (mínimo):
   - Campos a remover/mascarar recursivamente: `password`, `senha`, `token`, `authorization`, `accessToken`, `refreshToken`, `cookie`, `set-cookie`, `document`, `cpf`, `cnpj`, `email` (avaliar necessidade), `MAIL_PASSWORD`, `JWT_SECRET`, `MERCADOPAGO_ACCESS_TOKEN`.
3. Criar uma lista de rotas sensíveis onde o interceptor não deve capturar corpo mesmo redigido:
   - `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/reset-password`, `/auth/forgot-password`, webhooks de pagamento.
4. Adicionar um teste unitário/integrado garantindo que:
   - Uma chamada de login não persiste payload contendo `password`/`refreshToken`.
5. Ajustar o `LogsMongoRepository` para aplicar sanitização/redaction também em `meta` e `payload` antes de inserir (defesa em profundidade).

### Critério de aceite
- Logs persistidos não contêm segredos/credenciais/dados sensíveis, validado por testes e por grep local em dumps de logs de ambiente de teste.

---

## 3) P1 — Correlação por RequestId (Observabilidade mínima)

Contexto no relatório:
- “Sem correlação de logs/traces” (P2).

Evidência no código:
- Interceptors registram método/path/status, mas não garantem `requestId` ([logging.interceptor.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/application/security/interceptors/logging.interceptor.ts#L17-L50)).

### Passo a passo (mudança mínima)
1. Implementar geração/propagação de `requestId` no backend:
   - Se vier `X-Request-Id` do upstream, reutilizar; senão gerar UUID.
   - Incluir `requestId` no `res` (header `X-Request-Id`).
2. Injetar `requestId` em todos os logs (`LogsService`) via `meta`.
3. Atualizar interceptors existentes para incluir `requestId` no meta e nos logs de console.

### Critério de aceite
- Cada resposta HTTP contém `X-Request-Id` e os logs persistidos incluem o mesmo `requestId`.

---

## 4) P1 — Harden de Tratamento de Erros (evitar exposição de internals)

Contexto no relatório:
- “Exceções expostas ao cliente” (P2).

Evidência no código:
- Filtro global inclui `details` e usa `exceptionResponse.message` conforme vem do erro ([http-exception.filter.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/shared/common/filters/http-exception.filter.ts#L15-L55)).

### Passo a passo (mudança mínima)
1. Tornar respostas de erro seguras por ambiente:
   - Em `production`, nunca retornar `details` internos e nunca retornar mensagens não controladas.
2. Padronizar erro:
   - Sempre retornar `{ statusCode, error, message, timestamp, path, requestId }`.
3. Garantir que stack trace só vá para logs internos, nunca para o cliente.

### Critério de aceite
- Cliente não recebe detalhes internos/stack, e o backend mantém observabilidade via logs + requestId.

---

## 5) P1 — Autenticação: Expiração de Token de Confirmação e Proteção contra Brute Force

Contexto no relatório/checklist:
- Checklist exige expiração/revogação/policy. Relatório aponta gaps.

Evidência no código:
- Token de confirmação de e-mail é armazenado sem TTL explícito ([auth.service.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/application/auth/services/auth.service.ts#L744-L759), [auth.service.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/application/auth/services/auth.service.ts#L370-L404)).

### Passo a passo (mudança mínima)
1. Adicionar campos no modelo do Prisma para suportar TTL:
   - `confirmationTokenExpiresAt` (ou equivalente) na entidade de e-mail do usuário.
2. Atualizar `register()` e `resendConfirmation()` para setar expiração (ex.: 15 minutos ou 1 hora).
3. Atualizar `confirmEmail()` para recusar token expirado e emitir mensagem genérica.
4. Adicionar rate limiting específico por rota (sem mexer em infra/pipeline):
   - Aproveitar o throttler já configurado e aplicar override nos endpoints de auth mais sensíveis.

### Critério de aceite
- Token expira e confirmações expiradas falham com erro controlado; tentativas repetidas são rate-limited.

---

## 6) P1 — Autenticação: Revogação/Rotação de Refresh Token (mínimo viável)

Contexto no relatório/checklist:
- Checklist pede “Revogação” e segurança de sessão.

Evidência no código:
- `refreshTokens()` apenas valida assinatura e status do usuário; não há tracking de sessões ([auth.service.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/application/auth/services/auth.service.ts#L286-L310)).

### Passo a passo (mudança mínima, sem trocar toda a arquitetura)
1. Persistir refresh tokens como hashes em uma tabela (por usuário + device/sessionId).
2. No login/refresh:
   - Emitir refresh token rotacionado.
   - Invalidar o hash anterior (rotações).
3. Implementar revogação:
   - Logout: remover refresh token da sessão.
   - Admin/usuário: revogar todas as sessões (opcional, mas recomendado).
4. Adicionar testes:
   - Refresh token reutilizado após rotação deve falhar.

### Critério de aceite
- Refresh token é rotacionado e revogável; reuse é bloqueado.

---

## 7) P1 — Frontend: Remover Dependência de `localStorage` para Sessão (mínimo de mudanças com migração gradual)

Contexto no relatório:
- “Sessão em `localStorage`” (P1) e risco alto por XSS.

Evidência no código:
- `auth` grava access/refresh tokens no `localStorage` ([api.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/frontend/auth/src/lib/api.ts#L161-L167)).

### Passo a passo (migração com menor ruptura)
1. Backend: adicionar modo “cookie session” mantendo compatibilidade temporária:
   - Refresh token em cookie `HttpOnly` + `Secure` + `SameSite`.
   - Access token pode continuar no header/JS (idealmente em memória) com expiração curta.
2. Frontends (auth/user/admin):
   - Parar de persistir `refreshToken` no `localStorage`.
   - Ajustar fluxo de refresh para usar cookie (sem ler token via JS).
3. Remover gradualmente `auth_token` do `localStorage` quando o fluxo estiver estável (passo final).

### Critério de aceite
- Refresh token não fica acessível ao JavaScript; sessão resiste melhor a XSS.

---

## 8) P1 — WebSocket: Restringir CORS e Endurecer Autenticação

Contexto no relatório:
- “WebSocket com `origin: '*'`” (P1).

Evidência no código:
- Gateway events permite qualquer origem ([events.gateway.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/domain/events/gateways/events.gateway.ts#L28-L34)).

### Passo a passo (mudança mínima)
1. Substituir `origin: '*'` por allowlist vinda de env (ex.: `WEBSOCKET_ALLOWED_ORIGINS`).
2. Remover suporte a token via querystring (evita vazamento por logs/URLs):
   - Aceitar apenas `handshake.auth.token` ou `Authorization: Bearer`.
3. Registrar tentativas inválidas sem vazar detalhes.

### Critério de aceite
- Apenas origens confiáveis conectam; token não é aceito via querystring.

---

## 9) P1 — Normalizar Variáveis de Observabilidade (MONGODB_URL vs MONGO_URI)

Contexto no relatório:
- “`MONGO_URI` vs `MONGODB_URL`” (P1) com efeito de logs silenciosamente desligados.

Evidência no código:
- Config lê `process.env.MONGODB_URL` ([database.config.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/config/database.config.ts#L12-L19)).

### Passo a passo (mudança mínima)
1. Definir nome oficial: manter `MONGODB_URL` como principal.
2. Adicionar compatibilidade no código:
   - `mongodb.url = MONGODB_URL ?? MONGO_URI` (apenas fallback).
3. Atualizar `.env.example` para refletir o nome oficial e remover ambiguidade.

### Critério de aceite
- Logs persistem quando qualquer uma das variáveis estiver configurada, com preferência clara e documentada.

---

## 10) P1 — Dependências: Remediar Vulnerabilidades (sem mexer em CI/CD)

Contexto no relatório:
- “Vulnerabilidades de dependências” (P1).

### Passo a passo (mudança mínima)
1. Rodar auditoria local por módulo (backend, auth, user, admin) e registrar:
   - quais são runtime vs dev-only,
   - quais são exploráveis (prioridade).
2. Atualizar dependências vulneráveis com menor impacto:
   - Preferir bump de patch/minor compatível.
   - Evitar upgrades grandes sem cobertura.
3. Validar com build e testes locais.

### Critério de aceite
- Sem vulnerabilidades críticas/altas exploráveis no runtime (ou com mitigação justificada e documentada).

---

## 11) P2 — Jobs em Memória (conter risco sem alterar infraestrutura agora)

Contexto no relatório:
- “Jobs e agendamentos em memória” (P1).

Observação de escopo:
- A correção ideal exige infra (fila/scheduler/worker dedicado). Como Docker/K8s/CI/CD/Infra não serão alterados por enquanto, este item terá mitigação de curto prazo no código, e correção definitiva ficará “postergada”.

### Passo a passo (mitigação mínima)
1. Identificar todos os `setInterval`/`setTimeout`/schedulers no backend e mapear efeito colateral.
2. Implementar “single-runner” por lock no banco (Postgres) para evitar duplicidade em múltiplas instâncias:
   - advisory lock por job, antes de executar.
3. Tornar jobs idempotentes e registrar execução (tabela simples de runs).

### Critério de aceite
- Em ambiente com múltiplas instâncias, jobs não executam duplicados (mitigação), e falhas ficam observáveis.

---

## 12) P2 — Performance de Frontend (sem reescrever arquitetura)

Contexto no relatório:
- “Bundle frontend excessivo” e “Sourcemap em produção no admin”.

### Passo a passo (mudança mínima)
1. Desativar sourcemap público em produção no admin (mantendo opção para ambiente interno).
2. Aplicar code splitting nos pontos óbvios:
   - rotas/pages pesadas via lazy loading,
   - bibliotecas grandes carregadas sob demanda.
3. Validar tamanho do bundle após mudanças.

### Critério de aceite
- Redução mensurável do bundle e ausência de sourcemaps públicos em produção.

---

## 13) P2 — Documentação Obrigatória (sem criar novos arquivos além do necessário)

Contexto no checklist:
- README, arquitetura, deploy, envs, como rodar/buildar/testar/rollback, Swagger/OpenAPI.

Observação de escopo:
- O foco aqui é atualizar documentação já existente (evitar proliferação de novos documentos), priorizando informação operacional real.

### Passo a passo (mudança mínima)
1. Atualizar READMEs existentes (raiz, backend, frontends) com:
   - variáveis de ambiente (nomes oficiais, obrigatórias vs opcionais),
   - como rodar local, build e testes,
   - link para Swagger (`/api/docs`).
2. Consolidar “fluxo principal de negócio” e integrações externas em um único local (README raiz ou runbook).

### Critério de aceite
- Documentação obrigatória do checklist está coberta de forma executável (comandos e exemplos), sem duplicidade.

---

## 14) Itens do Relatório Fora do Escopo Imediato (não executar agora)

Estes pontos aparecem no relatório e/ou checklist, mas exigem mudanças explícitas em CI/CD, Docker, Kubernetes ou Infra, e portanto ficam planejados para etapa futura:
- Implementar/ajustar pipeline CI/CD (gates, scans, artifact management, rollback automatizado).
- Hardening de imagens/containers e manifests (usuário não-root, limits, probes, policies).
- IaC (Terraform/CloudFormation/CDK) e versionamento de task definitions.
- DR/Backup/Restore automatizado e exercícios periódicos com metas RPO/RTO.

Para não “perder” o controle, manter estes itens registrados como backlog operacional com owners e critérios de aceite, mas sem alterações neste ciclo.

---

## Apêndice A — Mapeamento Checklist → Correções

- Deploy readiness (healthcheck): manter `/health` do backend ([app.controller.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/app.controller.ts#L8-L11)) e garantir estabilidade.
- Logs e observabilidade: passos 2, 3 e 9.
- Segurança (OWASP): passos 1, 2, 4, 5, 6, 7 e 8.
- Backend APIs: passo 1 (RBAC), passo 4 (erros), passo 5/6 (auth).
- Frontend: passo 7 e 12.
- Banco: passo 11 (locks) e passo 5/6 (novas tabelas para sessão/token), além de migrations existentes.

