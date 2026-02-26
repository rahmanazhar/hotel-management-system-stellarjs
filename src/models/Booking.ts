import mongoose, { Document, Schema } from 'mongoose';
import { IRoom } from './Room';
import { ICustomer } from './Customer';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled';

export interface IBooking extends Document {
  _id: mongoose.Types.ObjectId;
  bookingReference: string;
  roomId: mongoose.Types.ObjectId | IRoom;
  customerId: mongoose.Types.ObjectId | ICustomer;
  checkIn: Date;
  checkOut: Date;
  status: BookingStatus;
  numberOfGuests: number;
  totalPrice: number;
  pricePerNight: number;
  notes: string;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    bookingReference: {
      type: String,
      unique: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required'],
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },
    checkOut: {
      type: Date,
      required: [true, 'Check-out date is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'],
      default: 'pending',
    },
    numberOfGuests: {
      type: Number,
      required: [true, 'Number of guests is required'],
      min: [1, 'Must have at least 1 guest'],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Total price cannot be negative'],
    },
    pricePerNight: {
      type: Number,
      required: true,
    },
    notes: {
      type: String,
      default: '',
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      maxlength: [300, 'Cancellation reason cannot exceed 300 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate booking reference before saving
bookingSchema.pre('save', function (next) {
  if (!this.bookingReference) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.bookingReference = `HMS-${timestamp}-${random}`;
  }
  next();
});

// Validate check-out is after check-in
bookingSchema.pre('save', function (next) {
  if (this.checkOut <= this.checkIn) {
    return next(new Error('Check-out date must be after check-in date'));
  }
  next();
});

bookingSchema.index({ customerId: 1, status: 1 });
bookingSchema.index({ roomId: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ bookingReference: 1 });

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
