import { IModuleDTO } from './IModuleDTO';

export interface IRoleDTO {
  id?: number;
  authority: string;
  module?: IModuleDTO | null;
}
