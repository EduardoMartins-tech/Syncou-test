<p align="center">
  <img src="public/favicon.svg" height="120" alt="Syncou Logo"/>
</p>

# 🚀 Syncou

<p align="center">
  <b>Plataforma inteligente de agendamentos e reuniões online sincronizada com o Google Agenda.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-em%20desenvolvimento-yellow" alt="Status" />
  <img src="https://img.shields.io/badge/version-1.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/TypeScript-Language-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933" alt="Node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-336791" alt="PostgreSQL" />
</p>

---

## 📌 Sobre o Projeto

O **Syncou** é uma plataforma web desenvolvida para **modernizar e simplificar a gestão de agendamentos para profissionais autônomos e empresas**.

A proposta é centralizar em um único sistema:

- 👥 Página pública de agendamentos personalizada
- 📅 Gestão de disponibilidade e horários de trabalho
- 🏢 Gerenciamento completo de serviços prestados
- 🔄 Sincronização e integração bidirecional com Google Calendar
- 💬 Facilidade de comunicação com clientes via templates de WhatsApp

---

## 🎯 Objetivos

### 🔹 Objetivo Geral
Criar uma plataforma eficiente e acessível para a gestão de agendamentos, promovendo **organização, otimização de tempo e uma melhor experiência para os clientes**.

### 🔹 Objetivos Específicos

- 📊 Centralizar a agenda do profissional
- 💬 Melhorar comunicação com clientes sobre remarcações e cancelamentos
- 🔐 Garantir gestão segura de horários, prevenindo conflitos (overbooking)
- ⚙️ Automatizar a sincronização com ferramentas de terceiros (Google Calendar)
- 🌍 Fornecer uma interface moderna, amigável e responsiva

---

## 🧰 Tecnologias

<p align="center">

| Tecnologia | Uso |
|-----------|-----|
| React + Vite | Front-end e interface interativa |
| TypeScript | Tipagem estática e segurança do código |
| Tailwind CSS | Estilização, Design System e responsividade |
| Node.js / Express | Back-end e APIs REST |
| PostgreSQL | Banco de dados relacional (via biblioteca `pg`) |
| Google Calendar API | Autenticação e sincronização de eventos |

</p>

## 🌟 Funcionalidades Principais

- ✅ **Página Pública Personalizada**: Link exclusivo (`/p/:slug`) onde clientes visualizam serviços e agendam horários de forma totalmente intuitiva.
- 🔄 **Sincronização com o Google Calendar**: Conexão segura permitindo adição automática de eventos e prevenção de conflitos.
- 📅 **Gestão Inteligente de Disponibilidade**: 
  - Regras de dias úteis e horários recorrentes
  - Permissão ou bloqueio automático de agendamentos em feriados nacionais
  - Gestão de folgas e overrides
- 📦 **Múltiplos Serviços**: Cadastro de serviços com duração, buffer de horários restritos e variação de preço.
- 🚫 **Prevenção de Conflitos (Overbooking)**: Checagem server-side que assegura agendamentos sem colisão.
- 💬 **Comunicação por WhatsApp**: Templates rápidos guiando clientes e avisando em caso de alterações via interface.
- 📊 **Exportação de Dados**: Geração e download de relatórios em formato CSV.

---

## 🏗️ Arquitetura do Sistema

O projeto foi construído utilizando uma arquitetura Full-Stack onde o código-fonte de frontend e backend coexistem para garantir velocidade de prototipação.

```text
Syncou/
├── public/                 # Assets estáticos (ícones, favicons)
├── src/                    # Código do Frontend (React)
│   ├── components/         # Componentes isolados e reutilizáveis (UI)
│   ├── contexts/           # Gestão de contexto global (ex: AuthContext)
│   ├── lib/                # Arquivos utilitários (cn, etc)
│   └── pages/              # Páginas da aplicação
│       ├── DashboardHome.tsx      # Visão geral de dashboard
│       ├── DashboardCalendar.tsx  # Visão de calendário e agendamentos
│       ├── DashboardSettings.tsx  # Configurações do serviço
│       ├── LandingPage.tsx        # Tela inicial de marketing/login
│       └── ProviderPage.tsx       # Página pública do profissional
├── server.ts               # Servidor Backend (API Express + Vite Middleware)
├── vite.config.ts          # Configurações do empacotador Frontend
├── package.json            # Dependências e scripts de automação
└── README.md
```

### Como o Agendamento Funciona (Regra de Negócio)

1. O cliente acessa a **Página do Provedor** (`/p/:slug`).
2. O sistema filtra os dias disponíveis baseado nas configurações do profissional (horários de rotina, folgas, feriados).
3. Ao selecionar um dia, os "slots" de horário consideram a duração de fato e o tempo de pausa (buffer), consultando o PostgreSQL para bloqueio em tempo real.
4. O cliente informa os dados de contato e finaliza.
5. Uma chamada assíncrona reserva o horário definitivamente na base e tenta a criação via Google Calendar (caso conectado).

---

## 💻 Como rodar localmente

### Passo a passo

```bash
# Clone ou baixe o repositório do projeto
# Acesse a pasta do diretório via terminal

# 1. Instale as dependências
npm install

# 2. Inicie o servidor de desenvolvimento e Vite (Frontend + Backend)
npm run dev

# 3. Compile para produção (Opcional)
npm run build

# 4. Rode a versão de produção gerada (Opcional)
npm run start
```
<p align="center">Acesse no navegador: <code>http://localhost:3000/</code></p>
