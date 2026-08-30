export interface IAuthResponse {
  access_token?: string;
  refresh_token?: string;
  mfa_required?: boolean;
  mfa_token?: string;
}
