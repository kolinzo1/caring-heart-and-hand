const bcryptjs = require("bcryptjs");

const seedUsers = async (pool) => {
  try {
    // Generate password hash
    const password = "staffpass123";
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(password, salt);

    // Insert test users
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, role) 
      VALUES 
        (?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?)
    `;

    const values = [
      "staff@example.com",
      passwordHash,
      "Staff",
      "User",
      "staff",
      "admin@example.com",
      passwordHash,
      "Admin",
      "User",
      "admin",
    ];

    await pool.query(query, values);
    console.log("Users seeded successfully");
  } catch (error) {
    console.error("Error seeding users:", error);
  }
};

module.exports = seedUsers;
