require("dotenv").config();
const mysql = require("mysql2/promise");

async function testConnection() {
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
    // Test the connection
    const connection = await pool.getConnection();
    console.log("Successfully connected to the database!");

    // Get server information
    const [rows] = await connection.query("SELECT VERSION() as version");
    console.log("MySQL Version:", rows[0].version);

    // Test database operations
    await connection.query(`
      CREATE TABLE IF NOT EXISTS connection_tests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(
      "INSERT INTO connection_tests (test_time) VALUES (NOW())"
    );
    const [testRows] = await connection.query(
      "SELECT * FROM connection_tests ORDER BY test_time DESC LIMIT 1"
    );
    console.log("Test record created at:", testRows[0].test_time);

    connection.release();
    await pool.end();
    console.log("All tests passed successfully!");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

testConnection();
