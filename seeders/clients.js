const seedClients = async (pool) => {
  try {
    const query = `
        INSERT INTO clients (first_name, last_name, email, phone) 
        VALUES 
          (?, ?, ?, ?),
          (?, ?, ?, ?),
          (?, ?, ?, ?)
      `;

    const values = [
      "John",
      "Doe",
      "john@example.com",
      "123-456-7890",
      "Jane",
      "Smith",
      "jane@example.com",
      "123-456-7891",
      "Robert",
      "Johnson",
      "robert@example.com",
      "123-456-7892",
    ];

    await pool.query(query, values);
    console.log("Clients seeded successfully");
  } catch (error) {
    console.error("Error seeding clients:", error);
  }
};

module.exports = seedClients;
