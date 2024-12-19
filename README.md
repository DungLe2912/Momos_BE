# Media Scraper Service

## 📝 Description

Media Scraper Service is a Node.js application that allows users to scrape and manage media (images, videos) from websites. The application uses Express.js as the web framework, PostgreSQL as the database, and Redis as the cache/queue system.

## 🚀 Features

- Authentication (signup, login, logout)
- Media scraping from URLs
- Media management per account
- Rate limiting and caching
- Queue system for scraping tasks
- RESTful API
- Docker support

## 🛠 Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Cache/Queue:** Redis
- **Containerization:** Docker
- **Testing:** Jest
- **Documentation:** Swagger/OpenAPI

## 📋 Requirements

- Node.js 18+
- Docker và Docker Compose
- PostgreSQL 15
- Redis 7

## 🔧 Installation

### Using Docker (Recommended)

1. **Clone repository:**

- git clone https://github.com/DungLe2912/Momos_BE.git

2. **Setup environment variables:**

- cp .env.example .env

3. **Run Docker containers:**

- docker compose up -d

### Manual installation

1. **Install dependencies:**

- npm install

2. **Run database migrations:**

- npm run db:migrate

3. **Run database seeders:**

- npm run db:seed

1. **Run the server:**

- npm run dev

## API Documentation

### Authentication

#### Signup

- Method: POST
- URL: /api/auth/signup
- Body:
  - email: string
  - password: string
  - name: string
- Response:
  - status: number
  - message: string
  - data: object
    - id: string
    - email: string
    - createdAt: string

#### Login

- Method: POST
- URL: /api/auth/login
- Body:
  - email: string
  - password: string
- Response:
  - user: object
    - id: string
    - userName: string
    - email: string
  - tokens:
    - accessToken: string
    - refreshToken: string

### Scraping

#### Get all scraping tasks

- Method: GET
- URL: /api/media/all?page=&limit=&type=&sortBy=&sortOrder=&search=&startDate=&endDate=
- Response:
  - status: string
  - message: string
  - data: array
    - id: string
    - sourceUrl: string
    - type: string
    - mediaUrl: string
    - createdAt: string
    - updatedAt: string

#### Scrape media

- Method: POST
- URL: /api/scrape/scrape-media
- Body:
  - urls: array
- Response:
  - status: string
  - message: string
  - data: object
    - jobIds: array
    - status: string
    - message: string
    - cachedResults: array

#### Get job status

- Method: GET
- URL: /api/scrape/status/:jobIds
- Response:
  - jobs: array
    - id: string
    - status: string

## Project structure

- src/
  - routers/
  - controllers/
  - middlewares/
  - database/
  - config/
  - services/
  - .env
