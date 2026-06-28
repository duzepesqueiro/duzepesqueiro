# Executive Summary

Data do relatório: 2026-06-28

Escopo auditado:
- `Codigo/backend`
- `Codigo/frontend/auth`
- `Codigo/frontend/user`
- `Codigo/frontend/administrator`
- Workflows GitHub Actions, Dockerfiles, Compose, variáveis de ambiente, segurança, observabilidade, testes e prontidão operacional

Evidências (reexecutadas):
- Backend:
  - `npm ci`
  - `npm run build`
  - `npm run lint` (falhou)
  - `npm test -- --runInBand` (falhou)
  - `npm audit --omit=dev` (26 vulnerabilidades: 1 critical, 17 high, 8 moderate)
- Frontend `auth`:
  - `npm ci`
  - `npm run build` (ok)
  - `npm run lint` (falhou)
  - `npm audit --omit=dev` (9 vulnerabilidades: 7 high, 2 moderate)
- Frontend `user`:
  - `npm ci`
  - `npm run build` (ok; chunk principal ~913 kB minificado)
  - `npm run lint` (falhou)
  - `npm audit --omit=dev` (12 vulnerabilidades: 9 high, 3 moderate)
- Frontend `administrator`:
  - `npm ci`
  - `npm run build` (ok; `index` ~1.4 MB e `vendor` ~1.6 MB minificados)
  - `npm audit --omit=dev` (24 vulnerabilidades: 1 critical, 11 high, 10 moderate, 2 low)

Overall deployment readiness score:
41/100

Deployment recommendation:
- NOT READY FOR PRODUCTION

