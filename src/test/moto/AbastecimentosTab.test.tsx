import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AbastecimentosTab from '@/pages/moto/AbastecimentosTab';
import { MOTO_ID, makeMotorcycle, makeRefueling, makeRefuelingPage, mockCompactViewport, plain, renderMoto, resetViewport } from './helpers';

const { mockApi } = vi.hoisted(() => ({ mockApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));

// Os fluxos de diálogo digitam em vários campos MUI; com a suíte inteira em paralelo passam do limite padrão de 5 s.
vi.setConfig({ testTimeout: 20_000 });

const URL = `/api/v1/motorcycles/${MOTO_ID}/refuelings`;
const MOTO = makeMotorcycle();
const TODAY = dayjs().format('YYYY-MM-DD');
const onChanged = vi.fn();

const problem = (detail: string) => Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status: 400, data: { detail } } });

const renderTab = (active = true) => renderMoto(<AbastecimentosTab motorcycle={MOTO} active={active} onChanged={onChanged} />);

/** Parâmetros da última chamada de listagem. */
const lastParams = () => mockApi.get.mock.calls.at(-1)?.[1]?.params;

const openNew = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: /Registrar abastecimento/i }));
  return within(await screen.findByRole('dialog'));
};

describe('Moto · aba Abastecimentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: makeRefuelingPage() });
  });

  it('não busca nada enquanto a aba está oculta e carrega quando ela fica ativa', async () => {
    const { rerenderUi } = renderTab(false);
    expect(mockApi.get).not.toHaveBeenCalled();

    rerenderUi(<AbastecimentosTab motorcycle={MOTO} active onChanged={onChanged} />);

    await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(1));
    expect(mockApi.get.mock.calls[0][0]).toBe(URL);
    expect(lastParams()).toEqual({ page: 0, size: 10 });
  });

  it('mostra o carregamento e depois as linhas formatadas', async () => {
    mockApi.get.mockResolvedValue({
      data: makeRefuelingPage([
        makeRefueling(),
        makeRefueling({ id: 'b', date: '2026-01-20', odometerKm: 1300, liters: 8, totalValue: 50, pricePerLiter: 6.25, fuelType: 'ETANOL', fullTank: true, station: null }),
      ]),
    });

    renderTab();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Abastecimentos' });
    const rows = within(table).getAllByRole('row');
    const first = within(rows[1]);
    expect(first.getByText('10/02/2026')).toBeInTheDocument();
    expect(first.getByText('1.500 km')).toBeInTheDocument();
    expect(first.getByText('5,00 L')).toBeInTheDocument();
    expect(plain(first.getByText(/R\$\s32,00/).textContent)).toBe('R$ 32,00');
    expect(plain(first.getByText(/6,40\/L/).textContent)).toBe('R$ 6,40/L');
    expect(first.getByText('Gasolina comum')).toBeInTheDocument();
    expect(first.getByText('Posto Shell')).toBeInTheDocument();
    expect(first.getByText('Parcial')).toBeInTheDocument();
    const second = within(rows[2]);
    expect(second.getByText('Tanque cheio')).toBeInTheDocument();
    expect(second.getByText('Etanol')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('sem abastecimentos mostra o estado vazio com a chamada para registrar', async () => {
    mockApi.get.mockResolvedValue({ data: makeRefuelingPage([]) });

    renderTab();

    expect(await screen.findByText('Nenhum abastecimento registrado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar abastecimento/i })).toBeInTheDocument();
  });

  it('falha ao carregar mostra alerta, avisa por snackbar e permite tentar de novo', async () => {
    const user = userEvent.setup();
    mockApi.get.mockRejectedValueOnce(new Error('boom'));

    renderTab();

    expect(await screen.findByText('Não foi possível carregar os abastecimentos.')).toBeInTheDocument();
    expect(await screen.findByText('Erro ao carregar abastecimentos')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Tentar novamente/i }));

    expect(await screen.findByRole('table', { name: 'Abastecimentos' })).toBeInTheDocument();
    expect(mockApi.get).toHaveBeenCalledTimes(2);
  });

  describe('filtro de período', () => {
    it('Mensal filtra pelo mês atual e dá pra trocar o mês', async () => {
      const user = userEvent.setup();
      renderTab();
      await screen.findByRole('table', { name: 'Abastecimentos' });

      await user.click(screen.getByRole('button', { name: 'Mensal' }));

      const now = dayjs();
      await waitFor(() =>
        expect(lastParams()).toEqual({
          from: now.startOf('month').format('YYYY-MM-DD'),
          to: now.endOf('month').format('YYYY-MM-DD'),
          page: 0,
          size: 10,
        }),
      );

      await user.click(screen.getByRole('combobox', { name: 'Mês' }));
      await user.click(await screen.findByRole('option', { name: 'Fevereiro' }));

      const feb = dayjs(`${now.year()}-02-01`);
      await waitFor(() =>
        expect(lastParams()).toEqual({
          from: feb.format('YYYY-MM-DD'),
          to: feb.endOf('month').format('YYYY-MM-DD'),
          page: 0,
          size: 10,
        }),
      );
    });

    it('Anual cobre o ano inteiro e Todos remove o período', async () => {
      const user = userEvent.setup();
      renderTab();
      await screen.findByRole('table', { name: 'Abastecimentos' });

      await user.click(screen.getByRole('button', { name: 'Anual' }));
      const year = dayjs().year();
      await waitFor(() => expect(lastParams()).toEqual({ from: `${year}-01-01`, to: `${year}-12-31`, page: 0, size: 10 }));

      await user.click(screen.getByRole('button', { name: 'Todos' }));
      await waitFor(() => expect(lastParams()).toEqual({ page: 0, size: 10 }));
    });

    it('com filtro ativo e sem resultado diz que não há abastecimento no período', async () => {
      const user = userEvent.setup();
      renderTab();
      await screen.findByRole('table', { name: 'Abastecimentos' });
      mockApi.get.mockResolvedValue({ data: makeRefuelingPage([]) });

      await user.click(screen.getByRole('button', { name: 'Anual' }));

      expect(await screen.findByText('Nenhum abastecimento neste período.')).toBeInTheDocument();
    });
  });

  describe('paginação', () => {
    it('Próxima página pede a página 1 e trocar o tamanho volta para a primeira', async () => {
      const user = userEvent.setup();
      mockApi.get.mockResolvedValue({ data: makeRefuelingPage([makeRefueling()], { totalElements: 25, totalPages: 3 }) });
      renderTab();
      await screen.findByRole('table', { name: 'Abastecimentos' });
      expect(screen.getByText('1–10 de 25')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Próxima página' }));
      await waitFor(() => expect(lastParams()).toEqual({ page: 1, size: 10 }));

      await user.click(await screen.findByRole('combobox', { name: /Por página/ }));
      await user.click(await screen.findByRole('option', { name: '20' }));
      await waitFor(() => expect(lastParams()).toEqual({ page: 0, size: 20 }));
    });
  });

  describe('formulário', () => {
    it('enviar vazio mostra os erros e não chama a API', async () => {
      const user = userEvent.setup();
      renderTab();
      const form = await openNew(user);

      await user.click(form.getByRole('button', { name: 'Salvar' }));

      expect(await form.findByText('Hodômetro é obrigatório')).toBeInTheDocument();
      expect(form.getByText('Litros é obrigatório')).toBeInTheDocument();
      expect(form.getByText('Valor é obrigatório')).toBeInTheDocument();
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it.each([
      ['Litros', '0', 'Litros deve ser maior que zero'],
      ['Valor total', '0', 'Valor deve ser maior que zero'],
      ['Hodômetro', '-5', 'Hodômetro não pode ser negativo'],
      ['Litros', 'abc', 'Litros inválido'],
    ])('valida %s = "%s"', async (label, value, message) => {
      const user = userEvent.setup();
      renderTab();
      const form = await openNew(user);
      await user.type(form.getByLabelText(/^Hodômetro/), '1500');
      await user.type(form.getByLabelText(/^Litros/), '5');
      await user.type(form.getByLabelText(/^Valor total/), '32');
      const field = form.getByLabelText(new RegExp(`^${label}`));
      await user.clear(field);
      await user.type(field, value);

      await user.click(form.getByRole('button', { name: 'Salvar' }));

      expect(await form.findByText(message)).toBeInTheDocument();
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('mostra o preço por litro enquanto digita', async () => {
      const user = userEvent.setup();
      renderTab();
      const form = await openNew(user);

      await user.type(form.getByLabelText(/^Litros/), '5');
      await user.type(form.getByLabelText(/^Valor total/), '32');

      expect(plain(form.getByText(/Preço por litro/).textContent)).toBe('Preço por litro: R$ 6,40/L');
    });

    it('registra o abastecimento com a data de hoje, avisa, recarrega a lista e notifica a página', async () => {
      const user = userEvent.setup();
      mockApi.post.mockResolvedValue({ data: makeRefueling() });
      renderTab();
      const form = await openNew(user);

      await user.type(form.getByLabelText(/^Hodômetro/), '1500');
      await user.type(form.getByLabelText(/^Litros/), '5,5');
      await user.type(form.getByLabelText(/^Valor total/), '35,20');
      await user.click(form.getByRole('button', { name: 'Salvar' }));

      await waitFor(() =>
        expect(mockApi.post).toHaveBeenCalledWith(URL, {
          date: TODAY,
          odometerKm: 1500,
          liters: 5.5,
          totalValue: 35.2,
          station: null,
          fuelType: 'GASOLINA_COMUM',
          fullTank: false,
        }),
      );
      expect(await screen.findByText('Abastecimento registrado!')).toBeInTheDocument();
      expect(onChanged).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('"Completei o tanque" é opcional, explica o efeito e envia fullTank', async () => {
      const user = userEvent.setup();
      mockApi.post.mockResolvedValue({ data: makeRefueling() });
      renderTab();
      const form = await openNew(user);
      expect(form.getByText('Marcar melhora a precisão do km/l; é opcional.')).toBeInTheDocument();

      await user.type(form.getByLabelText(/^Hodômetro/), '1500');
      await user.type(form.getByLabelText(/^Litros/), '5');
      await user.type(form.getByLabelText(/^Valor total/), '32');
      await user.type(form.getByLabelText(/^Posto/), '  Shell Centro ');
      await user.click(form.getByRole('checkbox', { name: /Completei o tanque/ }));
      await user.click(form.getByRole('combobox', { name: /Combustível/ }));
      await user.click(await screen.findByRole('option', { name: 'Etanol' }));
      await user.click(form.getByRole('button', { name: 'Salvar' }));

      await waitFor(() =>
        expect(mockApi.post).toHaveBeenCalledWith(
          URL,
          expect.objectContaining({ station: 'Shell Centro', fuelType: 'ETANOL', fullTank: true }),
        ),
      );
    });

    it('erro da API (ex.: hodômetro fora de ordem) mostra o motivo e mantém o diálogo aberto', async () => {
      const user = userEvent.setup();
      mockApi.post.mockRejectedValue(problem('Hodômetro (1400 km) menor que o registro de 2026-01-10 (1500 km)'));
      renderTab();
      const form = await openNew(user);
      await user.type(form.getByLabelText(/^Hodômetro/), '1400');
      await user.type(form.getByLabelText(/^Litros/), '5');
      await user.type(form.getByLabelText(/^Valor total/), '32');

      await user.click(form.getByRole('button', { name: 'Salvar' }));

      expect(
        await screen.findByText('Erro: Hodômetro (1400 km) menor que o registro de 2026-01-10 (1500 km)'),
      ).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(onChanged).not.toHaveBeenCalled();
    });
  });

  describe('layout compacto (celular)', () => {
    beforeEach(() => mockCompactViewport());
    afterEach(() => resetViewport());

    it('mostra cartões em vez da tabela, com todos os dados', async () => {
      mockApi.get.mockResolvedValue({
        data: makeRefuelingPage([makeRefueling(), makeRefueling({ id: 'b', date: '2026-01-20', odometerKm: 1300, fullTank: true, station: null, fuelType: 'ETANOL' })]),
      });

      renderTab();

      const list = await screen.findByRole('list', { name: 'Abastecimentos' });
      expect(screen.queryByRole('table', { name: 'Abastecimentos' })).not.toBeInTheDocument();
      const items = within(list).getAllByRole('listitem');
      expect(items).toHaveLength(2);
      const first = within(items[0]);
      expect(first.getByText('10/02/2026 · 1.500 km')).toBeInTheDocument();
      expect(plain(first.getByText(/5,00 L/).textContent)).toBe('5,00 L · R$ 32,00 · R$ 6,40/L');
      expect(first.getByText('Gasolina comum · Posto Shell')).toBeInTheDocument();
      expect(first.getByText('Parcial')).toBeInTheDocument();
      const second = within(items[1]);
      expect(second.getByText('Etanol')).toBeInTheDocument();
      expect(second.getByText('Tanque cheio')).toBeInTheDocument();
    });

    it('as ações de editar e excluir continuam acessíveis', async () => {
      const user = userEvent.setup();
      mockApi.delete.mockResolvedValue({ data: undefined });
      renderTab();

      await user.click(await screen.findByRole('button', { name: 'Editar abastecimento de 10/02/2026' }));
      expect(within(await screen.findByRole('dialog')).getByLabelText(/^Hodômetro/)).toHaveValue('1500');
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: 'Excluir abastecimento de 10/02/2026' }));
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar' }));
      await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith(`${URL}/${makeRefueling().id}`));
    });

    it('a paginação continua disponível', async () => {
      mockApi.get.mockResolvedValue({ data: makeRefuelingPage([makeRefueling()], { totalElements: 25, totalPages: 3 }) });
      renderTab();

      expect(await screen.findByText('1–10 de 25')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Próxima página' })).toBeEnabled();
    });
  });

  describe('editar e excluir', () => {
    it('editar abre preenchido e envia PUT com o id', async () => {
      const user = userEvent.setup();
      mockApi.put.mockResolvedValue({ data: makeRefueling() });
      renderTab();

      await user.click(await screen.findByRole('button', { name: 'Editar abastecimento de 10/02/2026' }));
      const form = within(await screen.findByRole('dialog'));
      expect(form.getByLabelText(/^Hodômetro/)).toHaveValue('1500');
      expect(form.getByLabelText(/^Litros/)).toHaveValue('5');
      expect(form.getByLabelText(/^Valor total/)).toHaveValue('32');
      expect(form.getByLabelText(/^Posto/)).toHaveValue('Posto Shell');

      await user.clear(form.getByLabelText(/^Litros/));
      await user.type(form.getByLabelText(/^Litros/), '6');
      await user.click(form.getByRole('button', { name: 'Salvar' }));

      await waitFor(() =>
        expect(mockApi.put).toHaveBeenCalledWith(
          `${URL}/${makeRefueling().id}`,
          expect.objectContaining({ date: '2026-02-10', odometerKm: 1500, liters: 6, totalValue: 32 }),
        ),
      );
      expect(await screen.findByText('Abastecimento atualizado!')).toBeInTheDocument();
    });

    it('excluir pede confirmação e só então chama a API', async () => {
      const user = userEvent.setup();
      mockApi.delete.mockResolvedValue({ data: undefined });
      renderTab();

      await user.click(await screen.findByRole('button', { name: 'Excluir abastecimento de 10/02/2026' }));
      expect(mockApi.delete).not.toHaveBeenCalled();
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar' }));

      await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith(`${URL}/${makeRefueling().id}`));
      expect(await screen.findByText('Abastecimento excluído!')).toBeInTheDocument();
      expect(onChanged).toHaveBeenCalled();
      await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(2));
    });

    it('falha ao excluir mostra o erro', async () => {
      const user = userEvent.setup();
      mockApi.delete.mockRejectedValue(new Error('rede'));
      renderTab();

      await user.click(await screen.findByRole('button', { name: 'Excluir abastecimento de 10/02/2026' }));
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar' }));

      expect(await screen.findByText('Erro ao excluir abastecimento')).toBeInTheDocument();
      expect(onChanged).not.toHaveBeenCalled();
    });
  });
});
