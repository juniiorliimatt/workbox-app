export interface IUser {
  id: string;
  email: string;
  socialName: string;
  enabled: boolean;
  avatarUrl?: string | null;
  roles?: string[];
  /** Códigos dos módulos liberados (FINANCAS, FORZA...) — vem de /auth/me; ADMIN recebe todos. */
  modules?: string[];
}
