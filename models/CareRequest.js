const mongoose = require("mongoose");

const careRequestSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    careType: {
      type: String,
      required: true,
      enum: [
        "Personal Care",
        "Companion Care",
        "Nursing Care",
        "Respite Care",
        "Other",
      ],
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    frequency: {
      type: String,
      required: true,
      enum: ["24/7", "Daily", "Weekly", "Bi-Weekly", "Monthly", "Custom"],
    },
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
    specificNeeds: [String],
    status: {
      type: String,
      enum: ["Pending", "Approved", "Declined", "Completed", "Cancelled"],
      default: "Pending",
    },
    assignedCaregiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: String,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewDate: Date,
    reviewNotes: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CareRequest", careRequestSchema);
