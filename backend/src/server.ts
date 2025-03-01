import cors from "cors";
import dotenv from "dotenv";
import express, { Application } from "express";
import mongoose from "mongoose";
import morgan from "morgan";

// Import middleware
import { errorHandler, notFound } from "./middleware/errorMiddleware";

// Load environment variables
dotenv.config();

// Import routes
import recipeRoutes from "./routes/recipeRoutes";
import userRoutes from "./routes/userRoutes";

// Initialize Express app
const app: Application = express();
const PORT: number = parseInt(process.env.PORT || "5000", 10);

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

// Database connection
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  });

// Routes
app.use("/api/users", userRoutes);
app.use("/api/recipes", recipeRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Simple Recipes API is running");
});

// Error middleware
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
