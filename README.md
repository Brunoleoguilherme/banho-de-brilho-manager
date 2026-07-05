# Banho de Brilho Manager

Sistema interno de gestão da **Banho de Brilho Limpezas Especiais Ltda.** — do primeiro contato do cliente até o fechamento financeiro da operação.

## O que já está pronto (MVP 1 a 4 — sistema completo)

### MVP 3 — Diárias e Financeiro (novo)

- **Diárias**: consolidação automática de DR/VR/VT/adiantamento/saldo a partir da escala das OS, filtros por funcionário/evento/período/situação, ajuste de valores, pagamento em lote e exportação CSV (substitui a planilha DIARIAS)
- **Contas a receber**: geradas automaticamente ao aprovar proposta + lançamentos manuais, com atraso detectado automaticamente
- **Contas a pagar**: mesmas categorias do fluxo de caixa atual (Diárias Eventos, VR, VT, FGTS, INSS, Simples, Cemig, Copasa, Vivo, Bancos/Cartões...)
- **Fluxo de caixa**: consolidação mensal (faturado, recebido, em aberto, despesas, impostos, resultado, acumulado), despesas por categoria e receitas por cliente (substitui a planilha FLUXO DE CAIXA)

### MVP 4 — Relatórios e importação (novo)

- **Relatórios**: desempenho por cliente, rentabilidade por proposta aprovada (valor × custo × impostos × margem), eventos por mês e taxa de conversão — tudo exportável em CSV
- **Importação de planilhas antigas**: funcionários, clientes e despesas via CSV em 3 passos (upload → mapeamento de colunas → prévia e confirmação), com detecção automática de acentuação do Excel

### MVP 2 — Aceite, contrato e operação (novo)

- **Aprovar proposta** gera automaticamente: contrato simplificado (`CT-BBP...`), ordem de serviço (`OS-BBP...`), turnos operacionais copiados do cronograma e checklist padrão
- **Contratos**: PDF com as 8 cláusulas do manual (partes, objeto, cronograma, responsabilidades, preço, foro, assinaturas), marcar como enviado, **upload do contrato assinado** (Supabase Storage privado) e registro de quem assinou
- **Operação**: OS com 10 status, escala de funcionários por turno (diária/VR/VT puxados do cadastro), situação por funcionário (convidado → confirmado → compareceu → pago), checklist interativo e planejamento (materiais, transporte, alimentação, uniformes)
- **Funcionários**: cadastro completo com função, valores padrão, PIX e status

### Módulo de Propostas (novo)

- **Numeração BBP automática**: `BBP001/2026`, revisões `BBP001R1/2026`
- **Precificação** igual à planilha de cálculo de preço de venda: itens (agentes, coordenadores, VR, VT, materiais, transporte...), margem, BV, desconto e impostos, com valores **Nota Fiscal × Recibo** calculados em tempo real
- **Cronograma AL/CO** por fase (montagem, realização, desmontagem)
- **Valor por extenso automático** (ex.: "Duzentos e oitenta e seis reais e vinte centavos")
- **PDF profissional** no layout das propostas BBP atuais
- **Envio por e-mail** via Resend com PDF anexo e histórico de envios
- **Fluxo de status**: rascunho → enviada → em negociação → aprovada/recusada, com revisões

### Fundação (Etapas 1–3)

- Login com e-mail e senha (Supabase Auth), recuperação de senha e proteção de todas as rotas internas
- Layout premium com menu lateral, identidade visual da empresa e módulos futuros sinalizados
- Dashboard com indicadores, follow-ups pendentes, próximos eventos e atividade recente
- **Clientes**: cadastro completo + contatos por cliente
- **Eventos**: briefing completo (local, datas, horários, tipo de serviço, responsabilidades)
- Banco de dados com RLS ativado, permissões por papel (admin, comercial, operacional, financeiro, gestor, consulta), log de atividades e estrutura de propostas já criada (numeração BBP pronta no banco)

## Como rodar pela primeira vez

### 1. Instalar dependências

Abra a pasta `banho-de-brilho-manager` no VS Code e no terminal rode:

```bash
npm install
```

### 2. Configurar o banco no Supabase

1. Acesse seu projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** > **New query**
3. Rode as migrations **na ordem**, uma por vez:
   - `supabase/migrations/0001_fundacao.sql`
   - `supabase/migrations/0002_propostas.sql`
   - `supabase/migrations/0003_contratos_operacao.sql`
   - `supabase/migrations/0004_financeiro.sql`
4. (Opcional) Rode também `supabase/seed.sql` para criar dados de exemplo

### 3. Criar as variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`: painel do Supabase > **Settings > API**
- `SUPABASE_SERVICE_ROLE_KEY`: mesma tela (nunca compartilhe essa chave)
- `RESEND_API_KEY`: painel do Resend (será usada no módulo de propostas)

### 4. Criar o primeiro usuário

1. No Supabase, vá em **Authentication > Users > Add user > Create new user**
2. Informe e-mail e senha e marque **Auto Confirm User**
3. O perfil é criado automaticamente. Para dar acesso total, rode no SQL Editor:

```sql
update public.profiles
set role = 'admin', full_name = 'Seu Nome'
where email = 'seu@email.com.br';
```

Papéis disponíveis: `admin`, `comercial`, `operacional`, `financeiro`, `gestor`, `consulta`.

### 5. Rodar o sistema

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) e faça login.

## Deploy na Vercel

1. Suba o projeto para um repositório no GitHub
2. Em [vercel.com](https://vercel.com), clique em **Add New > Project** e importe o repositório
3. Em **Environment Variables**, cadastre as mesmas variáveis do `.env.local` (troque `NEXT_PUBLIC_APP_URL` pela URL da Vercel)
4. Clique em **Deploy**

## Melhorias futuras (opcionais)

- Alertas automáticos por e-mail (follow-ups, contas vencendo) — requer tarefas agendadas
- Portal de aceite da proposta pelo cliente (link público)
- Templates de proposta/contrato editáveis pelo admin
- Anexo de comprovantes de pagamento nas diárias e contas

## Observações sobre o envio de e-mails (Resend)

- Preencha `RESEND_API_KEY` no `.env.local`
- Enquanto o domínio `banhodebrilho.com.br` não estiver verificado no Resend, use `onboarding@resend.dev` como `RESEND_FROM_EMAIL` (só envia para o seu próprio e-mail de cadastro). Para enviar aos clientes, verifique o domínio em **Resend > Domains** e use `bh@banhodebrilho.com.br`

## Estrutura do projeto

```
src/
  app/            páginas (login, dashboard, clientes, eventos, propostas...)
  components/     layout, ui e formulários reutilizáveis
  lib/            supabase, actions, validações, utilitários
  types/          tipos TypeScript
supabase/
  migrations/     SQL do banco (rodar no Supabase)
  seed.sql        dados de exemplo (opcional)
```
