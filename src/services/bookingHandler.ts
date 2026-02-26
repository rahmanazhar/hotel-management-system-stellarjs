import { Request, Response } from 'express';
import { Booking, BookingStatus } from '../models/Booking';
import { Room } from '../models/Room';
import { Customer } from '../models/Customer';

function calcNights(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

async function isRoomAvailable(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const filter: Record<string, any> = {
    roomId,
    status: { $in: ['pending', 'confirmed', 'checked_in'] },
    $or: [{ checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } }],
  };
  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }
  const conflict = await Booking.findOne(filter);
  return !conflict;
}

export async function getAllBookings(req: Request, res: Response): Promise<void> {
  try {
    const authUser = (req as any).user;
    const {
      status,
      customerId,
      roomId,
      checkIn,
      checkOut,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};

    // Customers only see their own bookings
    if (authUser.roles.includes('customer')) {
      const customerProfile = await Customer.findOne({ userId: authUser.id });
      if (!customerProfile) {
        res.json({ data: [], pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 } });
        return;
      }
      filter.customerId = customerProfile._id;
    } else {
      if (customerId) filter.customerId = customerId;
      if (roomId) filter.roomId = roomId;
    }

    if (status) filter.status = status;
    if (checkIn) filter.checkIn = { $gte: new Date(checkIn as string) };
    if (checkOut) filter.checkOut = { $lte: new Date(checkOut as string) };

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('roomId', 'number type floor pricePerNight status')
        .populate({
          path: 'customerId',
          select: 'firstName lastName phone',
          populate: { path: 'userId', select: 'name email' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(filter),
    ]);

    res.json({
      data: bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch bookings', details: error.message });
  }
}

export async function getBookingById(req: Request, res: Response): Promise<void> {
  try {
    const authUser = (req as any).user;
    const booking = await Booking.findById(req.params.id)
      .populate('roomId', 'number type floor pricePerNight amenities description')
      .populate({
        path: 'customerId',
        select: 'firstName lastName phone nationality idType idNumber',
        populate: { path: 'userId', select: 'name email' },
      });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    // Customers can only view their own bookings
    if (authUser.roles.includes('customer')) {
      const customerProfile = await Customer.findOne({ userId: authUser.id });
      if (!customerProfile || booking.customerId.toString() !== customerProfile._id.toString()) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    res.json({ data: booking });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch booking', details: error.message });
  }
}

export async function createBooking(req: Request, res: Response): Promise<void> {
  try {
    const authUser = (req as any).user;
    const { roomId, customerId, checkIn, checkOut, numberOfGuests, notes } = req.body;

    if (!roomId || !checkIn || !checkOut || !numberOfGuests) {
      res.status(400).json({ error: 'roomId, checkIn, checkOut and numberOfGuests are required' });
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkOutDate <= checkInDate) {
      res.status(400).json({ error: 'checkOut must be after checkIn' });
      return;
    }

    if (checkInDate < new Date()) {
      res.status(400).json({ error: 'checkIn cannot be in the past' });
      return;
    }

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (room.status === 'maintenance') {
      res.status(409).json({ error: 'Room is under maintenance' });
      return;
    }

    if (Number(numberOfGuests) > room.capacity) {
      res.status(400).json({ error: `Room capacity is ${room.capacity} guests maximum` });
      return;
    }

    // Determine customer ID
    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId) {
      // Use the authenticated user's customer profile
      const customerProfile = await Customer.findOne({ userId: authUser.id });
      if (!customerProfile) {
        res.status(400).json({ error: 'Customer profile not found. Provide customerId or create a profile first.' });
        return;
      }
      resolvedCustomerId = customerProfile._id.toString();
    }

    const customer = await Customer.findById(resolvedCustomerId);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Check availability
    const available = await isRoomAvailable(roomId, checkInDate, checkOutDate);
    if (!available) {
      res.status(409).json({ error: 'Room is not available for the selected dates' });
      return;
    }

    const nights = calcNights(checkInDate, checkOutDate);
    const totalPrice = nights * room.pricePerNight;

    const booking = await Booking.create({
      roomId,
      customerId: resolvedCustomerId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      numberOfGuests: Number(numberOfGuests),
      totalPrice,
      pricePerNight: room.pricePerNight,
      notes: notes || '',
      status: 'pending',
    });

    const populated = await Booking.findById(booking._id)
      .populate('roomId', 'number type floor pricePerNight')
      .populate('customerId', 'firstName lastName phone');

    res.status(201).json({ message: 'Booking created successfully', data: populated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
}

export async function updateBookingStatus(req: Request, res: Response): Promise<void> {
  try {
    const authUser = (req as any).user;
    const { id } = req.params;
    const { status, cancellationReason, notes } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    // Customers can only cancel their own bookings
    if (authUser.roles.includes('customer')) {
      const customerProfile = await Customer.findOne({ userId: authUser.id });
      if (!customerProfile || booking.customerId.toString() !== customerProfile._id.toString()) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      if (status !== 'cancelled') {
        res.status(403).json({ error: 'Customers can only cancel bookings' });
        return;
      }
    }

    const validStatuses: BookingStatus[] = [
      'pending',
      'confirmed',
      'checked_in',
      'checked_out',
      'cancelled',
    ];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Valid: ${validStatuses.join(', ')}` });
      return;
    }

    // Validate status transitions
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['checked_in', 'cancelled'],
      checked_in: ['checked_out'],
      checked_out: [],
      cancelled: [],
    };

    if (!validTransitions[booking.status].includes(status)) {
      res.status(400).json({
        error: `Cannot transition from '${booking.status}' to '${status}'`,
      });
      return;
    }

    const updates: Record<string, any> = { status };
    if (notes !== undefined) updates.notes = notes;
    if (status === 'cancelled') {
      updates.cancelledAt = new Date();
      updates.cancellationReason = cancellationReason || 'No reason provided';
    }

    // Update room status based on booking status
    if (status === 'checked_in') {
      await Room.findByIdAndUpdate(booking.roomId, { status: 'occupied' });
    } else if (status === 'checked_out' || status === 'cancelled') {
      await Room.findByIdAndUpdate(booking.roomId, { status: 'available' });
    }

    const updated = await Booking.findByIdAndUpdate(id, updates, { new: true })
      .populate('roomId', 'number type floor pricePerNight')
      .populate('customerId', 'firstName lastName phone');

    res.json({ message: `Booking status updated to '${status}'`, data: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update booking', details: error.message });
  }
}

export async function deleteBooking(req: Request, res: Response): Promise<void> {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (['confirmed', 'checked_in'].includes(booking.status)) {
      res.status(409).json({
        error: 'Cannot delete an active booking. Cancel it first.',
      });
      return;
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: 'Booking deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete booking', details: error.message });
  }
}

export async function getBookingStats(req: Request, res: Response): Promise<void> {
  try {
    const [statusCounts, revenueData] = await Promise.all([
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Booking.aggregate([
        { $match: { status: { $in: ['confirmed', 'checked_in', 'checked_out'] } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' }, count: { $sum: 1 } } },
      ]),
    ]);

    const stats: Record<string, number> = {};
    statusCounts.forEach((item) => {
      stats[item._id] = item.count;
    });

    res.json({
      data: {
        byStatus: stats,
        revenue: revenueData[0] || { totalRevenue: 0, count: 0 },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
}
