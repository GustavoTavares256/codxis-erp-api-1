# 🤖 Gerente da Codxis — Bot de Check-in/Check-out

Bot de gestão interna desenvolvido para a **Codxis**, responsável por acompanhar diariamente as tarefas dos colaboradores através do WhatsApp.

O sistema registra o que foi **planejado e realizado**, calcula a **aderência das tarefas**, identifica **pendências recorrentes** e utiliza IA para gerar sugestões e conduzir a conversa de forma natural.

> **MVP autônomo:** o sistema não depende do CRM. O colaborador informa suas tarefas diretamente no momento do check-in.

---

## 🎯 Objetivo

O Gerente da Codxis foi criado para evitar que colaboradores precisem registrar a mesma informação em diferentes sistemas.

O fluxo é simples:

```text
        MANHÃ
          │
          ▼
    📥 CHECK-IN
    "O que você fará hoje?"
          │
          ▼
      PostgreSQL
          │
          │
        TARDE
          │
          ▼
    📤 CHECK-OUT
    "O que você concluiu?"
          │
          ▼
    Pendências + motivo
          │
          ▼
      📊 Aderência
          │
          ▼
    👨‍💼 Gestão
```

---

# ✨ Funcionalidades

### 👤 Para colaboradores

* `/entrada` — registra as tarefas planejadas.
* `/saida` — registra tarefas concluídas e pendências.
* `/hoje` — mostra o resumo do dia.
* `/sugestoes` — recebe sugestões baseadas no próprio histórico.
* `cancelar` — cancela um fluxo em andamento.

O bot conduz a conversa **uma pergunta por vez**, evitando fluxos confusos.

### 👨‍💼 Para gestão

* `/relatorio` — relatório dos últimos 7 dias.
* `/exportar-csv` — exportação dos dados.
* `/exportar-json` — exportação dos dados.
* Alertas automáticos de pendências recorrentes.
* Sugestões inteligentes para gestão.
* Dashboard web para acompanhamento.

---

# 📊 Aderência

O sistema compara as tarefas planejadas no check-in com as tarefas realizadas no check-out.

Exemplo:

```text
Planejadas: 5
Concluídas: 4

Aderência: 80%
```

Além da taxa de aderência, o sistema identifica:

* tarefas concluídas;
* tarefas pendentes;
* tarefas realizadas fora do planejamento;
* pendências recorrentes.

---

# 🔁 Pendências recorrentes

Quando uma mesma tarefa permanece pendente por **3 ou mais check-outs consecutivos sem justificativa**, o sistema identifica a recorrência.

A gestão recebe automaticamente um alerta.

```text
⚠️ Pendência recorrente

Colaborador: João
Tarefa: Implementar módulo de pagamentos
Ocorrências: 3 dias consecutivos
```

---

# 🧠 Inteligência Artificial

A IA é utilizada como uma camada auxiliar do sistema.

### Conversa guiada

O roteiro do bot continua sendo controlado pelo código.

O LLM apenas transforma cada etapa em uma pergunta mais natural.

```text
Check-in
   ↓
Tópico definido pelo sistema
   ↓
LLM redige a pergunta
   ↓
Colaborador responde
   ↓
Próximo tópico
```

Se o LLM estiver indisponível, o sistema utiliza perguntas pré-definidas.

**A IA nunca controla a máquina de estados do bot.**

Isso garante que uma falha do modelo não interrompa o fluxo.

### Sugestões inteligentes

O sistema analisa:

* aderência;
* tarefas planejadas;
* tarefas concluídas;
* pendências;
* pendências recorrentes;
* colaboradores sem check-in.

Com `OPENAI_API_KEY`, as sugestões são geradas por LLM.

Sem a chave, o sistema utiliza um **fallback determinístico baseado em regras**.

---

# 🏗️ Arquitetura

```text
Gerente da Codxis
│
├── src/
│   │
│   ├── channel/
│   │   ├── ChannelConnector.ts
│   │   ├── WhatsAppConnector.ts
│   │   └── ConsoleConnector.ts
│   │
│   ├── bot/
│   │   └── CheckInBot.ts
│   │
│   ├── store/
│   │   └── CheckInStore.ts
│   │
│   ├── report/
│   │   └── gestao.ts
│   │
│   ├── ai/
│   │   ├── LLMProvider.ts
│   │   ├── Sugestoes.ts
│   │   └── Dialogo.ts
│   │
│   ├── agendar/
│   │   ├── Scheduler.ts
│   │   ├── turnos.ts
│   │   └── iniciar.ts
│   │
│   ├── dashboard/
│   │   ├── server.ts
│   │   └── start-dashboard.ts
│   │
│   ├── index.ts
│   └── index-console.ts
│
├── docker-compose.yml
├── package.json
└── README.md
```

---

# 🔌 Abstração de canal

O bot não depende diretamente do WhatsApp.

A comunicação é abstraída através de:

```text
ChannelConnector
       │
       ├── WhatsAppConnector
       │
       └── ConsoleConnector
```

