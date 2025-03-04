import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Recipe from "./models/Recipe";
import User from "./models/User";

// Load env variables
dotenv.config();

// Define UserData interface if needed
interface UserData {
  username: string;
  password: string;
}

const users: UserData[] = [
  {
    username: "admin",
    password: "password123",
  },
  {
    username: "johndoe",
    password: "password123",
  },
];

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  });

// Import data into DB
const importData = async (): Promise<void> => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Recipe.deleteMany({});

    // Insert users with hashed passwords
    const createdUsers = [];
    for (const user of users) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);

      const newUser = await User.create({
        username: user.username,
        password: hashedPassword,
      });

      createdUsers.push(newUser);
    }

    // Sample recipes
    const recipes = [
      {
        title: "Spaghetti Carbonara",
        description:
          "A classic Italian pasta dish from Rome made with eggs, hard cheese, cured pork, and black pepper.",
        ingredients: [
          "350g spaghetti",
          "200g pancetta or guanciale, diced",
          "3 large eggs",
          "50g pecorino romano, grated",
          "50g parmesan, grated",
          "Freshly ground black pepper",
          "Salt to taste",
        ],
        instructions: [
          "Bring a large pot of salted water to boil and cook spaghetti according to package instructions until al dente.",
          "While pasta cooks, heat a large skillet over medium heat. Add diced pancetta and cook until crispy, about 5-7 minutes.",
          "In a bowl, whisk together eggs, grated cheeses, and plenty of black pepper.",
          "When pasta is done, reserve 1 cup of pasta water, then drain pasta.",
          "Working quickly, add hot pasta to the skillet with pancetta. Remove from heat.",
          "Add the egg and cheese mixture, tossing constantly with tongs. Add splashes of pasta water as needed to create a creamy sauce.",
          "Serve immediately with extra grated cheese and black pepper on top.",
        ],
        cookingTime: 25,
        servings: 4,
        imageUrl: "spaghetti-carbonara.jpg",
        user: createdUsers[0]._id,
      },
      {
        title: "Chicken Tikka Masala",
        description:
          "A flavorful Indian curry dish with tender marinated chicken in a rich, creamy tomato sauce.",
        ingredients: [
          "800g boneless chicken thighs, cut into chunks",
          "200g plain yogurt",
          "3 tbsp lemon juice",
          "4 tsp ground cumin",
          "4 tsp ground coriander",
          "4 tsp paprika",
          "2 tsp turmeric",
          "2 tsp garam masala",
          "2 tbsp vegetable oil",
          "1 large onion, diced",
          "4 cloves garlic, minced",
          "2 tbsp fresh ginger, grated",
          "800g canned tomatoes, crushed",
          "300ml heavy cream",
          "Fresh cilantro for garnish",
          "Salt to taste",
        ],
        instructions: [
          "In a large bowl, combine yogurt, lemon juice, cumin, coriander, paprika, turmeric, and 1 tsp garam masala. Add chicken and toss to coat. Marinate for at least 1 hour, preferably overnight.",
          "Preheat oven to 400°F (200°C). Place chicken pieces on a baking sheet and bake for 15 minutes.",
          "Meanwhile, heat oil in a large pot over medium heat. Add onion and sauté until soft, about 5 minutes.",
          "Add garlic and ginger, cook for 1 minute until fragrant.",
          "Stir in crushed tomatoes. Bring to a simmer and cook for 15 minutes.",
          "Add the baked chicken pieces, including any juices. Simmer for 10 minutes.",
          "Stir in the cream and remaining 1 tsp garam masala. Simmer until chicken is cooked through, about 5-10 minutes.",
          "Garnish with fresh cilantro and serve with rice or naan bread.",
        ],
        cookingTime: 60,
        servings: 6,
        imageUrl: "chicken-tikka-masala.jpg",
        user: createdUsers[1]._id,
      },
    ];

    await Recipe.insertMany(recipes);

    console.log("Data imported successfully!");
    process.exit();
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
};

// Delete data from DB
const destroyData = async (): Promise<void> => {
  try {
    await User.deleteMany({});
    await Recipe.deleteMany({});

    console.log("Data destroyed successfully!");
    process.exit();
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
};

// Run script based on command line argument
if (process.argv[2] === "-d") {
  destroyData();
} else {
  importData();
}
