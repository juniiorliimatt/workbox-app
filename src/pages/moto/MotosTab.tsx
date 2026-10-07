import { FC } from 'react';
import { IMotorcycle } from '@/interfaces/moto';

export interface MotosTabProps {
  motos: IMotorcycle[];
  /** Avisa que a lista de motos mudou (cadastro, edição ou exclusão) para a página recarregá-la. */
  onChanged: () => void;
}

const MotosTab: FC<MotosTabProps> = () => null;

export default MotosTab;
