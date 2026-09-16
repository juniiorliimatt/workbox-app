export interface IRoleRevisionDTO {
  revision: number;
  revisionType: 'ADD' | 'MOD' | 'DEL' | string;
  changedAt: string;
  changedBy?: string | null;
  id: number;
  authority: string;
  deletedAt?: string | null;
}
