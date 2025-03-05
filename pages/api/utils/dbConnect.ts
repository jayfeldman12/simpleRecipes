import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongoose: MongooseCache;
}

global.mongoose = global.mongoose || { conn: null, promise: null };

async function dbConnect() {
  if (global.mongoose.conn) {
    return global.mongoose.conn;
  }

  if (!global.mongoose.promise) {
    console.log("Creating new MongoDB connection...");

    global.mongoose.promise = mongoose
      .connect(MONGODB_URI!, {
        bufferCommands: true,
        connectTimeoutMS: 10000, // Connection timeout
        socketTimeoutMS: 45000, // Socket timeout
        serverSelectionTimeoutMS: 30000, // Server selection timeout
        maxPoolSize: 10, // Maximum number of connections in the pool
      })
      .then((mongoose) => {
        console.log(
          "MongoDB connected successfully:",
          mongoose.connection.readyState
        );
        return mongoose;
      });
  }

  global.mongoose.conn = await global.mongoose.promise;
  return global.mongoose.conn;
}

export default dbConnect;
