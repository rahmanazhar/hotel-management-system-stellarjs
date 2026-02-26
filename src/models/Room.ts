import mongoose, { Document, Schema } from 'mongoose';

export type RoomType = 'single' | 'double' | 'twin' | 'suite' | 'deluxe' | 'presidential';
export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'reserved';

export interface IRoom extends Document {
  _id: mongoose.Types.ObjectId;
  number: string;
  type: RoomType;
  status: RoomStatus;
  floor: number;
  capacity: number;
  pricePerNight: number;
  amenities: string[];
  description: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    number: {
      type: String,
      required: [true, 'Room number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ['single', 'double', 'twin', 'suite', 'deluxe', 'presidential'],
      required: [true, 'Room type is required'],
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance', 'reserved'],
      default: 'available',
    },
    floor: {
      type: Number,
      required: [true, 'Floor is required'],
      min: [1, 'Floor must be at least 1'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [10, 'Capacity cannot exceed 10'],
    },
    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required'],
      min: [0, 'Price cannot be negative'],
    },
    amenities: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    images: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

roomSchema.index({ status: 1, type: 1 });
roomSchema.index({ pricePerNight: 1 });

export const Room = mongoose.model<IRoom>('Room', roomSchema);
