import { FC } from 'react';
import { IMotorcycle } from '@/interfaces/moto';

export interface AbastecimentosTabProps {
  motorcycle: IMotorcycle;
  /** Só a aba visível busca dados. */
  active: boolean;
  /** Avisa que um abastecimento mudou (o hodômetro atual, o consumo e a próxima troca dependem dele). */
  onChanged: () => void;
}

const AbastecimentosTab: FC<AbastecimentosTabProps> = () => null;

export default AbastecimentosTab;
