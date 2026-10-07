import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OleoTab from '@/pages/moto/OleoTab';
import { IOilStatus } from '@/interfaces/moto';
import { MOTO_ID, OIL_INTERVALS, makeMotorcycle, makeOilChange, makeOilStatus, plain, renderMoto, routeGet } from './helpers';

const { mockApi } = vi.hoisted(() => ({ mockApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));

// Os fluxos de diálogo digitam em vários campos MUI; com a suíte inteira em paralelo passam do limite padrão de 5 s.
vi.setConfig({ testTimeout: 20_000 });

const BASE = `/api/v1/motorcycles/${MOTO_ID}`;
const MOTO = makeMotorcycle();
const TODAY = dayjs().format('YYYY-MM-DD');
const onChanged = vi.fn();

const problem = (detail: string) => Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status: 400, data: { detail } } });

const NEVER_CHANGED: IOilStatus = {
  lastChange: null,
  currentOdometerKm: 1000,
  dueDate: null,
  dueKm: null,
  kmRemaining: null,
  daysRemaining: null,
  level: null,
  limitedBy: null,
};

const mockData = (status: IOilStatus = makeOilStatus(), changes = status.lastChange ? [status.lastChange] : []) =>
  routeGet(mockApi.get, { [`${BASE}/oil-status`]: status, [`${BASE}/oil-changes`]: changes, '/api/v1/oil-intervals': OIL_INTERVALS });

const renderTab = (active = true, refreshKey = 0) =>
  renderMoto(<OleoTab motorcycle={MOTO} active={active} refreshKey={refreshKey} onChanged={onChanged} />);

const openForm = async (user: ReturnType<typeof userEvent.setup>, name = /Registrar troca/i) => {
  await user.click(await screen.findByRole('button', { name }));
  return within(await screen.findByRole('dialog'));
};

