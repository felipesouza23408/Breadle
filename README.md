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
   ./mvnw spring-boot:run
   ```
3. Inicie o frontend:
   ```bash
   cd frontend
   npm install
   npm start
   ```
4. Abra `http://localhost:4200`.

## Credenciais de exemplo

- E-mail: `lucas@breadle.com`
- Senha: `123456`

## Observação

Este repositório contém uma base funcional para iniciar o projeto, alinhada aos requisitos da pasta `docs/` e ao stack obrigatório do projeto.
