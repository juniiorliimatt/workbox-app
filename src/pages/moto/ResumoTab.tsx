import { FC } from 'react';
import { IMotorcycle } from '@/interfaces/moto';

export interface ResumoTabProps {
  motorcycle: IMotorcycle;
  /** Só a aba visível busca dados. */
  active: boolean;
  /** Muda quando outro lugar alterou abastecimentos, trocas ou hodômetro: força recarregar as métricas. */
  refreshKey: number;
  /** Avisa que o hodômetro mudou (o diálogo "Atualizar km" grava uma leitura avulsa). */
  onChanged: () => void;
}

const ResumoTab: FC<ResumoTabProps> = () => null;

export default ResumoTab;
