import { Request, Response } from 'express';
import { Customer } from '../models/Customer';
import { User } from '../models/User';

export async function getAllCustomers(req: Request, res: Response): Promise<void> {
  try {
    const { search, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { idNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .populate('userId', 'name email role isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Customer.countDocuments(filter),
    ]);

    res.json({
      data: customers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch customers', details: error.message });
  }
}

export async function getCustomerById(req: Request, res: Response): Promise<void> {
  try {
    const authUser = (req as any).user;
    const { id } = req.params;

    const customer = await Customer.findById(id).populate('userId', 'name email role isActive createdAt');
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Customers can only view their own profile
    if (authUser.roles.includes('customer')) {
      const userId = (customer.userId as any)._id?.toString() || customer.userId.toString();
      if (userId !== authUser.id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    res.json({ data: customer });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch customer', details: error.message });
  }
}

export async function getMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const authUser = (req as any).user;
    const customer = await Customer.findOne({ userId: authUser.id }).populate(
      'userId',
      'name email role createdAt'
    );

    if (!customer) {
      res.status(404).json({ error: 'Customer profile not found' });
      return;
    }

    res.json({ data: customer });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }
}

export async function createCustomer(req: Request, res: Response): Promise<void> {
  try {
    const {
      userId,
      firstName,
      lastName,
      phone,
      address,
      nationality,
      idType,
      idNumber,
      dateOfBirth,
    } = req.body;

    if (!userId || !firstName || !lastName || !phone) {
      res.status(400).json({ error: 'userId, firstName, lastName and phone are required' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const existing = await Customer.findOne({ userId });
    if (existing) {
      res.status(409).json({ error: 'Customer profile already exists for this user' });
      return;
    }

    const customer = await Customer.create({
      userId,
      firstName,
      lastName,
      phone,
      address: address || {},
      nationality: nationality || '',
      idType: idType || 'passport',
      idNumber: idNumber || '',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    });

    res.status(201).json({ message: 'Customer created successfully', data: customer });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create customer', details: error.message });
  }
}

export async function updateCustomer(req: Request, res: Response): Promise<void> {
  try {
    const authUser = (req as any).user;
    const { id } = req.params;

    const customer = await Customer.findById(id);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Customers can only update their own profile
    if (authUser.roles.includes('customer') && customer.userId.toString() !== authUser.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { firstName, lastName, phone, address, nationality, idType, idNumber, dateOfBirth } =
      req.body;

    const updates: Record<string, any> = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (nationality !== undefined) updates.nationality = nationality;
    if (idType !== undefined) updates.idType = idType;
    if (idNumber !== undefined) updates.idNumber = idNumber;
    if (dateOfBirth !== undefined) updates.dateOfBirth = new Date(dateOfBirth);

    const updated = await Customer.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate('userId', 'name email role');

    res.json({ message: 'Customer updated successfully', data: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update customer', details: error.message });
  }
}

export async function deleteCustomer(req: Request, res: Response): Promise<void> {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Also deactivate the associated user account
    await User.findByIdAndUpdate(customer.userId, { isActive: false });
    await Customer.findByIdAndDelete(req.params.id);

    res.json({ message: 'Customer deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete customer', details: error.message });
  }
}
