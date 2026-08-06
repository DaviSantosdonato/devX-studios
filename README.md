# DevX Studio — Desenvolvimento Full-Stack com IA no Navegador

DevX Studio é um agente de desenvolvimento full-stack alimentado por IA que permite criar, editar e executar aplicações web completas diretamente no navegador — sem configuração local. Produto da **X Technologies**.

## ✨ Principais Recursos

- **Ambiente Full-Stack no Navegador**: Integra modelos de IA de ponta com um ambiente de desenvolvimento in-browser via **WebContainer API** (StackBlitz). Permite:
  - Instalar e executar ferramentas npm (Vite, Next.js, Astro, etc.)
  - Rodar servidores Node.js
  - Interagir com APIs de terceiros
  - Deploy para produção a partir do chat
  - Compartilhar trabalho via URL

- **IA com Controle Total do Ambiente**: Diferente de ambientes tradicionais onde a IA apenas auxilia na geração de código, o DevX Studio dá aos modelos de IA **controle completo** sobre filesystem, servidor Node, gerenciador de pacotes, terminal e console do navegador. Isso permite que a IA gerencie todo o ciclo de vida da aplicação — da criação ao deploy.

- **Editor Integrado**: CodeMirror 6 com suporte a múltiplas linguagens, terminal xterm.js, preview em tempo real e gerenciamento de arquivos visual.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, Remix v2, UnoCSS, CodeMirror 6, xterm.js, Framer Motion
- **Estado**: Nanostores
- **IA**: Vercel AI SDK v3 (Anthropic Claude 3.5 Sonnet por padrão)
- **Runtime**: WebContainer API (@webcontainer/api) — StackBlitz
- **Deploy**: Cloudflare Pages / Workers
- **Package Manager**: pnpm 9.4.0

## 🚀 Instalação Local

### Pré-requisitos
- Node.js >= 18.18.0
- pnpm 9.4.0

### Passos
```bash
# Clone o repositório
git clone <repo-url>
cd devx-studio

# Instale dependências
pnpm install

# Configure variáveis de ambiente
cp .env.example .env.local
# Edite .env.local e adicione sua ANTHROPIC_API_KEY
```

### Variáveis de Ambiente
| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `ANTHROPIC_API_KEY` | Sim | Chave da API Anthropic (Claude) |
| `VITE_LOG_LEVEL` | Não | Nível de log (debug, info, warn, error) |

## 💻 Desenvolvimento

```bash
# Inicia servidor de desenvolvimento
pnpm run dev

# Executa typecheck
pnpm run typecheck

# Executa testes
pnpm run test

# Lint
pnpm run lint
```

## 📦 Build de Produção

```bash
# Build otimizado
pnpm run build

# Preview local do build
pnpm run preview

# Deploy para Cloudflare Pages
pnpm run deploy
```

## 📁 Estrutura do Projeto

```
devx-studio/
├── app/
│   ├── components/          # Componentes React (chat, workbench, editor, UI)
│   ├── lib/
│   │   ├── .server/llm/     # Integração com IA (server-side)
│   │   ├── runtime/         # Parser de artefatos, executor de ações
│   │   ├── stores/          # Estado global (Nanostores)
│   │   ├── webcontainer/    # Boot e integração WebContainer
│   │   └── persistence/     # IndexedDB para histórico
│   ├── routes/              # Rotas Remix (_index, api.chat, api.enhancer)
│   ├── styles/              # SCSS + tokens CSS (--devx-elements-*)
│   └── types/               # Tipos TypeScript
├── icons/                   # SVGs (logo, chat, stars)
├── public/                  # Assets estáticos
├── scripts/                 # Scripts utilitários (codemod)
├── uno.config.ts            # Config UnoCSS (namespaces bolt: + devx:)
├── vite.config.ts
├── wrangler.toml            # Config Cloudflare
└── package.json
```

## ⚠️ Status Atual & Limitações Conhecidas

- **Beta**: O DevX Studio está em desenvolvimento ativo.
- **Modelo IA Padrão**: Apenas Anthropic Claude 3.5 Sonnet suportado nativamente.
- **WebContainer**: Usa versão interna (`1.3.0-internal.10`). Limitações:
  - Sem `pip` (Python limitado à stdlib)
  - Sem compiladores C/C++ (`g++`, `clang`)
  - Sem `git` nativo
  - Binários nativos não executáveis
- **Deploy**: Requer conta Cloudflare configurada.
- **Histórico**: Armazenado no IndexedDB do navegador (não sincroniza entre dispositivos).
- **Mobile**: Funcionalidade limitada em telas pequenas.

## 🤝 Contribuição

Consulte [CONTRIBUTING.md](./CONTRIBUTING.md) para:
- Fluxo de branches e commits
- Testes obrigatórios antes de PR
- Padrões de código e lint
- Relato de bugs e propostas de features
- Segurança

## 📄 Licença

MIT License — veja [LICENSE](./LICENSE) para detalhes.

## 🙏 Acknowledgements

A **DevX Studio** foi inicialmente construída a partir do código open source do **Bolt.new**, desenvolvido pela **StackBlitz**. Partes derivadas permanecem sujeitas aos avisos e à licença MIT presentes neste repositório.

A DevX Studio utiliza a **WebContainer API** da StackBlitz. O uso comercial em produção pode exigir uma licença separada fornecida pela StackBlitz. Verifique os termos aplicáveis antes de um lançamento comercial.

Este projeto não tem parceria, patrocínio, aprovação ou vínculo oficial com a StackBlitz.

## 🔗 Links Úteis

- [WebContainer API Docs](https://webcontainers.io/api)
- [Remix Docs](https://remix.run/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Anthropic API](https://docs.anthropic.com/)