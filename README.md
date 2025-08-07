# Pio Brasileiro Backend

A minimal Node.js and Express backend with PostgreSQL database and JWT authentication.

## Features

- User registration and login with JWT tokens
- Bcrypt password hashing
- PostgreSQL with connection pooling
- JWT token validation middleware

## Prerequisites

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

**Register User:**
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securepassword"
}
```

**Login User:**
```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
    "email": "user@example.com", 
    "password": "securepassword"
}
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Register/Login** returns a JWT token
2. **Include token** in Authorization header for protected routes:
   ```http
   Authorization: your_jwt_token_here
   ```

## Database Schema

The application uses the following main tables:

- **`user_auth`**: User authentication data (id, email, password hash)
- **`perfil`**: User profile information
- Additional tables for guests, accommodation, and meals

## Testing

Use the included `test.rest` file with REST Client extension in VS Code, or import into Postman/Insomnia.

## Project Structure

```
src/
├── controllers/
│   └── authController.js    # Authentication logic
├── middleware/
│   └── authMiddleware.js    # JWT token validation
├── routes/
│   └── authRoutes.js        # Route definitions
├── db.js                    # Database connection
└── server.js                # Express app setup
```

## Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT token-based authentication
- Input validation for email and password
- Database transactions for data consistency

## License

ISC License

## Author

Gabriel Fernandes Pereira