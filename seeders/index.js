require("dotenv").config();
const mysql = require("mysql2/promise");
const seedUsers = require("./users");

const runSeeders = async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  try {
    await seedUsers(pool);
    console.log("All seeds completed");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await pool.end();
  }
};

runSeeders();
