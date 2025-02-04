const mongoose = require("mongoose");

const timeLogSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // Duration in minutes
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
    tasksCompleted: [
      {
        task: String,
        completed: Boolean,
        notes: String,
      },
    ],
    medications: [
      {
        name: String,
        administered: Boolean,
        time: String,
        notes: String,
      },
    ],
    clientCondition: {
      type: String,
      enum: ["Good", "Fair", "Poor", "Critical"],
      required: true,
    },
    notes: String,
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvalDate: Date,
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Create a geospatial index on the location field
timeLogSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("TimeLog", timeLogSchema);