describe('Moto · aba Óleo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData();
  });

  it('não busca nada enquanto a aba está oculta; ativa, busca status, trocas e intervalos padrão', async () => {
    const { rerenderUi } = renderTab(false);
    expect(mockApi.get).not.toHaveBeenCalled();

    rerenderUi(<OleoTab motorcycle={MOTO} active refreshKey={0} onChanged={onChanged} />);

    await waitFor(() => expect(mockApi.get.mock.calls.map((c) => c[0]).sort()).toEqual([`${BASE}/oil-changes`, `${BASE}/oil-status`, '/api/v1/oil-intervals']));
  });

  it('recarrega quando outra aba muda o hodômetro (refreshKey)', async () => {
    const { rerenderUi } = renderTab(true, 0);
    await screen.findByText('Em dia');
    const before = mockApi.get.mock.calls.filter((c) => c[0] === `${BASE}/oil-status`).length;

    rerenderUi(<OleoTab motorcycle={MOTO} active refreshKey={1} onChanged={onChanged} />);

    await waitFor(() => expect(mockApi.get.mock.calls.filter((c) => c[0] === `${BASE}/oil-status`).length).toBe(before + 1));
  });

  describe('card da próxima troca', () => {
    it('em dia: mostra o vencimento por km e por tempo, o limitante e as duas barras de progresso', async () => {
      renderTab();

      expect(await screen.findByText('Em dia')).toBeInTheDocument();
      expect(screen.getByText('Próxima troca em 24.000 km ou até 01/12/2026, o que vier primeiro.')).toBeInTheDocument();
      expect(screen.getByText('Faltam 1.000 km')).toBeInTheDocument();
      expect(screen.getByText('Faltam 122 dias')).toBeInTheDocument();
      expect(screen.getByText('Vence primeiro por km')).toBeInTheDocument();
      expect(screen.getByText('Hodômetro atual: 23.000 km')).toBeInTheDocument();
      expect(screen.getByRole('progressbar', { name: 'Progresso por km' })).toHaveAttribute('aria-valuenow', '75');
      expect(screen.getByRole('progressbar', { name: 'Progresso por tempo' })).toHaveAttribute('aria-valuenow', '33');
    });

    it('perto: alerta de atenção em texto', async () => {
      mockData(makeOilStatus({ level: 'PERTO', kmRemaining: 400, currentOdometerKm: 23600 }));

      renderTab();

      const alert = await screen.findByRole('alert');
      expect(within(alert).getByText('Troca próxima')).toBeInTheDocument();
      expect(screen.getByText('Faltam 400 km')).toBeInTheDocument();
    });

    it('vencida por km: valores negativos viram "vencida há" e a barra trava em 100%', async () => {
      mockData(makeOilStatus({ level: 'VENCIDA', kmRemaining: -100, currentOdometerKm: 24100, daysRemaining: 60 }));

      renderTab();

      const alert = await screen.findByRole('alert');
      expect(within(alert).getByText('Troca vencida')).toBeInTheDocument();
      expect(screen.getByText('Vencida há 100 km')).toBeInTheDocument();
      expect(screen.getByRole('progressbar', { name: 'Progresso por km' })).toHaveAttribute('aria-valuenow', '100');
    });

    it('vencida por tempo: "vencida há 1 dia" (singular) e limitante é o tempo', async () => {
      mockData(makeOilStatus({ level: 'VENCIDA', daysRemaining: -1, limitedBy: 'TIME', kmRemaining: 3000, currentOdometerKm: 21000 }));

      renderTab();

      expect(await screen.findByText('Vencida há 1 dia')).toBeInTheDocument();
      expect(screen.getByText('Vence primeiro por tempo')).toBeInTheDocument();
      expect(screen.getByRole('progressbar', { name: 'Progresso por tempo' })).toHaveAttribute('aria-valuenow', '100');
    });

    it('sem nenhuma troca registrada: mostra o hodômetro atual e convida a registrar a primeira', async () => {
      const user = userEvent.setup();
      mockData(NEVER_CHANGED, []);

      renderTab();

      expect(await screen.findByText('Nenhuma troca registrada')).toBeInTheDocument();
      expect(screen.getByText('Hodômetro atual: 1.000 km')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar', { name: /Progresso/ })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Registrar primeira troca' }));

      expect(await screen.findByRole('dialog', { name: 'Registrar troca de óleo' })).toBeInTheDocument();
    });

    it('falha ao carregar: alerta com "Tentar novamente"', async () => {
      const user = userEvent.setup();
      mockApi.get.mockRejectedValueOnce(new Error('boom'));
      renderTab();

      expect(await screen.findByText('Não foi possível carregar os dados do óleo.')).toBeInTheDocument();
      mockData();
      await user.click(screen.getByRole('button', { name: /Tentar novamente/i }));

      expect(await screen.findByText('Em dia')).toBeInTheDocument();
    });
  });

  describe('histórico', () => {
    it('lista as trocas com tipo, marca, intervalo e custo', async () => {
      const older = makeOilChange({ id: 'old', date: '2026-01-10', odometerKm: 15000, oilType: 'MINERAL', brand: null, viscosity: null, cost: null, intervalKm: 1500, intervalMonths: 6 });
      mockData(makeOilStatus(), [makeOilChange(), older]);

      renderTab();

      const table = await screen.findByRole('table', { name: 'Histórico de trocas de óleo' });
      const rows = within(table).getAllByRole('row');
      const first = within(rows[1]);
      expect(first.getByText('01/06/2026')).toBeInTheDocument();
      expect(first.getByText('20.000 km')).toBeInTheDocument();
      expect(first.getByText('Semissintético · Motul 10W-40')).toBeInTheDocument();
      expect(first.getByText('4.000 km / 6 meses')).toBeInTheDocument();
      expect(plain(first.getByText(/R\$\s85,00/).textContent)).toBe('R$ 85,00');
      const second = within(rows[2]);
      expect(second.getByText('Mineral')).toBeInTheDocument();
      expect(second.getByText('1.500 km / 6 meses')).toBeInTheDocument();
    });
  });

  describe('formulário', () => {
    it('abre com hodômetro atual e o intervalo padrão do tipo de óleo, ambos editáveis', async () => {
      const user = userEvent.setup();
      renderTab();
      const form = await openForm(user);

      expect(form.getByLabelText(/^Hodômetro/)).toHaveValue('23000');
      expect(form.getByLabelText(/^Intervalo \(km\)/)).toHaveValue('4000');
      expect(form.getByLabelText(/^Intervalo \(meses\)/)).toHaveValue('6');
      expect(form.getByText(/Sugerido: 3\.000 a 4\.000 km/)).toBeInTheDocument();
    });

    it('trocar o tipo de óleo preenche o intervalo padrão dele', async () => {
      const user = userEvent.setup();
      renderTab();
      const form = await openForm(user);

      await user.click(form.getByRole('combobox', { name: /Tipo de óleo/ }));
      await user.click(await screen.findByRole('option', { name: 'Sintético' }));

      expect(form.getByLabelText(/^Intervalo \(km\)/)).toHaveValue('6000');
      expect(form.getByLabelText(/^Intervalo \(meses\)/)).toHaveValue('12');
      expect(form.getByText(/Sugerido: 5\.000 a 6\.000 km/)).toBeInTheDocument();
    });

    it.each([
      ['Intervalo (km)', '0', 'Intervalo em km deve ser maior que zero'],
      ['Intervalo (km)', '', 'Intervalo em km é obrigatório'],
      ['Intervalo (meses)', '0', 'Intervalo em meses deve ser maior que zero'],
      ['Hodômetro', '-1', 'Hodômetro não pode ser negativo'],
      ['Custo', '-3', 'Custo inválido'],
    ])('valida %s = "%s"', async (label, value, message) => {
      const user = userEvent.setup();
      renderTab();
      const form = await openForm(user);
      const field = form.getByLabelText(new RegExp(`^${label.replace(/[()]/g, '\\$&')}`));
      await user.clear(field);
      if (value) await user.type(field, value);

      await user.click(form.getByRole('button', { name: 'Salvar' }));

      expect(await form.findByText(message)).toBeInTheDocument();
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('registra a troca, avisa, recarrega e notifica a página', async () => {
      const user = userEvent.setup();
      mockApi.post.mockResolvedValue({ data: makeOilChange() });
      renderTab();
      const form = await openForm(user);

      await user.type(form.getByLabelText(/^Marca/), ' Motul ');
      await user.type(form.getByLabelText(/^Viscosidade/), '10W-40');
      await user.type(form.getByLabelText(/^Custo/), '85,50');
      await user.click(form.getByRole('button', { name: 'Salvar' }));

      await waitFor(() =>
        expect(mockApi.post).toHaveBeenCalledWith(`${BASE}/oil-changes`, {
          date: TODAY,
          odometerKm: 23000,
          oilType: 'SEMI_SYNTHETIC',
          brand: 'Motul',
          viscosity: '10W-40',
          cost: 85.5,
          intervalKm: 4000,
          intervalMonths: 6,
        }),
      );
      expect(await screen.findByText('Troca de óleo registrada!')).toBeInTheDocument();
      expect(onChanged).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(mockApi.get.mock.calls.filter((c) => c[0] === `${BASE}/oil-status`).length).toBe(2));
    });

    it('erro da API (ex.: hodômetro fora de ordem) mostra o motivo e mantém o diálogo aberto', async () => {
      const user = userEvent.setup();
      mockApi.post.mockRejectedValue(problem('Hodômetro (100 km) abaixo do hodômetro inicial da moto (1000 km)'));
      renderTab();
      const form = await openForm(user);
      await user.clear(form.getByLabelText(/^Hodômetro/));
      await user.type(form.getByLabelText(/^Hodômetro/), '100');

      await user.click(form.getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByText('Erro: Hodômetro (100 km) abaixo do hodômetro inicial da moto (1000 km)')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('editar e excluir', () => {
    it('editar abre preenchido (sem sobrescrever o intervalo) e envia PUT com o id', async () => {
      const user = userEvent.setup();
      mockApi.put.mockResolvedValue({ data: makeOilChange() });
      mockData(makeOilStatus({ lastChange: makeOilChange({ intervalKm: 3500, intervalMonths: 8 }) }));
      renderTab();

      await user.click(await screen.findByRole('button', { name: 'Editar troca de óleo de 01/06/2026' }));
      const form = within(await screen.findByRole('dialog', { name: 'Editar troca de óleo' }));
      expect(form.getByLabelText(/^Hodômetro/)).toHaveValue('20000');
      expect(form.getByLabelText(/^Intervalo \(km\)/)).toHaveValue('3500');
      expect(form.getByLabelText(/^Intervalo \(meses\)/)).toHaveValue('8');
      expect(form.getByLabelText(/^Marca/)).toHaveValue('Motul');

      await user.clear(form.getByLabelText(/^Intervalo \(km\)/));
      await user.type(form.getByLabelText(/^Intervalo \(km\)/), '3000');
      await user.click(form.getByRole('button', { name: 'Salvar' }));

      await waitFor(() =>
        expect(mockApi.put).toHaveBeenCalledWith(
          `${BASE}/oil-changes/${makeOilChange().id}`,
          expect.objectContaining({ date: '2026-06-01', odometerKm: 20000, intervalKm: 3000, intervalMonths: 8 }),
        ),
      );
      expect(await screen.findByText('Troca de óleo atualizada!')).toBeInTheDocument();
    });

    it('excluir pede confirmação e só então chama a API', async () => {
      const user = userEvent.setup();
      mockApi.delete.mockResolvedValue({ data: undefined });
      renderTab();

      await user.click(await screen.findByRole('button', { name: 'Excluir troca de óleo de 01/06/2026' }));
      expect(mockApi.delete).not.toHaveBeenCalled();
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar' }));

      await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith(`${BASE}/oil-changes/${makeOilChange().id}`));
      expect(await screen.findByText('Troca de óleo excluída!')).toBeInTheDocument();
      expect(onChanged).toHaveBeenCalled();
    });

    it('falha ao excluir mostra o erro', async () => {
      const user = userEvent.setup();
      mockApi.delete.mockRejectedValue(new Error('rede'));
      renderTab();

      await user.click(await screen.findByRole('button', { name: 'Excluir troca de óleo de 01/06/2026' }));
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar' }));

      expect(await screen.findByText('Erro ao excluir troca de óleo')).toBeInTheDocument();
    });
  });
});
