# Breadle

Breadle é uma plataforma de leitura gamificada e educativa criada para aumentar o hábito de leitura no Brasil.

## Stack obrigatória

- Frontend: Angular + TypeScript + HTML + CSS
- Backend: Java 25 + Spring Boot 3.x + Maven + Spring Data JPA + Hibernate + Spring Security
- Banco: PostgreSQL em Docker Compose
- Autenticação: JWT com Spring Security
- Comunicação em tempo real: WebSocket/STOMP
- Arquivos: interface `FileStorageService` com implementação local (troca futura por MinIO/S3)
- Migrations: Flyway

## Como instalar e iniciar (Windows)

### 1. Instale os programas necessários

- **Git** para baixar o código.
- **Docker Desktop** para executar PostgreSQL e Mailpit. Baixe-o do [site oficial do Docker](https://www.docker.com/products/docker-desktop/), instale e reinicie o Windows se o instalador solicitar. Se o Docker pedir para instalar/ativar WSL 2, aceite e siga as instruções exibidas.
- **JDK 25** e **Node.js 24** para executar backend e frontend.

Abra o Docker Desktop e espere ele indicar que o mecanismo (engine) está em execução. O Docker Desktop precisa estar aberto enquanto você usa o Breadle.

### 2. Baixe o código

Abra o PowerShell na pasta onde deseja guardar o projeto e execute:

```powershell
git clone --branch feature/melhorias-gerais https://github.com/felipesouza23408/Breadle.git
cd Breadle
```

### 3. Prepare o projeto

Na pasta `Breadle`, execute:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-windows.ps1
```

O script cria uma chave de segurança local, instala as dependências do frontend e baixa/inicia automaticamente os containers do PostgreSQL e Mailpit. Na primeira execução, aguarde terminar. Não é necessário criar ou editar `.env`. Se houver um `.env` de uma instalação anterior, não o apague: ele pode conter configurações necessárias para o banco local já existente.

### 4. Inicie backend e frontend

Abra **dois terminais** na pasta `Breadle`.

No primeiro terminal, inicie o backend:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

No segundo terminal, inicie o frontend:

```powershell
cd frontend
npm start
```

Quando os dois comandos estiverem rodando, abra [http://localhost:4200](http://localhost:4200) no navegador. Para parar, encerre os dois comandos com `Ctrl+C`; os dados do PostgreSQL permanecem guardados no volume do Docker. `docker compose down` para os containers, mas também preserva esse volume.

## Levar também os dados do Docker para outro computador (Windows)

O código do Git **não inclui** o banco de dados. O banco fica em um volume local do Docker, que não é transferido ao copiar ou clonar o repositório. O procedimento abaixo exporta o banco para um ZIP e o importa no Docker do outro computador; não é necessário copiar o container ou o volume manualmente.

### No computador antigo: criar e copiar o pacote

1. Abra o Docker Desktop e espere o mecanismo indicar que está em execução.
2. Abra o PowerShell na pasta `Breadle` e execute:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\backup-windows.ps1
   ```

3. Aguarde a mensagem `Backup criado`. O ZIP estará dentro de `Breadle\backups` e conterá uma exportação do PostgreSQL e os arquivos em `backend\storage`.
4. Copie esse ZIP para um pendrive ou outro local acessível no computador novo. O pacote pode conter dados pessoais, não é criptografado e não inclui segredos; guarde-o com cuidado e apague cópias quando não precisar mais delas.

### No computador novo: instalar, importar o banco e iniciar

1. Instale Git, Docker Desktop, JDK 25 e Node.js 24 conforme a seção anterior. Abra o Docker Desktop e espere o mecanismo ficar pronto.
2. No PowerShell, clone o projeto:

   ```powershell
   git clone --branch feature/melhorias-gerais https://github.com/felipesouza23408/Breadle.git
   cd Breadle
   ```

3. Copie o ZIP do pendrive para a pasta `Breadle\backups`. Se a pasta não existir, crie-a pelo Explorador de Arquivos.
4. Prepare o projeto:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\prepare-windows.ps1
   ```

   Esse comando cria um novo container PostgreSQL e seu volume vazio, além de instalar as dependências.

5. No terminal, digite `dir .\backups` para ver o nome exato do ZIP. Use esse nome no comando abaixo, substituindo `breadle-backup-AAAAmmdd-HHmmss.zip`:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\restore-windows.ps1 -BackupPath .\backups\breadle-backup-AAAAmmdd-HHmmss.zip
   ```

6. Quando aparecer o pedido de confirmação, digite `RESTAURAR` e pressione Enter. Isso importa os dados no container novo e copia os livros de `backend\storage`. A operação substitui os dados que já existirem no banco de destino.
7. Inicie o backend e o frontend em dois terminais, seguindo a seção **Inicie backend e frontend** acima. Entre novamente na sua conta; tokens de login antigos não são transferidos.

O pacote não inclui EPUBs que estejam fora de `backend\storage`, nem segredos de IA ou de SMTP. Para ativar serviços externos, configure suas credenciais separadamente como variáveis locais seguras; isso não é necessário para iniciar o projeto.

Para produção, configure `apiBaseUrl` em `frontend/src/environments/environment.production.ts` com a origem do backend (por exemplo, `https://api.seudominio.com`, sem `/api`) antes de executar `npm run build` em `frontend`; deixe vazio se frontend e API forem servidos na mesma origem. A URL WebSocket é derivada automaticamente (`https` → `wss`). A execução local no Windows continua usando o comando acima.

## Contas

O cadastro público cria contas de leitor. Não há credenciais de demonstração fixas nem configuração administrativa de seed neste projeto.

## Observação

Este repositório contém uma base funcional para iniciar o projeto, alinhada aos requisitos da pasta `docs/` e ao stack obrigatório do projeto.

## Assistente de leitura

O backend mantém as chaves do provedor de IA. Para ativar respostas de um modelo externo, configure `OPENAI_API_KEY` e `AI_ENABLED=true` como variáveis opcionais do ambiente do backend. Sem uma chave válida, o Breadle informa que está usando o modo local, que oferece roteiros de reflexão sem fingir que fez uma análise automática.

As perguntas e explicações devem se limitar ao trecho lido/selecionado para evitar spoilers. O uso tem um limite diário configurável por `AI_DAILY_LIMIT` (20 por padrão); a aplicação recusa novas solicitações quando a cota termina e a renova à meia-noite UTC. A cota atual é igual para todos os perfis, pois o cadastro ainda não possui integração de planos gratuito/Plus.

Depois de atualizar o código, reinicie o backend: o Flyway aplicará automaticamente as migrations pendentes do banco local.

### Avaliação estruturada da sessão

No leitor, **Quiz da sessão** cria três perguntas variadas usando exclusivamente o texto oficial das páginas abertas e registradas naquela sessão. A criação é idempotente por sessão; as respostas são corrigidas no backend, e gabarito/rubrica não fazem parte das respostas públicas da API. A geração e a correção de respostas abertas usam a mesma cota diária da IA. O quiz fornece apenas feedback e não altera os pontos ganhos pela leitura.

As rotas autenticadas são `POST /api/reading/sessions/{sessionId}/assessments` e `POST /api/reading/sessions/{sessionId}/assessments/{questionId}/answers`. Respostas múltipla escolha são corrigidas localmente; respostas abertas usam a abstração de IA. A migration Flyway V17 cria as tabelas da avaliação sem armazenar o texto completo do livro.

## Acervo de EPUBs

O backend importa os arquivos `.epub` que estiverem diretamente na pasta `Downloads` do usuário e também reconcilia os arquivos já copiados para `backend/storage/books` a cada inicialização. Título, autoria, sinopse e total de páginas no leitor são extraídos do EPUB; livros sem arquivo de leitura não são inventados no catálogo. A recompensa de conclusão exibida no acervo é calculada pelo mesmo serviço de gamificação que credita os pontos.

## Redefinição de senha por e-mail

O login oferece o fluxo **Esqueci minha senha**. O Docker Compose inclui o Mailpit para testes locais e o backend já aponta para ele por padrão. Inicie os serviços com `docker compose up -d` e veja os e-mails enviados em `http://localhost:8025`. Configure `FRONTEND_URL` apenas se o frontend usar outro endereço (localmente, `http://localhost:4200`).

Em produção, substitua as configurações Mailpit pelas credenciais do seu provedor SMTP (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH`, `MAIL_SMTP_STARTTLS` e `MAIL_FROM`). Não publique credenciais SMTP. O link expira em 30 minutos, só pode ser usado uma vez e o banco armazena apenas o hash do token. O endpoint de solicitação retorna a mesma confirmação para e-mails cadastrados e não cadastrados, e limita o envio a um e-mail por conta a cada minuto.
