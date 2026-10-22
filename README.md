# Meu Mercadinho — Sistema de Gestão

Sistema de gestão para mercadinhos de pequeno porte: PDV, controle de produtos e estoque, caixa, entrada de mercadorias, dashboard, relatórios, auditoria, importação/exportação e backup.

**Princípio do projeto:** simples para quem usa, organizado para quem desenvolve. Uma pessoa consegue abrir o sistema, abrir o caixa, passar os produtos no leitor de código de barras, receber o pagamento e finalizar a venda em poucos segundos — o sistema cuida automaticamente do estoque, caixa, histórico e relatórios.

## Índice

- [Descrição](#descrição)
- [Tecnologias](#tecnologias)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Banco de dados](#banco-de-dados)
- [Migrations](#migrations)
- [Seed](#seed)
- [Execução](#execução)
- [Testes](#testes)
- [Segurança](#segurança)
- [Backup e restauração](#backup-e-restauração)
- [Deploy](#deploy)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Módulos e fases de desenvolvimento](#módulos-e-fases-de-desenvolvimento)

## Descrição

O sistema centraliza toda a operação de um mercadinho pequeno em um único lugar:

- **PDV** — leitor de código de barras, atalhos de teclado, carrinho, desconto, pagamento dividido, troco, autorização de venda sem estoque.
- **Produtos e categorias** — cadastro completo, SKU automático, sugestão de preço a partir da margem, histórico de preços.
- **Cadastro rápido pelo celular** (`/produtos/cadastro-rapido`) — lê o código de barras pela câmera, pré-preenche nome/marca pela base pública Open Food Facts (só o código sai do sistema) e volta para a câmera após salvar. Produto já cadastrado: corrige preços e soma a contagem ao estoque. A câmera exige HTTPS.
- **Estoque** — movimentações, ajuste manual com motivo, inventário, alertas de validade.
- **Entrada de mercadorias** — múltiplas linhas, atualização automática de custo e estoque.
- **Caixa** — abertura/fechamento, sangria/suprimento, cálculo de dinheiro esperado × contado.
- **Vendas** — cancelamento e devolução (parcial ou total), sempre preservadas no histórico.
- **Dashboard e relatórios** — faturamento, lucro estimado, produtos mais vendidos/lucrativos, por período.
- **Auditoria** — todas as ações relevantes registradas com usuário, data e detalhes.
- **Importação/exportação** — cadastro de produtos em massa via XLSX/CSV com prévia e validação.
- **Backup** — automático (semanal, agendável) e manual, com histórico.

Dois administradores com permissão completa (sem sistema de papéis granular nesta versão).

## Tecnologias

**Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Zustand, React Router, Recharts.

**Backend:** Node.js, Express, TypeScript, Zod (validação), Prisma ORM, bcrypt, JWT (cookie httpOnly), Helmet, express-rate-limit, ExcelJS, Multer, node-cron.

**Banco de dados:** PostgreSQL.

**Infraestrutura:** Docker Compose (desenvolvimento), npm workspaces (monorepo).

## Instalação

Pré-requisitos: Node.js 20+, Docker (ou um PostgreSQL 16 já rodando), `pg_dump`/`pg_restore` no PATH (para a funcionalidade de backup).

```bash
git clone <repositório>
cd mercadinho-sistema
npm install
```

## Configuração

Copie o arquivo de exemplo e ajuste conforme necessário:

```bash
cp apps/api/.env.example apps/api/.env
```

| Variável | Descrição | Padrão |
|---|---|---|
| `DATABASE_URL` | String de conexão do PostgreSQL | — |
| `JWT_SECRET` | Segredo para assinar os tokens de sessão (troque em produção!) | — |
| `JWT_EXPIRES_IN` | Duração da sessão | `8h` |
| `PORT` | Porta da API | `3333` |
| `NODE_ENV` | `development` \| `production` \| `test` | `development` |
| `LOGIN_MAX_ATTEMPTS` | Tentativas de login antes do bloqueio temporário | `5` |
| `LOGIN_WINDOW_MINUTES` | Janela de tempo do bloqueio de login | `15` |
| `SESSION_TIMEOUT_MINUTES` | Inatividade até bloquear a tela | `15` |
| `WEB_ORIGIN` | Origem do frontend, para CORS | `http://localhost:5173` |
| `BACKUP_STORAGE_*` | Reservado para um provedor de nuvem (ver seção de Backup) | vazio |

## Banco de dados

Suba o PostgreSQL local via Docker:

```bash
docker compose up -d
```

Ou aponte `DATABASE_URL` para um Postgres já existente (local ou na nuvem).

## Migrations

**Passo obrigatório antes de qualquer outro comando** — gera o client do Prisma a partir do `schema.prisma`:

```bash
npm run --workspace=apps/api prisma:generate
```

Depois, crie as tabelas:

```bash
npm run db:migrate -- --name init
```

Em produção, use `prisma migrate deploy` em vez de `migrate dev` (não gera novos arquivos de migration, só aplica os existentes):

```bash
npm run --workspace=apps/api prisma:deploy
```

## Seed

Popula os dois administradores iniciais e as configurações padrão da loja:

```bash
npm run db:seed
```

Usuários criados: `admin1` e `admin2`, senha `admin123` — **troque em produção** (Configurações → um administrador pode redefinir a senha do outro).

## Execução

```bash
npm run dev:api    # API em http://localhost:3333
npm run dev:web    # Frontend em http://localhost:5173
```

Acesse `http://localhost:5173` e faça login.

Para produção:

```bash
npm run --workspace=apps/api build && npm run --workspace=apps/api start
npm run --workspace=apps/web build   # gera apps/web/dist, sirva com Nginx/Caddy/etc.
```

## Testes

```bash
cd apps/api
npx vitest run
```

**143 testes** cobrindo as regras de negócio críticas: autenticação e bloqueio de sessão, unicidade de código de barras/SKU, estoque (venda, cancelamento, devolução, ajuste, inventário), caixa (sessão única, sangria/suprimento, fechamento), PDV (preço/custo congelados, desconto limitado, pagamento dividido, troco, autorização de venda sem estoque), relatórios e dashboard (cálculo de lucro estimado, período), importação (validação e duplicidade), backup, e segurança (cabeçalhos HTTP, tratamento de erros sem vazamento de detalhes internos, ausência de rotas de exclusão física).

O frontend é validado via checagem de tipos e build de produção:

```bash
cd apps/web
npx tsc -b
npm run build
```

## Segurança

- Senhas com hash `bcrypt`; sessão via JWT em cookie **httpOnly** (não acessível por JavaScript, mitigando XSS).
- Rate limiting em duas camadas: login (5 tentativas / 15 min) e geral da API (600 req / 15 min por IP).
- Validação de entrada com Zod em toda rota que recebe dados do cliente.
- Cabeçalhos de segurança HTTP via **Helmet** (`X-Frame-Options`, `X-Content-Type-Options`, remoção de `X-Powered-By`, etc.).
- Queries parametrizadas via Prisma (proteção contra SQL injection).
- Erros nunca vazam stack trace nem detalhes internos ao cliente — testado explicitamente.
- Nenhuma entidade com histórico (produto, categoria, venda) possui rota de exclusão física — só inativação/cancelamento/devolução — testado explicitamente como regressão.
- Se o servidor rodar atrás de um proxy reverso em produção, defina `NODE_ENV=production` para o Express confiar corretamente no cabeçalho `X-Forwarded-For` (necessário para o rate limiting funcionar por IP real, não pelo IP do proxy).

## Backup e restauração

**Backup** (automático semanal + manual): configurável em Configurações → Backup automático (dia da semana e horário). Requer `pg_dump` instalado e no `PATH` do servidor. Os arquivos são salvos em `apps/api/backups/` por padrão.

> Armazenamento em nuvem: a Fase 1 do projeto definiu que a escolha do provedor (S3, GCS, etc.) é uma decisão de deploy, não simulada durante o desenvolvimento. O ponto de extensão está isolado em `apps/api/src/modules/backup/backupStorage.ts` — troque o corpo de `saveBackupFile` por um upload real quando o provedor for escolhido; a assinatura da função não muda.

**Restauração** é um procedimento manual (não uma tela no sistema), por segurança:

```bash
pg_restore --clean --if-exists -d "postgresql://usuario:senha@host:5432/banco" apps/api/backups/backup-XXXX.dump
```

## Deploy

- **Frontend**: build estático (`npm run --workspace=apps/web build`) servido por Nginx, Caddy, Vercel, Netlify, etc.
- **Backend**: build Node (`npm run --workspace=apps/api build && start`), atrás de um proxy reverso com HTTPS.
- **Banco de dados**: PostgreSQL gerenciado na nuvem (Neon, Supabase, RDS, etc.) — aponte `DATABASE_URL` para ele e rode `prisma migrate deploy`.
- Configure `NODE_ENV=production`, um `JWT_SECRET` longo e aleatório, e `WEB_ORIGIN` apontando para o domínio real do frontend.

## Estrutura do projeto

```
mercadinho-sistema/
├── apps/
│   ├── api/                  # Backend (Express + Prisma)
│   │   ├── prisma/           # schema.prisma, seed.ts, migrations/
│   │   ├── src/
│   │   │   ├── modules/      # um módulo por domínio (auth, products, sales, ...)
│   │   │   ├── middlewares/  # auth, tratamento de erros
│   │   │   ├── shared/       # utilitários (dinheiro, datas, SKU, auditoria)
│   │   │   └── config/       # env, cliente Prisma
│   │   └── tests/            # 143 testes (vitest)
│   └── web/                  # Frontend (React + Vite)
│       └── src/
│           ├── pages/        # uma tela por rota
│           ├── components/   # componentes reutilizáveis, organizados por módulo
│           ├── store/        # estado global (Zustand): auth, caixa
│           └── lib/          # cliente HTTP, tipos, formatação
├── docker-compose.yml         # PostgreSQL local
└── package.json                # workspaces raiz
```

Cada módulo do backend segue o padrão: `*.schema.ts` (validação Zod), `*.service.ts` (regra de negócio, testável isoladamente), `*.controller.ts` (HTTP), `*.routes.ts`.

## Módulos e fases de desenvolvimento

O sistema foi construído em 17 fases incrementais, cada uma com sua própria explicação, testes e correção de bugs antes de avançar para a próxima:

1. Arquitetura e configuração inicial
2. Banco de dados (schema completo) + Prisma + migrations
3. Autenticação + usuários
4. Layout principal + navegação
5. Produtos + categorias
6. Estoque + movimentações
7. Entrada de mercadorias
8. Caixa
9. PDV
10. Descontos + cancelamentos + devoluções
11. Dashboard
12. Relatórios
13. Auditoria
14. Importação/exportação (XLSX/CSV)
15. Backup
16. Responsividade + refinamento visual
17. Testes completos + segurança + correção de bugs

## Limitações conhecidas (fora do escopo desta versão)

Conforme definido desde a Fase 1: cadastro de clientes, produtos por peso, NFC-e/nota fiscal, impressora térmica, integração com maquininha (TEF), contas a pagar/receber, multi-loja, multi-caixa, FEFO, promoções automáticas, funcionamento offline, custo médio, sistema de fornecedores, permissões granulares, recuperação de senha por e-mail.
