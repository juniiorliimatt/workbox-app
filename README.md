# workbox-app

Frontend do [monorepo `workbox`](../README.md) — consome a API em
[`workbox-api`](../workbox-api/README.md) e serviços do ecossistema.

> Desenvolvimento deste submódulo é de responsabilidade do agente **Antigravity** (ver
> [AGENTS.md](../AGENTS.md) na raiz do monorepo).

Também espelhado no [GitHub](https://github.com/juniiorliimatt/workbox-app) — todo push
pro GitLab é replicado automaticamente via git hook. Ver
[README raiz](../README.md#espelho-no-github--git-hooks).

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript 5 |
| Framework | React 18 |
| Build Tool | Vite 5 |
| UI & Componentes | Material UI (MUI v5) + Emotion |
| Ícones | `@mui/icons-material` |
| Formulários & Validação | `react-hook-form` + `yup` (`@hookform/resolvers`) |
| Cliente HTTP | Axios (com interceptors de Bearer token e refresh automático) |
| Roteamento | `react-router-dom` v6 |
| MFA / 2FA TOTP | `qrcode.react` (geração de QR Code compatível com Google Authenticator) |
| Testes Unitários | Vitest + React Testing Library + `@testing-library/user-event` |
| Testes E2E / Visuais | Puppeteer-core + Google Chrome headless |
| Linters & Padrões | ESLint + TypeScript ESLint |

---

## Estrutura do Projeto

```
src/
├── assets/          # Ícones e recursos estáticos
├── components/      # Componentes reutilizáveis globais
│   ├── AppNavbar.tsx     # Barra de navegação persistente com avatar e logout
│   └── UserAvatar.tsx     # Componente de exibição de avatar autenticado
├── contexts/        # Contextos React e State Management
│   ├── AuthContext.tsx    # Provedor de autenticação, tokens, MFA e perfis
│   └── AuthContextValue.ts
├── hooks/           # Custom React Hooks
│   ├── useAuth.ts               # Hook de consumo do AuthContext
│   └── useAuthenticatedAvatar.ts # Hook para carregar imagens autenticadas com Bearer
├── interfaces/      # Contratos e tipagens TypeScript
│   ├── IAuthContext.ts
│   ├── IAuthResponse.ts
│   ├── IMfaEnrollResponse.ts
│   ├── IUser.ts
│   ├── IUserAdminDTO.ts
│   └── ...
├── pages/           # Telas da aplicação
│   ├── Login.tsx          # Login, auto-cadastro e desafio MFA TOTP
│   ├── Dashboard.tsx      # Hub central de módulos (12 cards temáticos)
│   ├── Perfil.tsx         # Edição cadastral, foto de perfil, troca de senha e MFA
│   ├── Admin.tsx          # Hub de acesso aos módulos administrativos
│   ├── AdminUsuarios.tsx  # Gestão completa de usuários (CRUD + fotos + papéis)
│   ├── AdminPapeis.tsx    # Gestão de papéis e permissões
│   ├── AdminAuditoria.tsx # Trilha de auditoria e segurança de logins
│   └── Financas.tsx       # Módulo de Finanças Pessoais (budget)
├── routes/          # Definição e configuração das rotas
│   ├── routes.tsx         # Rotas (catch-all "*" redireciona pra "/")
│   ├── ProtectedRoute.tsx # Guarda de rota autenticada
│   └── PublicRoute.tsx    # Guarda de rota pública (redireciona autenticados)
├── services/        # Configuração de clientes HTTP
│   ├── api.ts             # Instância configurada do Axios
│   └── useAxiosWithAuth.ts # Interceptors de requisição e renovação de token (401 retry)
└── test/            # Suíte de testes automatizados e E2E
    ├── AdminPages.test.tsx
    ├── AuthContext.test.tsx
    ├── Dashboard.test.tsx
    ├── Login.test.tsx
    ├── Perfil.test.tsx
    ├── UserAvatar.test.tsx
    ├── setupTests.ts
    └── browser-e2e.mjs     # Teste ponta a ponta no Google Chrome headless
```

Aliases de import configurados em `vite.config.ts` (`@`, `@components`, `@pages`,
`@services`, `@contexts`, `@hooks`, `@interfaces`, `@routes`, etc. — alguns aliases
declarados lá, como `@i18n`/`@models`/`@themes`, ainda não têm diretório correspondente
em uso).

---

## Módulos e Funcionalidades

### 1. Autenticação & Segurança (`/`)
- **Login por E-mail**: Validação com React Hook Form e Yup, suporte a "Lembrar de mim" via `localStorage`.
- **Auto-cadastro Público**: Criação direta de novas contas atribuindo o papel padrão `USER`.
- **Autenticação em Duas Etapas (MFA / 2FA)**:
  - Detecção automática de contas com MFA ativo via desafio `mfa_token`.
  - Formulário dedicado para validação do código de 6 dígitos gerado por aplicativo autenticador.
- **Renovação de Sessão (Token Refresh)**:
  - Rotação contínua de refresh tokens via `POST /api/v1/auth/refresh` com corpo JSON `{ "refreshToken": "..." }`.
  - Renovação automática transparente via interceptors do Axios em respostas 401.

### 2. Hub de Módulos (`/dashboard`)
- Tela inicial pós-login contendo **12 cards de módulos**:
  1. **Administração** (`/admin`): Exibido com prioridade para usuários com papel `ADMIN`.
  2. **Finanças** (`/financas`): Acesso ao módulo de finanças pessoais (*budget-service*).
  3. Demais 10 módulos com badge *"Em breve"* e estado desabilitado (RH, Vendas, Relatórios, CRM, Estoque, etc.).

### 3. Meu Perfil & Segurança (`/perfil`)
- **Dados Cadastrais**: Visualização e edição de Nome Social e E-mail.
- **Gerenciamento de Foto de Perfil (Avatar)**:
  - Seletor de arquivo de imagem (PNG, JPEG, WEBP até 2MB).
  - Envio multipart para `POST /api/v1/auth/avatar`.
  - Remoção de foto via `DELETE /api/v1/auth/avatar`.
  - Renderização protegida por token através do hook `useAuthenticatedAvatar` e componente `UserAvatar`.
- **Alteração de Senha**: Validação de senha atual e confirmação de nova senha via `PUT /api/v1/auth/password`.
- **Configuração de MFA**:
  - Geração de segredo e **QR Code TOTP** escaneável no Google Authenticator, Microsoft Authenticator e Authy.
  - Exibição de chave alfanumérica manual com botão de cópia.
  - Ativação imediata mediante confirmação do primeiro código TOTP.
  - Opção para desativação segura de MFA com código de confirmação.

### 4. Módulo de Administração (`/admin`)
Exclusivo para contas com permissão de administrador (papel `ADMIN`):
- **Gestão de Usuários** (`/admin/usuarios`):
  - Tabela com foto, nome social, e-mail, status (ativo/inativo) e papéis.
  - Diálogo para criação e edição de usuários, incluindo alteração opcional de senha, papéis e status.
  - Exclusão lógica/confirmação de remoção de usuários.
- **Papéis & Permissões** (`/admin/papeis`):
  - Listagem de papéis cadastrados no sistema.
  - Cadastro de novas autoridades — nome puro, **sem** prefixo `ROLE_` (esse prefixo é
    adicionado só pelo backend na emissão do JWT, nunca no valor armazenado/exibido via
    `/api/v1/role`); ex.: `GESTOR`, `FINANCEIRO`.
- **Auditoria de Logins** (`/admin/auditoria`):
  - Visualização de trilha de acessos: data/hora, e-mail do usuário, endereço IP de origem e status de sucesso ou falha (ex.: `mfa_invalid_code`, `bad_credentials`).
  - Filtro em tempo real por termo de busca.

### 5. Barra de Navegação Global (`AppNavbar`)
- Cabeçalho persistente em todos os módulos autenticados.
- Exibe o Avatar do usuário, nome social e função (Administrador / Meu Perfil).
- Acesso rápido permanente à tela de Perfil e botão de Logout seguro.

---

## Rodando Localmente

### Pré-requisitos
- Node.js 18+ (recomendado Node 20+)
- Google Chrome instalado (para execução dos testes E2E headless)

### Comandos

```bash
# Instalação das dependências
npm install

# Servidor de desenvolvimento (com proxy reverso /api -> http://localhost:8080)
npm run dev       # http://localhost:5173

# Verificação estática de código (ESLint)
npm run lint

# Execução da suíte de testes unitários (Vitest)
npm test

# Execução de testes unitários em modo watch
npm run test:watch

# Execução de testes de ponta a ponta (E2E com Chrome headless)
npm run test:e2e

# Build de produção (saída em dist/)
npm run build

# Preview do build de produção
npm run preview
```

## CI/CD

`.gitlab-ci.yml`: um único job, `sonarcloud-check` (stage `test`), análise estática via
`sonar-scanner` — dispara em merge requests e em pushes diretos à `main` (não `develop`).
Não há job de build/teste automatizado no CI deste repo hoje — `npm test`/`npm run lint`
rodam só localmente.

---

## Variáveis de Ambiente

Arquivos `.env` e `.env.development` (não existe `.env.production` neste repo — build de
produção usa os mesmos defaults do `.env`, servido pelo Nginx do container).

| Variável | Descrição | Padrão |
|---|---|---|
| `VITE_PUBLIC_URL_API` | Única variável efetivamente lida pelo código (`src/services/api.ts`) — base URL da API (`workbox-api`). Em dev, vazio utiliza o proxy do Vite `/api`. | `""` |

As demais chaves em `.env`/`.env.development` (`VITE_PUBLIC_URL_API_ORIGIN`,
`VITE_INITIAL_PATH`, `VITE_PUBLIC_SSO_LOGIN_URL`, `VITE_PUBLIC_SSO_LOGOUT_URL`,
`VITE_PUBLIC_URL_API_PUBLIC`, `VITE_BASE_URL`) não são lidas por nenhum código atual
(confirmado via busca por `import.meta.env` — só `VITE_PUBLIC_URL_API` aparece); redirect
pós-login é hardcoded pra `/dashboard` em `Login.tsx`, não vem de env var. Resíduo de
scaffold — remover ou implementar de fato antes de documentar como comportamento real.

---

## Contas de Teste (QA)

Contas fixas no banco local para uso **exclusivo dos dois agentes de IA (Claude Code e Antigravity)** durante testes manuais/exploratórios (ver [`workbox-api/README.md`](../workbox-api/README.md#contas-de-teste-qa)):

| Papel | E-mail | Senha | Roles | Módulo Principal |
|---|---|---|---|---|
| **Admin QA** | `qa.admin@workbox.local` | `QaAdmin@123` | `ADMIN`, `USER` | Painel de Administração (`/admin`) + Hub |
| **User QA** | `qa.user@workbox.local` | `QaUser@123` | `USER` | Finanças (`/financas`) + Hub |

> Roles acima são o valor puro retornado por `/api/v1/role` e `/api/v1/user/**` (sem
> prefixo `ROLE_`) — só o claim `roles` dentro do JWT (o que `AuthContext` lê) vem
> prefixado (`ROLE_ADMIN`/`ROLE_USER`).

> ⚠️ As contas seed originais (`admin@workbox.local`, `user@workbox.local`) **não têm
> senha estável** — já foram alteradas várias vezes por teste manual real ao longo do
> desenvolvimento. Não depender delas; usar sempre as contas QA acima.

---

## Integração com o Backend

O frontend comunica-se exclusivamente com as APIs através dos contratos OpenAPI publicados:
- Fonte da verdade de autenticação e identidade: [`workbox-api/openapi/openapi.yaml`](../workbox-api/openapi/openapi.yaml).
- Todas as requisições autenticadas enviam o header `Authorization: Bearer <access_token>`.
- Imagens de avatar protegidas são resolvidas através de blobs autenticados via `GET /api/v1/user/{id}/avatar`.
