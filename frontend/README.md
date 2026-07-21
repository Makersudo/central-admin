# MK Maker Central - Painel Geral de Clientes (SaaS Super Admin)

Este é o painel de gerenciamento centralizado para controlar e monitorar os catálogos dos seus clientes. Ele funciona de forma integrada com a API do projeto master.

---

## 🚀 Como Executar Localmente

1. Navegue até a pasta da central:
   ```bash
   cd central-admin
   ```

2. Certifique-se de ter as dependências instaladas:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   O painel estará disponível na porta indicada (geralmente `http://localhost:5173`).

---

## 🔒 Autenticação

Para acessar o painel, utilize as **mesmas credenciais de login Master** do seu administrador:
- **E-mail:** O mesmo e-mail configurado no backend (ex: `admin@mk-maker.local`)
- **Senha:** A mesma senha correspondente.

---

## 🌐 Como Fazer o Deploy do Painel

Como a Central Admin é um aplicativo estático (React SPA), você pode hospedá-la **gratuitamente** na Vercel ou Netlify em poucos segundos:

### Opção 1: Via Vercel CLI (Recomendado e Mais Rápido)
1. Abra o terminal na pasta `central-admin`.
2. Rode o comando de login da Vercel (se necessário):
   ```bash
   npx vercel login
   ```
3. Inicie a publicação:
   ```bash
   npx vercel --prod
   ```
4. Responda às perguntas no terminal:
   - *Set up and deploy?* **Yes**
   - *Which scope?* **Seu escopo pessoal/empresa**
   - *Link to existing project?* **No** (para criar um novo projeto)
   - *What's your project's name?* **mkmaker-central-admin** (ou o nome que preferir)
   - *In which directory is your code located?* **./**
   - *Want to modify settings?* **No** (as configurações padrão do Vite já serão detectadas automaticamente).

A Vercel gerará um domínio gratuito do tipo `https://mkmaker-central-admin.vercel.app` para você acessar seu painel de qualquer lugar do mundo!

---

## 📁 Estrutura do Projeto

- `src/App.tsx`: Interface completa do painel, incluindo a tela de Login, Cards de Métricas (Total de Clientes, Ativos, Inativos, Faturamento Recorrente Estimado), Tabela de Controle de Clientes com busca em tempo real e Modais para Cadastrar/Editar as licenças.
- `src/index.css`: Estilização global com Tailwind CSS v4 e paleta de cores escura e sofisticada.
