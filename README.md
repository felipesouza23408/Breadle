# Breadle

Breadle é uma plataforma de leitura gamificada e educativa criada para aumentar o hábito de leitura no Brasil.

## Stack obrigatória

- Frontend: Angular + TypeScript + HTML + CSS
- Backend: Java 21 + Spring Boot 3.x + Maven + Spring Data JPA + Hibernate + Spring Security
- Banco: PostgreSQL em Docker Compose
- Autenticação: JWT com Spring Security
- Comunicação em tempo real: WebSocket/STOMP
- Arquivos: interface `FileStorageService` com implementação local (troca futura por MinIO/S3)
- Migrations: Flyway

## Como executar

1. Inicie os serviços de infraestrutura:
   ```bash
   docker compose up -d
   ```
2. Inicie o backend:
   ```bash
   cd backend
   .\mvnw.cmd spring-boot:run
   ```
   No macOS ou Linux, use `./mvnw spring-boot:run`.
3. Inicie o frontend:
   ```bash
   cd frontend
   npm install
   npm start
   ```
4. Abra `http://localhost:4200`.

Para produção, configure `apiBaseUrl` em `frontend/src/environments/environment.production.ts` com a origem do backend (por exemplo, `https://api.seudominio.com`, sem `/api`) antes de executar `npm run build` em `frontend`; deixe vazio se frontend e API forem servidos na mesma origem. A URL WebSocket é derivada automaticamente (`https` → `wss`). A execução local no Windows continua usando o comando acima.

## Contas

O cadastro público cria contas de leitor. Não há credenciais de demonstração fixas; configure uma conta administrativa apenas pelo mecanismo seguro de seed documentado no `.env.example`.

## Observação

Este repositório contém uma base funcional para iniciar o projeto, alinhada aos requisitos da pasta `docs/` e ao stack obrigatório do projeto.

## Assistente de leitura

O backend mantém as chaves do provedor de IA. Para ativar respostas de um modelo externo, configure `OPENAI_API_KEY` e `AI_ENABLED=true` no arquivo `.env` local (nunca publique esse arquivo). Sem uma chave válida, o Breadle informa que está usando o modo local, que oferece roteiros de reflexão sem fingir que fez uma análise automática.

As perguntas e explicações devem se limitar ao trecho lido/selecionado para evitar spoilers. O uso tem um limite diário configurável por `AI_DAILY_LIMIT` (20 por padrão); a aplicação recusa novas solicitações quando a cota termina e a renova à meia-noite UTC. A cota atual é igual para todos os perfis, pois o cadastro ainda não possui integração de planos gratuito/Plus.

Depois de atualizar o código, reinicie o backend: o Flyway aplicará automaticamente as migrations pendentes do banco local.

### Avaliação estruturada da sessão

No leitor, **Quiz da sessão** cria três perguntas variadas usando exclusivamente o texto oficial das páginas abertas e registradas naquela sessão. A criação é idempotente por sessão; as respostas são corrigidas no backend, e gabarito/rubrica não fazem parte das respostas públicas da API. A geração e a correção de respostas abertas usam a mesma cota diária da IA. O quiz fornece apenas feedback e não altera os pontos ganhos pela leitura.

As rotas autenticadas são `POST /api/reading/sessions/{sessionId}/assessments` e `POST /api/reading/sessions/{sessionId}/assessments/{questionId}/answers`. Respostas múltipla escolha são corrigidas localmente; respostas abertas usam a abstração de IA. A migration Flyway V17 cria as tabelas da avaliação sem armazenar o texto completo do livro.

## Acervo de EPUBs

O backend importa os arquivos `.epub` que estiverem diretamente na pasta `Downloads` do usuário e também reconcilia os arquivos já copiados para `backend/storage/books` a cada inicialização. Título, autoria, sinopse e total de páginas no leitor são extraídos do EPUB; livros sem arquivo de leitura não são inventados no catálogo. A recompensa de conclusão exibida no acervo é calculada pelo mesmo serviço de gamificação que credita os pontos.

## Redefinição de senha por e-mail

O login oferece o fluxo **Esqueci minha senha**. O Docker Compose inclui o Mailpit para testes locais: mantenha no `.env` `MAIL_HOST=localhost`, `MAIL_PORT=1025`, `MAIL_SMTP_AUTH=false` e `MAIL_SMTP_STARTTLS=false`, inicie os serviços com `docker compose up -d` e veja os e-mails enviados em `http://localhost:8025`. Configure também `FRONTEND_URL` para o endereço do Angular (localmente, `http://localhost:4200`).

Em produção, substitua as configurações Mailpit pelas credenciais do seu provedor SMTP (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH`, `MAIL_SMTP_STARTTLS` e `MAIL_FROM`). Não publique credenciais SMTP. O link expira em 30 minutos, só pode ser usado uma vez e o banco armazena apenas o hash do token. O endpoint de solicitação retorna a mesma confirmação para e-mails cadastrados e não cadastrados, e limita o envio a um e-mail por conta a cada minuto.
