import { IRoleDTO } from './IRoleDTO';

export interface IUserAdminDTO {
  id?: string;
  socialName: string;
  email: string;
  password?: string;
  isEnabled?: boolean;
  enabled?: boolean;
  avatarUrl?: string | null;
  roles?: IRoleDTO[];
}
