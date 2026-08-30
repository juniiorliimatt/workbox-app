import { IUser } from './IUser';
import { IUserApiRegisterDTO } from './IUserApiRegisterDTO';

export interface IAuthContext {
  accessToken: string | null;
  user: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mfaRequired: boolean;
  mfaToken: string | null;
  login: (username: string, password: string) => Promise<void>;
  loginMfa: (code: string) => Promise<void>;
  registerUser: (dto: IUserApiRegisterDTO) => Promise<IUser>;
  refresh: () => Promise<string | null>;
  logout: () => Promise<void>;
}
