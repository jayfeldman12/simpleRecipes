# Simple Recipes Backend API

This is the backend API for the Simple Recipes application. It provides user authentication and recipe management functionality.

## Technologies Used

- Node.js
- Express
- MongoDB with Mongoose
- JWT Authentication
- bcryptjs for password hashing

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   MONGODB_URI=mongodb://localhost:27017/simpleRecipes
   JWT_SECRET=your_secure_jwt_secret
   PORT=5000
   ```
4. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /api/users` - Register a new user
- `POST /api/users/login` - Login user

### User Management

- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update user profile (protected)
- `POST /api/users/favorites/:recipeId` - Add recipe to favorites (protected)
- `DELETE /api/users/favorites/:recipeId` - Remove recipe from favorites (protected)

### Recipe Management

- `GET /api/recipes` - Get all recipes (public)
- `GET /api/recipes/:id` - Get recipe by ID (public)
- `POST /api/recipes` - Create a new recipe (protected)
- `PUT /api/recipes/:id` - Update a recipe (protected)
- `DELETE /api/recipes/:id` - Delete a recipe (protected)
- `GET /api/recipes/user/recipes` - Get user's recipes (protected)
- `GET /api/recipes/user/favorites` - Get user's favorite recipes (protected)

## Data Models

### User

- name (String, required)
- email (String, required, unique)
- password (String, required, min length 6)
- favorites (Array of Recipe IDs)

### Recipe

- title (String, required)
- description (String, required)
- ingredients (Array of Strings, required)
- instructions (Array of Strings, required)
- cookingTime (Number, required)
- servings (Number, required)
- imageUrl (String)
- tags (Array of Strings)
- user (Reference to User, required)
