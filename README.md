# Simple Recipes App

A user-friendly recipe management application built with Next.js and Express. Create, manage, and share your recipes with a clean and intuitive interface.

## Features

- User registration and authentication
- Create and manage recipes
- Import recipes automatically from URLs with AI assistance
- View and search recipes
- Responsive design

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- MongoDB

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/simple-recipes.git
cd simple-recipes
```

2. Install dependencies for frontend

```bash
npm install
```

3. Install dependencies for backend

```bash
cd backend
npm install
```

### Configuration

1. Create a `.env` file in the root directory and the backend directory with the following content:

**Frontend (.env)**

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Backend (backend/.env)**

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
OPENAI_API_KEY=your_openai_api_key
```

Replace `your_mongodb_connection_string`, `your_jwt_secret`, and `your_openai_api_key` with your actual credentials.

> **Important**: You'll need an OpenAI API key to use the recipe import feature. Sign up at [https://platform.openai.com/](https://platform.openai.com/) if you don't have one.

### Running the App

1. Start the backend server:

```bash
cd backend
npm run dev
```

2. In a separate terminal, start the frontend:

```bash
npm run dev
```

3. Access the app at [http://localhost:3000](http://localhost:3000)

## Using Recipe Import Feature

The app allows you to import recipes directly from URLs:

1. Navigate to the "Create Recipe" page
2. Click the "Import from URL" button
3. Paste a URL to a recipe page
4. Click "Import Recipe"

The app will:

1. Fetch the HTML content from the URL
2. Use OpenAI to extract the recipe information
3. Populate the recipe form with the extracted data
4. Allow you to review and edit the data before saving

## Technologies Used

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Express.js, TypeScript, MongoDB/Mongoose
- **AI**: OpenAI GPT-3.5 for recipe extraction

## License

MIT
