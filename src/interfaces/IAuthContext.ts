import { IUser } from './IUser';
import { IUserApiRegisterDTO } from './IUserApiRegisterDTO';
import { IMfaEnrollResponse } from './IMfaEnrollResponse';

export interface IAuthContext {
  accessToken: string | null;
  user: IUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  mfaRequired: boolean;
  mfaToken: string | null;
  login: (username: string, password: string) => Promise<void>;
  loginMfa: (code: string) => Promise<void>;
  registerUser: (dto: IUserApiRegisterDTO) => Promise<IUser>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  enrollMfa: () => Promise<IMfaEnrollResponse>;
  verifyMfa: (code: string) => Promise<void>;
  disableMfa: (code: string) => Promise<void>;
  refresh: () => Promise<string | null>;
  logout: () => Promise<void>;
}
