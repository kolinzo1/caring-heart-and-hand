const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    address: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipCode: {
        type: String,
        required: true,
      },
    },
    emergencyContact: {
      name: {
        type: String,
        required: true,
      },
      relationship: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
    },
    medicalConditions: [
      {
        condition: String,
        details: String,
        dateIdentified: Date,
      },
    ],
    medications: [
      {
        name: String,
        dosage: String,
        frequency: String,
        instructions: String,
      },
    ],
    allergies: [String],
    careNeeds: [
      {
        type: String,
        enum: [
          "Personal Care",
          "Medication Management",
          "Mobility Assistance",
          "Meal Preparation",
          "Housekeeping",
          "Transportation",
          "Companionship",
          "Other",
        ],
      },
    ],
    careSchedule: {
      preferredTimes: [
        {
          day: {
            type: String,
            enum: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ],
          },
          timeSlot: {
            type: String,
            enum: ["Morning", "Afternoon", "Evening", "Night"],
          },
        },
      ],
      frequency: {
        type: String,
        enum: ["Daily", "Weekly", "Bi-Weekly", "Monthly", "Custom"],
      },
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Pending", "OnHold"],
      default: "Pending",
    },
    assignedCaregivers: [
      {
        caregiver: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        assignedDate: {
          type: Date,
          default: Date.now,
        },
        primary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    notes: [
      {
        content: String,
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Client", clientSchema);
