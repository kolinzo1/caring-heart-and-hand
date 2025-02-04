const mongoose = require("mongoose");
const { User, Client, CareRequest, TimeLog } = require("../models");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Sample Data
const adminData = {
  firstName: "Kola",
  lastName: "Oyedele",
  email: "admin@caringheartandhand.org",
  phone: "423-748-3508",
  password: "admin123456",
  role: "admin",
};

const staffData = [
  {
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah@caringheartandhand.org",
    phone: "423-111-2222",
    password: "staff123456",
    role: "staff",
  },
  {
    firstName: "Michael",
    lastName: "Williams",
    email: "michael@caringheartandhand.org",
    phone: "423-333-4444",
    password: "staff123456",
    role: "staff",
  },
];

const clientsData = [
  {
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@example.com",
    phone: "423-555-6666",
    password: "client123456",
    role: "client",
  },
  {
    firstName: "Mary",
    lastName: "Brown",
    email: "mary.brown@example.com",
    phone: "423-777-8888",
    password: "client123456",
    role: "client",
  },
];

// Seeder Functions
const seedAdmin = async () => {
  try {
    // Check if admin exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log("Admin already exists");
      return existingAdmin;
    }

    const admin = await User.create(adminData);
    console.log("Admin seeded successfully");
    return admin;
  } catch (error) {
    console.error("Error seeding admin:", error);
    throw error;
  }
};

const seedStaff = async () => {
  try {
    const staffMembers = [];
    for (const staff of staffData) {
      const existingStaff = await User.findOne({ email: staff.email });
      if (!existingStaff) {
        const newStaff = await User.create(staff);
        staffMembers.push(newStaff);
      }
    }
    console.log("Staff seeded successfully");
    return staffMembers;
  } catch (error) {
    console.error("Error seeding staff:", error);
    throw error;
  }
};

const seedClients = async () => {
  try {
    const clients = [];
    for (const clientData of clientsData) {
      // Create user account
      const existingClient = await User.findOne({ email: clientData.email });
      if (!existingClient) {
        const user = await User.create(clientData);

        // Create client profile
        const client = await Client.create({
          user: user._id,
          dateOfBirth: new Date("1960-01-01"),
          address: {
            street: "123 Main St",
            city: "Anytown",
            state: "TN",
            zipCode: "37300",
          },
          emergencyContact: {
            name: "Jane Smith",
            relationship: "Daughter",
            phone: "423-999-0000",
          },
          medicalConditions: ["Diabetes", "Hypertension"],
          medications: [
            {
              name: "Metformin",
              dosage: "500mg",
              frequency: "Twice daily",
            },
          ],
          careNeeds: ["Medication Reminders", "Personal Care"],
          status: "active",
        });

        clients.push({ user, client });
      }
    }
    console.log("Clients seeded successfully");
    return clients;
  } catch (error) {
    console.error("Error seeding clients:", error);
    throw error;
  }
};

const seedCareRequests = async (clients, staffMembers) => {
  try {
    const careRequests = [];
    for (const { user: client } of clients) {
      const careRequest = await CareRequest.create({
        client: client._id,
        careType: "Personal Care",
        startDate: new Date(),
        frequency: "Daily",
        preferredTime: "Morning",
        status: "approved",
        notes: "Regular morning assistance needed",
        assignedCaregiver: staffMembers[0]._id,
      });
      careRequests.push(careRequest);
    }
    console.log("Care requests seeded successfully");
    return careRequests;
  } catch (error) {
    console.error("Error seeding care requests:", error);
    throw error;
  }
};

const seedTimeLogs = async (clients, staffMembers) => {
  try {
    const timeLogs = [];
    for (const { client } of clients) {
      const timeLog = await TimeLog.create({
        staff: staffMembers[0]._id,
        client: client._id,
        date: new Date(),
        startTime: "09:00",
        endTime: "11:00",
        careType: "Personal Care",
        notes: "Morning care routine completed",
        status: "approved",
      });
      timeLogs.push(timeLog);
    }
    console.log("Time logs seeded successfully");
    return timeLogs;
  } catch (error) {
    console.error("Error seeding time logs:", error);
    throw error;
  }
};

// Main seeder function
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing data
    if (process.env.NODE_ENV !== "production") {
      await mongoose.connection.db.dropDatabase();
      console.log("Database cleared");
    }

    // Seed data
    const admin = await seedAdmin();
    const staffMembers = await seedStaff();
    const clients = await seedClients();
    const careRequests = await seedCareRequests(clients, staffMembers);
    const timeLogs = await seedTimeLogs(clients, staffMembers);

    console.log("Database seeding completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

// Create seeder script
const seedScript = async () => {
  if (process.env.NODE_ENV === "production") {
    console.log("Seeding in production is not allowed");
    process.exit(1);
  }

  try {
    await seedDatabase();
  } catch (error) {
    console.error("Seeder script failed:", error);
    process.exit(1);
  }
};

// Run seeder
if (require.main === module) {
  seedScript();
}

module.exports = {
  seedDatabase,
  seedAdmin,
  seedStaff,
  seedClients,
  seedCareRequests,
  seedTimeLogs,
};
