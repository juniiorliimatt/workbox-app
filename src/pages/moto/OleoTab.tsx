import { FC } from 'react';
import { IMotorcycle } from '@/interfaces/moto';

export interface OleoTabProps {
  motorcycle: IMotorcycle;
  /** Só a aba visível busca dados. */
  active: boolean;
  /** Muda quando outro lugar alterou o hodômetro (ex.: um abastecimento): força recarregar a próxima troca. */
  refreshKey: number;
  /** Avisa que uma troca de óleo mudou. */
  onChanged: () => void;
}

const OleoTab: FC<OleoTabProps> = () => null;

export default OleoTab;
