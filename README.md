# Pio Brasileiro Backend

Node.js and Express backend with PostgreSQL database and JWT authentication.

## Features
- User registration and login with JWT tokens
- Bcrypt password hashing
- PostgreSQL with connection pooling
- JWT token validation middleware
- Image upload and storage in the database as Base64 binary files
- Role-based access control for protected routes (admin and common user)
- Integration with SMTP for sending transactional emails (verification, password reset)

## Database Schema
The database schema in a diagram for better visualization:

```mermaid
erDiagram
    user_auth {
        uuid id PK
        varchar email
        varchar password
        enum tipo_usuario
        boolean active
        timestamp criado_em
    }

    perfil {
        uuid user_id PK, FK
        varchar nome_completo
        date data_nasc
        enum genero
        varchar funcao
        varchar num_documento
        enum tipo_documento
        bytea avatar_image_data
        varchar observacoes
        timestamp criado_em
    }

    solicitacao {
        uuid id PK
        varchar nome
        varchar num_telefone
        varchar email
        date data_chegada
        date data_saida
        int num_pessoas
        boolean visualizada
        timestamp criado_em
    }

    quarto {
        uuid id PK
        varchar numero
        int capacidade
    }

    hospede {
        uuid id PK
        varchar nome
        enum genero
        enum tipo_documento
        varchar num_documento
        varchar funcao
        varchar origem
        varchar observacoes
        timestamp criado_em
    }

    hospedagem {
        uuid id PK
        uuid anfitriao_id FK
        uuid hospede_id FK
        uuid quarto_id FK
        date data_chegada
        date data_saida
        enum status_hospedagem
        timestamp criado_em
    }

    convidado {
        uuid id PK
        uuid anfitriao_id FK
        varchar nome
        varchar funcao
        varchar origem
        varchar observacoes
        timestamp criado_em
    }

    refeicao {
        uuid id PK
        enum tipo_pessoa
        uuid usuario_id FK
        uuid hospede_id FK
        uuid convidado_id FK
        date data
        boolean almoco_colegio
        boolean almoco_levar
        boolean janta_colegio
        timestamp criado_em
    }

    password_reset {
        uuid id PK
        uuid user_id FK
        varchar token_hash
        timestamp expires_at
        timestamp created_at
    }

    %% Relationships
    user_auth ||--|| perfil : "has profile"
    user_auth ||--o{ password_reset : "can reset"
    perfil ||--o{ hospedagem : "hosts"
    hospede ||--o{ hospedagem : "stays in"
    quarto ||--o{ hospedagem : "assigned to"
    perfil ||--o{ convidado : "can invite"
    perfil ||--o{ refeicao : "eats"
    hospede ||--o{ refeicao : "eats"
    convidado ||--o{ refeicao : "eats"
```

## Technologies (Requirements)
- Node.js (v16 or higher)
- PostgreSQL database
- Environment variables configured

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd piobrasileiro-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DB_USER=your_db_user
   DB_HOST=localhost
   DB_NAME=your_db_name
   DB_PASSWORD=your_db_password
   DB_PORT=5432
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=24h
   PORT=3000
   ```

4. **Set up the database**
   
   Run the SQL commands from `generate.sql` to create the required tables:
   ```bash
   psql your_db_name < generate.sql
   ```

## Running the Application

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## API Endpoints

### Authentication Routes

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/auth/register` | Register new user | `{ email, password }` |
| `POST` | `/auth/login` | Login user | `{ email, password }` |

### Example Requests

**Login User:**
```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
    "email": "user@example.com", 
    "password": "securepassword"
}
```

## Testing

Use the included `test.rest` file with REST Client extension in VS Code, or import into Postman/Insomnia.

## Project Structure

```
src/
├── controllers/
│   └── authController.js    # All the controllers for logic
├── middleware/
│   └── authMiddleware.js    # JWT token validation
├── routes/
│   └── authRoutes.js        # Route definitions for (admin, user, authentication)
├── db.js                    # Database connection for pooling
└── server.js                # Express app setup
```

## License

ISC License

## Author

Gabriel Fernandes Pereira
