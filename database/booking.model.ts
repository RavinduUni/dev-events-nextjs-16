import mongoose, { Document, Model, Schema, Types } from "mongoose";
import Event from "./event.model";

// TypeScript interface for Booking document
export interface IBooking extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define the Booking schema
const bookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event ID is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      validate: {
        validator: (email: string) => {
          // RFC 5322 compliant email regex
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email);
        },
        message: "Please provide a valid email address",
      },
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
  }
);

// Pre-save hook: Verify that the referenced event exists
bookingSchema.pre("save", async function () {
  // Only validate eventId if it's new or has been modified
  if (this.isNew || this.isModified("eventId")) {
    const eventExists = await Event.findById(this.eventId);
    
    if (!eventExists) {
      throw new Error(`Event with ID ${this.eventId} does not exist`);
    }
  }
});

// Create index on eventId for faster queries
bookingSchema.index({ eventId: 1 });

// Create compound index for finding bookings by event and email
bookingSchema.index({ eventId: 1, email: 1 });

// Create and export the Booking model
// Use existing model if already compiled, otherwise create new one
const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>("Booking", bookingSchema);

export default Booking;