Resumo executivo (mudanças desde o último relatório):
- Correção validada de RBAC do export administrativo: agora `JwtAuthGuard` + `RolesGuard` são aplicados no controller ([export.controller.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/application/export/export.controller.ts#L13-L18)).
- Observabilidade mínima melhorou: agora existe `X-Request-Id` por request ([request-context.middleware.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/application/security/middlewares/request-context.middleware.ts#L8-L19)), o auditor não persiste body bruto ([audit.interceptor.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/shared/common/interceptors/audit.interceptor.ts#L15-L84)) e a resposta de erro em produção não expõe details ([http-exception.filter.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/shared/common/filters/http-exception.filter.ts#L19-L69)).
- Normalização de env para MongoDB aplicada como fallback (`MONGODB_URL || MONGO_URI`) ([database.config.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/config/database.config.ts#L12-L19)).
- Frontend admin deixou de gerar sourcemap em `production/qa` por configuração ([vite.config.mjs](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/frontend/administrator/vite.config.mjs#L7-L25)).
- Workflows de deploy passaram a existir em `.github/workflows` ([deploy-prod.yml](file:///c:/Users/clevi/Desktop/duzepesqueiro/.github/workflows/deploy-prod.yml), [deploy-staging.yml](file:///c:/Users/clevi/Desktop/duzepesqueiro/.github/workflows/deploy-staging.yml)), porém ainda sem gates de qualidade (lint/test/audit/scan antes do deploy).

O que ainda bloqueia produção:
- Dependências com vulnerabilidade crítica explorável em runtime no backend (ex.: `liquidjs` reportado por `npm audit --omit=dev`).
- Gate de qualidade ainda quebrado: lint do backend falha por dependência ausente (`typescript-eslint`), e testes do backend não executam por falta de transformação TypeScript/Jest.
- Frontends continuam persistindo tokens em `localStorage` (risco alto de sequestro de sessão em caso de XSS).
- CORS do WebSocket permanece permissivo (`origin: '*'`) ([events.gateway.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/domain/events/gateways/events.gateway.ts#L28-L34)).
- Drift/fragilidade em env: `ConfigModule` aponta para `.env.qa` (não versionado) em não-produção ([app.module.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/app.module.ts#L26-L33)).

========================

# Critical Findings

1) Vulnerabilidades críticas em dependências (runtime)
- O que foi encontrado: `npm audit --omit=dev` do backend reporta vulnerabilidade `critical` em `liquidjs` (inclui advisory de RCE), além de múltiplas `high` (ex.: axios, nodemailer, multer, ws).
- Impacto: exposição direta a exploração remota (inclui execução de código e DoS), dependendo de superfície atingível (email templates/render, parsing, etc).
- Evidência: execução local `npm audit --omit=dev` em `Codigo/backend` (relatório do npm); dependências declaradas em [package.json](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/package.json).
- Prioridade: P0 (bloqueante)

2) Gate de qualidade ainda não operacional (backend e frontends)
- O que foi encontrado:
  - Backend: `npm run lint` falha com `Cannot find package 'typescript-eslint'` porque o ESLint config importa `typescript-eslint` ([eslint.config.mjs](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/eslint.config.mjs#L1-L34)) mas a dependência não está no [package.json](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/package.json#L48-L76).
  - Backend: `npm test` falha por Jest não transformar TypeScript (erros de parser em `.spec.ts`).
  - Frontends `auth` e `user`: `npm run lint` falha com múltiplos erros (hooks, any, regras).
- Impacto: ausência de garantia mínima contra regressão; risco elevado de liberar build quebrado ou inseguro.
- Evidência: comandos reexecutados (ver seção de evidências acima) e estrutura de scripts em [backend/package.json](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/package.json#L6-L13), [auth/package.json](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/frontend/auth/package.json#L6-L13), [user/package.json](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/frontend/user/package.json#L6-L12).
- Prioridade: P0 (bloqueante)

========================

# High Severity Findings

1) Sessão/token persistido em `localStorage` (3 frontends)
- O que foi encontrado: múltiplos usos de `localStorage` para autenticação e estado de sessão no `auth`, `user` e `administrator`.
- Impacto: qualquer XSS (incluindo em dependências de UI, conteúdo de terceiros, ou falhas em sanitização) permite exfiltrar tokens e sequestrar contas.
- Evidência: ocorrências em [auth/api.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/frontend/auth/src/lib/api.ts), [user/api.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/frontend/user/src/lib/api.ts), [administrator/api.js](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/frontend/administrator/src/utils/api.js).
- Prioridade: P1

2) WebSocket com CORS permissivo (`origin: '*'`)
- O que foi encontrado: gateway em `/events` permite qualquer origem.
- Impacto: aumenta superfície de ataque cross-origin e dificulta endurecimento (origens confiáveis por ambiente).
- Evidência: [events.gateway.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/domain/events/gateways/events.gateway.ts#L28-L34).
- Prioridade: P1

3) Mapeamentos do export ainda inconsistentes com o schema Prisma (integridade/qualidade dos dados)
- O que foi encontrado: `ExportService` usa campos que não existem no schema (ex.: `Product.price`), enquanto o schema define `salePrice/costPrice/stockQuantity` etc.
- Impacto: exportações administrativas podem sair erradas, incompletas ou gerar falsa confiança em auditoria/relatórios.
- Evidência: uso de `p.price` em [export.service.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/application/export/export.service.ts#L291-L300) vs schema `Product.salePrice` em [schema.prisma](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/prisma/schema.prisma#L587-L626).
- Prioridade: P1

4) CI/CD existe, mas ainda sem gates de segurança/qualidade antes do deploy
- O que foi encontrado: workflows de staging e production fazem build/push e deploy no ECS, porém não executam lint/test/audit/scan antes do deploy.
- Impacto: pipeline pode promover imagens vulneráveis e com regressões para produção.
- Evidência: [deploy-prod.yml](file:///c:/Users/clevi/Desktop/duzepesqueiro/.github/workflows/deploy-prod.yml#L17-L139), [deploy-staging.yml](file:///c:/Users/clevi/Desktop/duzepesqueiro/.github/workflows/deploy-staging.yml#L17-L128).
- Prioridade: P1

5) Docker hardening insuficiente (root/no healthcheck)
- O que foi encontrado:
  - Backend e frontend runtime não definem usuário não-root.
  - Não há `HEALTHCHECK` nas imagens.
- Impacto: aumenta blast radius em caso de exploração e reduz previsibilidade de orquestração/auto-healing.
- Evidência: [backend/Dockerfile](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/docker/Dockerfile#L17-L42), [frontend/Dockerfile.prod](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/frontend/docker/Dockerfile.prod#L61-L70).
- Prioridade: P1

========================

# Medium Severity Findings

1) Gestão de variáveis de ambiente com drift e acoplamento a arquivos não versionados
- O que foi encontrado: em não-produção, `ConfigModule` tenta carregar `.env.qa`, que não existe no repositório.
- Impacto: comportamento divergente entre ambientes; risco de falhas em runtime por env faltante; reprodutibilidade fraca.
- Evidência: [app.module.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/app.module.ts#L26-L33) + inexistência de `.env.qa` em `Codigo/backend`.
- Prioridade: P2

2) Ausência de validação central de configuração (schema)
- O que foi encontrado: não há validação declarativa de envs obrigatórias no bootstrap; a app sobe com defaults/fallbacks.
- Impacto: falhas aparecem tarde (em runtime), inclusive em integrações de pagamento/email/auth.
- Evidência: [app.module.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/app.module.ts#L26-L33), [app.config.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/config/app.config.ts#L1-L12), [jwt.config.ts](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/backend/src/config/jwt.config.ts).
- Prioridade: P2

3) Bundles grandes (performance e custo)
- O que foi encontrado:
  - `user`: chunk principal ~913 kB minificado, com warning de chunks > 500 kB no build.
  - `administrator`: chunks `index` ~1.4 MB e `vendor` ~1.6 MB minificados.
- Impacto: piora de TTI, consumo de banda e UX em mobile; pode elevar custo de CDN.
- Evidência: execução de `npm run build` e configuração de bundling em [vite.config.mjs](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/frontend/administrator/vite.config.mjs#L11-L25).
- Prioridade: P2

4) Readiness de DR/backup sem evidências versionadas
- O que foi encontrado: não há artefatos de backup automatizado, restore testado, metas RPO/RTO, ou runbook versionado de restore.
- Impacto: risco operacional alto em incidente real (perda de dados/tempo de indisponibilidade).
- Evidência: ausência de IaC/runbooks de DR em `Codigo/` (somente runbook de deploy ECS fora do escopo de DR completo).
- Prioridade: P2

========================

# Low Severity Findings

1) Artefatos de build versionados no frontend admin (`dist/`)
- O que foi encontrado: diretório `Codigo/frontend/administrator/dist/` está presente no repositório.
- Impacto: aumenta ruído, risco de desatualização e conflitos; pode vazar builds antigos se alguém publicar artefatos por engano.
- Evidência: [administrator/dist](file:///c:/Users/clevi/Desktop/duzepesqueiro/Codigo/frontend/administrator/dist).
- Prioridade: P3

2) Warnings de baseline/browserslist desatualizados nos builds
- O que foi encontrado: builds informam `caniuse-lite` desatualizado e baseline mapping antigo.
- Impacto: baixo; mas sinaliza higiene de dependências e compatibilidade.
- Evidência: logs de build dos frontends (Vite/Browserslist).
- Prioridade: P3

========================

# Production Readiness Checklist

## Arquitetura
Status:
- WARNING
Evidence:
- Separação em camadas no backend (`application/domain/infrastructure`) e apps frontend separados.
- Jobs em memória ainda aparecem em módulos de domínio (p.ex. jobs em hosting).
Impact:
- Risco em escala horizontal e em restart.
Recommendation:
- Externalizar scheduler/worker ou implementar lock distribuído (mínimo) e idempotência.

## Backend
Status:
- FAIL
Evidence:
- Build passa (`npm run build`), porém lint e testes falham.
- Vulnerabilidades críticas/altas em runtime via `npm audit --omit=dev`.
Impact:
- Alto risco de regressão e exploração.
Recommendation:
- Corrigir lint/test e remediar vulnerabilidades P0 antes de qualquer release.

## Frontend
Status:
- FAIL
Evidence:
- Tokens em `localStorage`.
- Lint falha em `auth` e `user`; `administrator` não possui script de lint.
- Bundles grandes em `user` e `administrator`.
Impact:
- Sequestro de sessão em XSS + regressões e performance ruim.
Recommendation:
- Migrar refresh token para cookie HttpOnly; ativar lint (admin) e corrigir erros.

## Banco de Dados
Status:
- WARNING
Evidence:
- Prisma schema e migrations presentes.
- Sem evidências versionadas de backup/restore/rollback de migration.
Impact:
- Operação de recuperação frágil.
Recommendation:
- Versionar procedimentos e exercitar restore periodicamente.

## Segurança
Status:
- FAIL
Evidence:
- Dependências com vulnerabilidade critical/high.
- Tokens em `localStorage`.
- WebSocket com `origin: '*'`.
Impact:
- Comprometimento de sessão, ampliação de superfície e exploração via supply chain.
Recommendation:
- Remediar CVEs exploráveis em runtime; endurecer sessão e WebSocket.

## Docker
Status:
- WARNING
Evidence:
- Multi-stage builds presentes.
- Falta `USER` não-root e `HEALTHCHECK`.
Impact:
- Hardening insuficiente e menor previsibilidade em orquestração.
Recommendation:
- Executar como usuário sem privilégio, definir healthcheck e reduzir pacotes no runtime.

## Kubernetes
Status:
- WARNING
Evidence:
- Não foram encontrados manifests/Helm.
Impact:
- Não aplicável no momento; sem baseline se migração ocorrer.
Recommendation:
- Se houver plano de K8s, versionar manifests com probes/limits/RBAC/NetworkPolicy.

## Infraestrutura
Status:
- WARNING
Evidence:
- Há workflows de deploy para ECS, porém não há IaC versionada no repo.
Impact:
- Revisão/auditoria de mudanças infra fica difícil.
Recommendation:
- Versionar infraestrutura por ambiente (Terraform/CloudFormation/CDK) e task defs.

## Variáveis de Ambiente
Status:
- FAIL
Evidence:
- `envFilePath` aponta para `.env.qa` e `.env.production`, mas apenas `.env.example` está presente.
- Não há validação central de envs obrigatórias.
Impact:
- Drift e falhas tardias.
Recommendation:
- Remover dependência de arquivos não versionados e validar envs na inicialização.

## Dependências
Status:
- FAIL
Evidence:
- `npm audit --omit=dev` aponta severidades altas e críticas.
Impact:
- CVEs potencialmente exploráveis.
Recommendation:
- Atualizar dependências críticas e adicionar rotina de scans no pipeline.

## Performance
Status:
- WARNING
Evidence:
- Bundles grandes (user/admin).
Impact:
- UX ruim e custo de entrega.
Recommendation:
- Code splitting e análise de bundle; estabelecer budgets.

## Observabilidade
Status:
- WARNING
Evidence:
- RequestId implementado e propagado.
- Não há tracing distribuído/SLIs/SLOs/dashboards/alertas versionados.
Impact:
- Troubleshooting ainda limitado em incidentes complexos.
Recommendation:
- Evoluir para OpenTelemetry + dashboards/alertas por SLI.

## Testes
Status:
- FAIL
Evidence:
- Jest do backend não executa TS.
- Frontends sem suíte de testes.
Impact:
- Regressão sem barreira.
Recommendation:
- Configurar Jest/ts-jest e adicionar testes críticos (RBAC/export, auth, pagamentos).

## CI/CD
Status:
- WARNING
Evidence:
- Workflows de deploy existem, mas sem gates de qualidade/segurança.
Impact:
- Deploy pode promover vulnerabilidades/regressões.
Recommendation:
- Adicionar jobs de lint/test/audit/scan e política de promoção (staging → prod).

## Recuperação de Desastre
Status:
- FAIL
Evidence:
- Sem evidências versionadas de backup/restore e metas RPO/RTO.
Impact:
- Alta exposição a perda de dados e downtime prolongado.
Recommendation:
- Definir e testar backup/restore; automatizar e auditar.

## Documentação Técnica
Status:
- WARNING
Evidence:
- Existem READMEs, `.env.example` e runbook de deploy; porém documentação operacional ainda não cobre DR, rollback validado e gates do pipeline.
Impact:
- Operação depende de conhecimento tácito.
Recommendation:
- Consolidar runbooks mínimos (deploy, rollback, DR) e políticas de segurança/observabilidade.

========================

# Risk Matrix

| Finding | Category | Severity | Likelihood | Impact | Priority |
|---|---|---|---|---|---|
| Vulnerabilidades críticas em runtime (ex.: liquidjs) | Dependency/Security | Critical | High | High | P0 |
| Lint/test gates quebrados (backend + frontends) | Testing/Quality | Critical | High | High | P0 |
| Sessão em `localStorage` | Frontend/Security | High | High | High | P1 |
| WebSocket `origin: '*'` | Security | High | Medium | High | P1 |
| ExportService inconsistente com schema | Backend/Data Integrity | High | High | Medium | P1 |
| CI/CD sem gates antes do deploy | CI/CD | High | High | High | P1 |
| Containers sem usuário não-root/healthcheck | Docker/Security | High | Medium | Medium | P1 |
| Env drift (envFilePath aponta para arquivos ausentes) | Env/Operations | Medium | High | Medium | P2 |
| Bundles grandes | Performance | Medium | High | Medium | P2 |
| DR sem evidência | Disaster Recovery | Medium | Medium | High | P2 |
| Build artifacts versionados (admin/dist) | Operations | Low | Medium | Low | P3 |

========================

# Remediation Plan

## Phase 1 (Blocking Issues)

1) Remediar vulnerabilidades críticas/altas exploráveis em runtime
- O que corrigir: atualizar/substituir dependências com `critical/high` no backend e frontends.
- Como corrigir: usar `npm audit --omit=dev` como baseline; atualizar lockfiles; validar compatibilidade; repetir build e testes.
- Impacto: reduz risco direto de exploração.
- Prioridade: P0

2) Restaurar gate de qualidade (lint/test)
- O que corrigir:
  - Backend: adicionar `typescript-eslint` (dependência) ou ajustar config; configurar Jest para TS (ts-jest) com `jest.config`/transform.
  - Frontends: corrigir erros de lint e criar script de lint no `administrator`.
- Como corrigir: alinhar `eslint.config.mjs` ao `package.json` e garantir `npm run lint`/`npm test` “verdes” em todos os módulos.
- Impacto: cria barreira mínima contra regressão.
- Prioridade: P0

## Phase 2 (High Priority)

1) Migrar refresh token para cookie HttpOnly e remover dependência de `localStorage`
- O que corrigir: armazenamento de credenciais em JS.
- Como corrigir: refresh token em cookie `HttpOnly` + `Secure` + `SameSite`; access token curto (memória) e rotação.
- Impacto: reduz sequestro de sessão por XSS.
- Prioridade: P1

2) Restringir CORS do WebSocket por allowlist em env
- O que corrigir: `origin: '*'`.
- Como corrigir: permitir apenas origens confiáveis por ambiente (ex.: `WEBSOCKET_ALLOWED_ORIGINS`), com validação e logs.
- Impacto: reduz superfície cross-origin.
- Prioridade: P1

3) Inserir gates no CI/CD antes do deploy
- O que corrigir: workflows de deploy sem lint/test/audit/scan.
- Como corrigir: adicionar jobs para `npm ci`, `lint`, `test`, `build`, `npm audit --omit=dev`, scan de imagem (ex.: Trivy/Grype) e política de promoção.
- Impacto: reduz risco de promover regressões e CVEs.
- Prioridade: P1

4) Docker hardening básico
- O que corrigir: execução como root e ausência de healthcheck.
- Como corrigir: criar usuário não-root, ajustar permissões, adicionar `HEALTHCHECK`, reduzir pacotes no runtime.
- Impacto: menor blast radius e melhor auto-healing.
- Prioridade: P1

## Phase 3 (Improvements)

1) Normalizar estratégia de env e validar schema na inicialização
- O que corrigir: dependência em `.env.qa` inexistente e ausência de validação.
- Como corrigir: usar `envFilePath` opcional por ambiente; validar com schema (Joi/Zod) e falhar fast.
- Impacto: reduz drift e falhas tardias.
- Prioridade: P2

2) Performance/bundle budgets
- O que corrigir: bundles grandes.
- Como corrigir: lazy loading por rota, manualChunks mais granular, remover dependências não usadas, budgets de bundle.
- Impacto: melhora UX e custo.
- Prioridade: P2

3) DR/Backup/Restore
- O que corrigir: ausência de evidências e exercícios.
- Como corrigir: automatizar backup, definir RPO/RTO, testar restore periodicamente e registrar resultados.
- Impacto: reduz risco de indisponibilidade prolongada.
- Prioridade: P2

========================

# Final Verdict

- Can the application be deployed?
- Não para produção no estado atual.

- What risks remain?
- Exploração via dependências críticas/altas, regressões por ausência de gates (lint/test), sequestro de sessão por tokens em `localStorage`, e fragilidade operacional (env drift + DR sem evidência).

- What must be fixed before production?
- Remediar vulnerabilidades `critical/high` exploráveis em runtime.
- Tornar `npm run lint` e `npm test` executáveis e “verdes” (backend e frontends).
- Remover refresh token de `localStorage` (cookie HttpOnly) e endurecer WebSocket CORS.
- Inserir gates de qualidade/segurança no CI/CD antes do deploy.

- What should be improved after deployment?
- Evoluir observabilidade (OTel, dashboards, alertas).
- Reduzir bundles e estabelecer budgets.
- Formalizar DR com restore testado e metas RPO/RTO.
