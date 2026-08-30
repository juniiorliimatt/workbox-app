export interface ILoginAuditDTO {
  id?: string;
  email: string;
  successful: boolean;
  reason?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}