Isso permite testar toda a lógica através do terminal sem precisar conectar o WhatsApp.

Também facilita uma futura migração para outros canais.

```text
WhatsApp
   ↓
ChannelConnector
   ↓
CheckInBot
   ↓
PostgreSQL
```

---

# 📱 WhatsApp

Durante o desenvolvimento, o projeto utiliza:

**whatsapp-web.js**

A autenticação é feita através de QR Code.

```powershell
npm run dev
```

Depois:

1. Abra o WhatsApp no celular.
2. Acesse **Aparelhos conectados**.
3. Escolha **Conectar aparelho**.
4. Escaneie o QR Code exibido no terminal.

> A integração com `whatsapp-web.js` é destinada principalmente ao desenvolvimento/testes. Para produção, a arquitetura prevê a substituição por um provedor oficial/terceirizado, como Z-API ou Twilio.

---

# 🖥️ Teste pelo terminal

É possível executar o bot sem WhatsApp:

```powershell
npm run dev:console
```

Isso permite testar:

* check-in;
* check-out;
* aderência;
* pendências;
* relatórios;
* sugestões;
* comandos.

O fluxo utilizado é o mesmo do WhatsApp.

Para encerrar:

```text
sair
```

---

# 🗄️ PostgreSQL

O projeto utiliza PostgreSQL 16.

O Docker Compose disponibiliza o banco na porta **5433** para evitar conflitos com bancos locais na porta 5432.

Suba o banco:

```powershell
docker compose up -d
```

Configuração padrão:

```text
Host: localhost
Porta: 5433
Usuário: codxis
Senha: codxis
Banco: codxis
```

O schema é criado automaticamente pelo `CheckInStore`.

---

# 🗃️ Modelo de dados

Tabela principal:

```text
checkins_diarios
```

Campos principais:

| Campo                     | Descrição                     |
| ------------------------- | ----------------------------- |
| `tenant_id`               | Identificador do tenant       |
| `colaborador_id`          | ID do colaborador no canal    |
| `data`                    | Data do registro              |
| `tipo`                    | `check_in` ou `check_out`     |
| `tarefas`                 | Tarefas planejadas/concluídas |
| `pendentes`               | Tarefas pendentes             |
| `justificativa_pendencia` | Motivo da pendência           |
| `criado_em`               | Data/hora do registro         |

A aderência é calculada agrupando:

```text
tenant_id
+
colaborador_id
+
data
```

---

# ⏰ Turnos automáticos

O sistema possui um scheduler responsável por enviar mensagens automaticamente.

### Check-in

```text
10:00
↓
Lembrete de check-in
```

### Cobrança

```text
14:30
↓
Verifica quem ainda não fez check-in
↓
Envia cobrança
```

### Check-out

```text
16:30
↓
Verifica quem ainda não fez check-out
↓
Envia cobrança
↓
Gera sugestões para gestão
```

Os horários podem ser alterados através das variáveis de ambiente.

---

# 📊 Dashboard

O projeto possui um painel web para a gestão.

Execute:

```powershell
npm run dev:dashboard
```

Acesse:

```text
http://127.0.0.1:3111/
```

O dashboard apresenta:

* indicadores gerais;
* capacidade planejada x realizada;
* aderência;
* dados por colaborador;
* pendências recorrentes;
* alertas de gestão;
* ranking de aderência.

Também existe um endpoint JSON:

```text
/api/relatorio.json
```

> O dashboard roda em `127.0.0.1` por padrão e não possui autenticação. Não o exponha publicamente sem implementar uma camada de segurança.

---

# ⚙️ Instalação

Clone o projeto e instale as dependências:

```powershell
npm install
```

Suba o PostgreSQL:

```powershell
docker compose up -d
```

Configure as variáveis de ambiente.

Depois execute:

```powershell
npm run dev
```

---

# 🔐 Variáveis de ambiente

```env
DATABASE_URL=postgres://codxis:codxis@localhost:5433/codxis

GESTAO_IDS=
FUNCIONARIOS_IDS=

TENANT_ID=codxis

PORT=3111
HOST=127.0.0.1

HORA_CHECKIN=10:00
HORA_COBRANCA_CHECKIN=14:30
HORA_CHECKOUT=16:30

AGENDADOR_ATIVO=true

OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

SUGESTOES_ATIVAS=true
```

### Gestão

`GESTAO_IDS` define quem pode acessar:

* `/relatorio`;
* `/exportar-csv`;
* `/exportar-json`;
* alertas de pendências recorrentes;
* visão empresarial das sugestões.

Exemplo:

```powershell
$env:GESTAO_IDS="5511999999999@c.us"
```

### Funcionários

`FUNCIONARIOS_IDS` define os colaboradores que receberão os lembretes automáticos.

```env
FUNCIONARIOS_IDS=5511988888888@c.us,5511977777777@c.us
```

---

# 🧪 Testes

O projeto possui testes automatizados utilizando `node:test`.

Execute:

```powershell
npm run test
```

