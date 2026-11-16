/** Corpo de login/mfa-login/refresh. O refresh token não vem aqui: chega só no cookie HttpOnly `workbox_refresh`. */
export interface IAuthResponse {
  access_token?: string;
  accessToken?: string;
  mfa_required?: boolean;
  mfaRequired?: boolean;
  mfa_token?: string;
  mfaToken?: string;
}
