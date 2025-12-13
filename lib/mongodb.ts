import mongoose, { type Mongoose } from "mongoose";

// Define the structure of our cached connection
// This ensures type safety when accessing the cached connection and promise
interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Extend the global object to include our mongoose cache
// This prevents TypeScript errors when accessing global.mongooseCache
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

// Get the MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

// Throw an error if the MongoDB URI is not defined
// This fails fast so misconfigured deployments don't start up in a broken state
if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

const DATABASE_URL: string = MONGODB_URI;

// Initialize the cache on the global object
// In development, Next.js hot-reloading can cause this module to be evaluated multiple times
// Caching the connection on the global object prevents creating many connections across reloads
const globalCache: MongooseCache =
  globalThis.mongooseCache ??
  (globalThis.mongooseCache = { conn: null, promise: null });

/**
 * Establishes a connection to MongoDB using Mongoose
 * Uses connection caching to prevent multiple connections during development hot-reloads
 * @returns Promise<Mongoose> - The mongoose instance with active connection
 * @throws Error if connection fails
 */
export async function connectToDatabase(): Promise<Mongoose> {
  // Return existing connection if already established
  if (globalCache.conn) {
    return globalCache.conn;
  }

  // If no connection exists but a promise is in progress, reuse it
  if (!globalCache.promise) {
    const opts = {
      // Disable buffering to fail fast if not connected
      // This prevents operations from queuing up when there's no connection
      bufferCommands: false,
    };

    // Create a new connection promise
    // mongoose.connect returns the Mongoose instance once the connection is ready
    globalCache.promise = mongoose.connect(DATABASE_URL, opts).then((mongoose) => {
      console.log("✅ MongoDB connected successfully");
      return mongoose;
    });
  }

  try {
    // Wait for the connection promise to resolve
    globalCache.conn = await globalCache.promise;
  } catch (error) {
    // Reset the promise if connection fails so subsequent calls can retry
    globalCache.promise = null;
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }

  return globalCache.conn;
}
