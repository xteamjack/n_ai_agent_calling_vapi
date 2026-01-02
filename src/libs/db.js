const { MongoClient } = require("mongodb");

let client;
let db;

async function connectDB() {
  if (db) return db;

  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  db = client.db(process.env.DB_NAME);
  console.log("MongoDB connected");

  return db;
}

async function getCollection(name) {
  const database = await connectDB();
  return database.collection(name);
}

module.exports = {
  getCollection,
};
