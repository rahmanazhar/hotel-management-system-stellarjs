import { Request, Response } from 'express';
import { Room, RoomStatus, RoomType } from '../models/Room';
import { Booking } from '../models/Booking';

export async function getAllRooms(req: Request, res: Response): Promise<void> {
  try {
    const { status, type, minPrice, maxPrice, floor, capacity, page = '1', limit = '20' } = req.query;

    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (floor) filter.floor = Number(floor);
    if (capacity) filter.capacity = { $gte: Number(capacity) };
    if (minPrice || maxPrice) {
      filter.pricePerNight = {};
      if (minPrice) filter.pricePerNight.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerNight.$lte = Number(maxPrice);
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [rooms, total] = await Promise.all([
      Room.find(filter).sort({ number: 1 }).skip(skip).limit(limitNum),
      Room.countDocuments(filter),
    ]);

    res.json({
      data: rooms,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch rooms', details: error.message });
  }
}

export async function getRoomById(req: Request, res: Response): Promise<void> {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json({ data: room });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch room', details: error.message });
  }
}

export async function createRoom(req: Request, res: Response): Promise<void> {
  try {
    const { number, type, floor, capacity, pricePerNight, amenities, description, images } = req.body;

    if (!number || !type || !floor || !capacity || !pricePerNight) {
      res.status(400).json({ error: 'number, type, floor, capacity and pricePerNight are required' });
      return;
    }

    const validTypes: RoomType[] = ['single', 'double', 'twin', 'suite', 'deluxe', 'presidential'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `Invalid room type. Valid types: ${validTypes.join(', ')}` });
      return;
    }

    const room = await Room.create({
      number: number.toUpperCase(),
      type,
      floor: Number(floor),
      capacity: Number(capacity),
      pricePerNight: Number(pricePerNight),
      amenities: amenities || [],
      description: description || '',
      images: images || [],
    });

    res.status(201).json({ message: 'Room created successfully', data: room });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ error: 'Room number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create room', details: error.message });
    }
  }
}

export async function updateRoom(req: Request, res: Response): Promise<void> {
  try {
    const { number, type, floor, capacity, pricePerNight, status, amenities, description, images } =
      req.body;

    const room = await Room.findById(req.params.id);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const validStatuses: RoomStatus[] = ['available', 'occupied', 'maintenance', 'reserved'];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Valid statuses: ${validStatuses.join(', ')}` });
      return;
    }

    const updates: Record<string, any> = {};
    if (number !== undefined) updates.number = number.toUpperCase();
    if (type !== undefined) updates.type = type;
    if (floor !== undefined) updates.floor = Number(floor);
    if (capacity !== undefined) updates.capacity = Number(capacity);
    if (pricePerNight !== undefined) updates.pricePerNight = Number(pricePerNight);
    if (status !== undefined) updates.status = status;
    if (amenities !== undefined) updates.amenities = amenities;
    if (description !== undefined) updates.description = description;
    if (images !== undefined) updates.images = images;

    const updated = await Room.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ message: 'Room updated successfully', data: updated });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ error: 'Room number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update room', details: error.message });
    }
  }
}

export async function deleteRoom(req: Request, res: Response): Promise<void> {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    // Check for active bookings
    const activeBooking = await Booking.findOne({
      roomId: room._id,
      status: { $in: ['pending', 'confirmed', 'checked_in'] },
    });

    if (activeBooking) {
      res.status(409).json({
        error: 'Cannot delete room with active bookings. Cancel all bookings first.',
      });
      return;
    }

    await Room.findByIdAndDelete(req.params.id);
    res.json({ message: 'Room deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete room', details: error.message });
  }
}

export async function getRoomAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      res.status(400).json({ error: 'checkIn and checkOut dates are required' });
      return;
    }

    const checkInDate = new Date(checkIn as string);
    const checkOutDate = new Date(checkOut as string);

    if (checkOutDate <= checkInDate) {
      res.status(400).json({ error: 'checkOut must be after checkIn' });
      return;
    }

    // Find rooms that have overlapping bookings
    const bookedRoomIds = await Booking.distinct('roomId', {
      status: { $in: ['pending', 'confirmed', 'checked_in'] },
      $or: [
        { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } },
      ],
    });

    const availableRooms = await Room.find({
      _id: { $nin: bookedRoomIds },
      status: 'available',
    }).sort({ pricePerNight: 1 });

    res.json({
      data: availableRooms,
      period: { checkIn: checkInDate, checkOut: checkOutDate },
      total: availableRooms.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to check availability', details: error.message });
  }
}
