export interface IUserApiRevisionDTO {
  revision: number;
  revisionType: 'ADD' | 'MOD' | 'DEL' | string;
  changedAt: string;
  changedBy?: string | null;
  id: string;
  socialName?: string | null;
  email?: string | null;
  enabled?: boolean | null;
  mfaEnabled?: boolean | null;
  deletedAt?: string | null;
}
