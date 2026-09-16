export interface IUser {
  id: string;
  email: string;
  socialName: string;
  enabled: boolean;
  avatarUrl?: string | null;
  roles?: string[];
}
