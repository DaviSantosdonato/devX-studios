# Contribuindo para a DevX Studio

Obrigado por contribuir com a DevX Studio! Este documento descreve o fluxo de trabalho, padrões e requisitos para contribuições.

## 📋 Sumário

- [Criação de Branches](#criação-de-branches)
- [Padrão de Commits](#padrão-de-commits)
- [Instalação e Configuração](#instalação-e-configuração)
- [Testes Obrigatórios](#testes-obrigatórios)
- [Pull Requests](#pull-requests)
- [Relato de Bugs](#relato-de-bugs)
- [Propostas de Funcionalidades](#propostas-de-funcionalidades)
- [Segurança](#segurança)
- [Preservação do Protocolo Interno](#preservação-do-protocolo-interno)
- [Preservação das Licenças](#preservação-das-licenças)

---

## Criação de Branches

Use os prefixos abaixo para nomear branches:

| Prefixo | Uso |
|---------|-----|
| `feat/` | Nova funcionalidade |
| `fix/` | Correção de bug |
| `refactor/` | Refatoração sem mudança de comportamento |
| `docs/` | Atualização de documentação |
| `chore/` | Tarefas de manutenção (deps, configs) |
| `test/` | Adição ou ajuste de testes |

Exemplos:
- `feat/multi-provider-support`
- `fix/terminal-resize-bug`
- `docs/update-readme-webcontainer`

---

## Padrão de Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo>): <descrição curta>

[corpo opcional]

[rodapé opcional]
```

Tipos válidos: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`, `build`, `ci`.

Exemplos:
```
feat(chat): adiciona suporte a múltiplos provedores de IA
fix(terminal): corrige redimensionamento ao alternar tema
refactor(stores): desacopla tokens DevX de Bolt
docs(readme): atualiza instruções de deploy
chore(deps): atualiza @webcontainer/api para 1.3.0
```

---

## Instalação e Configuração

```bash
# Clone o fork
git clone https://github.com/<seu-usuario>/devx-studio.git
cd devx-studio

# Instale dependências
pnpm install

# Configure variáveis de ambiente
cp .env.example .env.local
# Adicione ANTHROPIC_API_KEY em .env.local

# Verifique se tudo funciona
pnpm run typecheck
pnpm run test
pnpm run dev
```

---

## Testes Obrigatórios

Antes de abrir qualquer PR, **todos** os seguintes comandos devem passar:

```bash
# TypeScript type checking
pnpm run typecheck

# Lint
pnpm run lint

# Testes unitários
pnpm run test

# Build de produção
pnpm run build
```

**Não abra PRs que falhem em qualquer um desses comandos.**

---

## Pull Requests

1. **Base**: `main` (ou branch de release ativa)
2. **Título**: Seguir Conventional Commits
3. **Descrição**: Explique *o que* e *por que*, não apenas *como*
4. **Testes**: Inclua testes para novas funcionalidades ou correções
5. **Documentação**: Atualize README/CONTRIBUTING se houver mudança visível ao usuário
6. **Breaking changes**: Marque claramente no rodapé do commit (`BREAKING CHANGE:`)

### Checklist de PR

- [ ] `pnpm run typecheck` passa
- [ ] `pnpm run lint` passa
- [ ] `pnpm run test` passa
- [ ] `pnpm run build` passa
- [ ] Testes adicionados/atualizados para mudanças funcionais
- [ ] Documentação atualizada se necessário
- [ ] Sem avisos de console novos
- [ ] Commits limpos (sem `fixup!`, `wip`, etc. — faça squash se necessário)

---

## Relato de Bugs

Use o template de issue (`.github/ISSUE_TEMPLATE/bug_report.yml`) e inclua:

- Versão do Node.js e pnpm
- Sistema operacional
- Passos para reproduzir
- Comportamento esperado vs. observado
- Logs relevantes (console do navegador, terminal)
- Screenshots se aplicável

---

## Propostas de Funcionalidades

Use o template de feature request (`.github/ISSUE_TEMPLATE/feature_request.md`) e descreva:

- Problema que resolve
- Alternativas consideradas
- Impacto no protocolo interno (se houver)
- Complexidade estimada
- Disposição para implementar

---

## Segurança

**Não reporte vulnerabilidades publicamente.** Envie para `security@x.technologies` (ou abra issue privada se configurado).

Inclua:
- Descrição da vulnerabilidade
- Impacto potencial
- Passos para reproduzir
- Mitigação sugerida (se houver)

---

## Preservação do Protocolo Interno

A DevX Studio mantém compatibilidade com o protocolo técnico original do Bolt.new. **Não altere** sem discussão prévia e aprovação:

- Tags de artefato: `<boltArtifact>`, `<boltAction>`, `</boltArtifact>`, `</boltAction>`
- Tipos: `BoltArtifactData`, `BoltAction`, `BoltActionData`
- Parser: `app/lib/runtime/message-parser.ts`
- Prompts técnicos e estrutura de artefatos
- WebContainer API integration
- Tokens CSS `--bolt-elements-*` e namespace `bolt:`
- Nomes internos que fazem parte do protocolo de streaming

Mudanças nesses itens quebram a compatibilidade com artefatos gerados e devem passar por RFC.

---

## Preservação das Licenças

- **LICENSE** (MIT) **não deve ser alterado ou removido**.
- Avisos de copyright do projeto original (StackBlitz/Bolt.new) **devem permanecer**.
- Não apresente a X Technologies como autora exclusiva de código derivado.
- Não remova atribuições exigidas pela licença MIT.
- Não renomeie a licença para uma licença proprietária.
- Se adicionar copyright da X Technologies, faça separadamente sem apagar avisos anteriores.
- Dependências e suas licenças não devem ser modificadas.

---

## WebContainers & StackBlitz — Referências Necessárias

| Referência | Classificação | Ação |
|------------|---------------|------|
| `WebContainer API` | Dependência técnica | **Preservar** — nome técnico |
| `@webcontainer/api` | Dependência npm | **Preservar** — nome do pacote |
| StackBlitz (WebContainers) | Atribuição legal / dependência | **Preservar** — crédito devido |
| Licença MIT original | Atribuição legal | **Preservar** — obrigatório |
| `bolt.new` (URL original) | Documentação histórica | **Preservar** em Acknowledgements |
| Código derivado do Bolt.new | Atribuição legal | **Preservar** — avisos de copyright |

Não remova ou reescreva essas referências. Elas são necessárias para conformidade legal e técnica.

---

## Dúvidas?

Abra uma issue com label `question` ou inicie uma discussão no fórum do repositório.