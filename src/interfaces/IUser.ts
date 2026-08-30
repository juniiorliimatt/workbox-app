export interface IUser {
  id: string;
  email: string;
  socialName: string;
  enabled: boolean;
  roles?: string[];
}
