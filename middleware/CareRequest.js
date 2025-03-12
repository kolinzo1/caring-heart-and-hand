const mongoose = require("mongoose");

const careRequestSchema = new mongoose.Schema(
  {
    // Personal Information
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: String,
    city: String,
    state: String,
    zipCode: String,

    // Care Details
    careType: { type: String, required: true },
    startDate: { type: String, required: true },
    frequency: { type: String, required: true },
    preferredTime: String,

    // Care Recipient
    recipientName: { type: String, required: true },
    recipientAge: { type: String, required: true },
    recipientRelation: String,
    mobilityStatus: { type: String, required: true },
    medicalConditions: String,

    // Additional Notes
    specificNeeds: String,
    additionalNotes: String,
    
    // Status
    status: {
      type: String,
      enum: ["new", "contacted", "scheduled", "declined"],
      default: "new"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("CareRequest", careRequestSchema);