Os testes cobrem:

* aderência;
* PostgreSQL/store;
* fluxo de check-in;
* fluxo de check-out;
* pendências recorrentes;
* permissões;
* exportações;
* alertas;
* dashboard;
* sugestões;
* scheduler;
* conversa guiada.

Atualmente são **52 testes automatizados**.

Antes de executar os testes, suba o PostgreSQL:

```powershell
docker compose up -d
```

Cada arquivo de teste utiliza um banco isolado.

---

# 🛠️ Scripts

| Comando                 | Função                       |
| ----------------------- | ---------------------------- |
| `npm run dev`           | Inicia o bot no WhatsApp     |
| `npm run dev:console`   | Executa o bot pelo terminal  |
| `npm run dev:dashboard` | Inicia o dashboard           |
| `npm run typecheck`     | Verifica os tipos TypeScript |
| `npm run test`          | Executa os testes            |
| `npm run build`         | Compila o projeto            |
| `npm start`             | Executa a versão compilada   |

---

# 📁 Fluxo completo

```text
                    ┌──────────────────┐
                    │     WhatsApp     │
                    └────────┬─────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ ChannelConnector    │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │    CheckInBot       │
                  │                     │
                  │ Máquina de estados  │
                  └───────┬─────┬───────┘
                          │     │
                ┌─────────┘     └─────────┐
                ▼                         ▼
       ┌────────────────┐        ┌────────────────┐
       │     Dialogo    │        │   Sugestoes    │
       │      LLM       │        │      LLM       │
       └────────────────┘        └────────────────┘
                │                         │
                └──────────┬──────────────┘
                           ▼
                  ┌──────────────────┐
                  │   CheckInStore   │
                  │   PostgreSQL     │
                  └────────┬─────────┘
                           │
                 ┌─────────┴─────────┐
                 ▼                   ▼
        ┌────────────────┐   ┌────────────────┐
        │ Relatório      │   │   Dashboard    │
        │ de Gestão      │   │      Web       │
        └────────────────┘   └────────────────┘
```

---

# 🔒 Segurança

Alguns pontos ainda devem ser tratados antes de uma exposição em produção:

* autenticação do dashboard;
* autorização por usuário;
* proteção das variáveis secretas;
* logs sem informações sensíveis;
* validação dos IDs do WhatsApp;
* rate limiting;
* tratamento de falhas do provedor de mensagens;
* migrations do banco;
* monitoramento do processo.

O dashboard permanece limitado a `127.0.0.1` por padrão justamente para evitar exposição acidental.

---

# 🚧 Status do projeto

### Implementado

* [x] Check-in
* [x] Check-out
* [x] Máquina de estados
* [x] Múltiplos check-ins no mesmo dia
* [x] Cálculo de aderência
* [x] Identificação de pendências
* [x] Pendências recorrentes
* [x] Alertas para gestão
* [x] Relatório de gestão
* [x] Exportação CSV
* [x] Exportação JSON
* [x] Sugestões inteligentes
* [x] Conversa guiada com LLM
* [x] Fallback sem IA
* [x] Scheduler
* [x] PostgreSQL
* [x] Multi-tenant
* [x] Dashboard
* [x] Conector WhatsApp
* [x] Conector Console
* [x] Testes automatizados

### Próximos passos

* [ ] Migrar WhatsApp para provedor de produção
* [ ] Autenticação do dashboard
* [ ] Migrations do PostgreSQL
* [ ] Logs e observabilidade
* [ ] Deploy
* [ ] Edição/remoção de tarefas
* [ ] Relatórios semanais
* [ ] Notificações adicionais

---

# 📌 Decisões arquiteturais

### O CRM não é uma dependência

O MVP foi projetado para funcionar de forma independente.

Isso permite validar o produto sem depender de:

* Edge Functions;
* APIs do CRM;
* alterações no CRM;
* infraestrutura externa.

### A IA é auxiliar

O LLM não controla regras críticas do sistema.

Regras como:

* quem pode acessar relatórios;
* quando um check-out pode acontecer;
* cálculo da aderência;
* identificação de pendências;
* transição entre estados;

permanecem determinísticas.

### O canal é desacoplado

O `CheckInBot` não sabe se está conversando pelo WhatsApp ou pelo terminal.

Isso permite trocar o canal sem reescrever a lógica de negócio.

---

# 🚀 Roadmap

```text
MVP
 │
 ├── Check-in / Check-out        ✅
 ├── PostgreSQL                  ✅
 ├── Aderência                   ✅
 ├── Relatórios                  ✅
 ├── IA                          ✅
 ├── Scheduler                   ✅
 ├── Dashboard                   ✅
 └── Testes                      ✅
          │
          ▼
Produção
 │
 ├── Provedor WhatsApp           ⏳
 ├── Autenticação                ⏳
 ├── Deploy                      ⏳
 ├── Observabilidade             ⏳
 └── Hardening de segurança      ⏳
```

---

## 📄 Licença

Projeto interno desenvolvido para a **Codxis**.
