import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface ICustomer extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId | IUser;
  firstName: string;
  lastName: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  nationality: string;
  idType: 'passport' | 'national_id' | 'driving_license';
  idNumber: string;
  dateOfBirth: Date;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      zipCode: { type: String, default: '' },
    },
    nationality: {
      type: String,
      default: '',
    },
    idType: {
      type: String,
      enum: ['passport', 'national_id', 'driving_license'],
      default: 'passport',
    },
    idNumber: {
      type: String,
      default: '',
    },
    dateOfBirth: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({ userId: 1 });

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
