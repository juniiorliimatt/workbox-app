export interface IUser {
  id: string;
  username: string;
  email: string | null;
  enabled: boolean;
  roles?: string[];
}
