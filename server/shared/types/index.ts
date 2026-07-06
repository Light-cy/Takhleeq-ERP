import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  currentUser?: {
    id: number;
    email: string;
    name: string;
    role: string;
    status: 'Active' | 'Inactive';
    permissions: string[];
  } | null;
}
