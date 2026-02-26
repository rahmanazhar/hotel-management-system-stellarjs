import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Customer } from '../models/Customer';

const JWT_SECRET = process.env.JWT_SECRET || 'hotel-stellar-super-secret-jwt-key-2024';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

function generateToken(user: IUser): string {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      roles: [user.role],
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION as jwt.SignOptions['expiresIn'] }
  );
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, role, firstName, lastName, phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email and password are required' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Only allow customer self-registration; admin/receptionist created by admin
    const assignedRole = role === 'admin' || role === 'receptionist' ? 'customer' : 'customer';

    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
    });

    // Create customer profile if registering as customer
    let customerProfile = null;
    if (firstName && lastName && phone) {
      customerProfile = await Customer.create({
        userId: user._id,
        firstName,
        lastName,
        phone,
      });
    }

    const token = generateToken(user);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      customer: customerProfile,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ error: 'Email already registered' });
    } else {
      res.status(500).json({ error: 'Registration failed', details: error.message });
    }
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user);

    // Fetch customer profile if exists
    const customerProfile = await Customer.findOne({ userId: user._id });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      customer: customerProfile,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const authUser = (req as any).user;
    const user = await User.findById(authUser.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const customerProfile = await Customer.findOne({ userId: user._id });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      customer: customerProfile,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }
}

// Middleware to authenticate token (used in route middleware arrays)
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Middleware factory for role-based access
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user || !user.roles) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    const hasRole = roles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      res.status(403).json({ error: `Access denied. Required roles: ${roles.join(', ')}` });
      return;
    }
    next();
  };
}

// Create admin user (used internally for seeding)
export async function createAdminUser(
  name: string,
  email: string,
  password: string
): Promise<IUser> {
  const existing = await User.findOne({ email });
  if (existing) return existing;
  return User.create({ name, email, password, role: 'admin' });
}
