import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MotosTab from '@/pages/moto/MotosTab';
import { MOTO_ID, makeMotorcycle, renderMoto } from './helpers';

const { mockApi } = vi.hoisted(() => ({ mockApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));

// Os fluxos de diálogo digitam em vários campos MUI; com a suíte inteira em paralelo passam do limite padrão de 5 s.
vi.setConfig({ testTimeout: 20_000 });

const FAZER = makeMotorcycle();
const onChanged = vi.fn();

const renderTab = (motos = [FAZER]) => renderMoto(<MotosTab motos={motos} onChanged={onChanged} />);

const problem = (detail: string) => Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status: 400, data: { detail } } });

const openNew = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Nova moto/i }));
  return within(await screen.findByRole('dialog'));
};

describe('Moto · aba Motos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista as motos com modelo, ano, placa e hodômetro inicial', () => {
    renderTab([FAZER, makeMotorcycle({ id: 'x', nickname: 'Antiga', active: false, plate: null, modelYear: null })]);

    expect(screen.getByRole('heading', { name: 'Fazer' })).toBeInTheDocument();
    expect(screen.getByText(/Fazer 250 · 2022/)).toBeInTheDocument();
    expect(screen.getByText(/ABC1D23/)).toBeInTheDocument();
    expect(screen.getAllByText(/Hodômetro inicial: 1\.000 km/)).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Antiga' })).toBeInTheDocument();
    expect(screen.getByText('Inativa')).toBeInTheDocument();
  });

  it('sem motos mostra o estado vazio', () => {
    renderTab([]);

    expect(screen.getByText('Nenhuma moto cadastrada.')).toBeInTheDocument();
  });

  it('enviar o formulário vazio mostra os erros e não chama a API', async () => {
    const user = userEvent.setup();
    renderTab([]);
    const form = await openNew(user);

    await user.click(form.getByRole('button', { name: 'Salvar' }));

    expect(await form.findByText('Apelido é obrigatório')).toBeInTheDocument();
    expect(form.getByText('Modelo é obrigatório')).toBeInTheDocument();
    expect(form.getByText('Hodômetro inicial é obrigatório')).toBeInTheDocument();
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('cadastra a moto, avisa por snackbar, fecha o diálogo e notifica a página', async () => {
    const user = userEvent.setup();
    mockApi.post.mockResolvedValue({ data: makeMotorcycle({ nickname: 'Biz' }) });
    renderTab([]);
    const form = await openNew(user);

    await user.type(form.getByLabelText(/^Apelido/), '  Biz ');
    await user.type(form.getByLabelText(/^Modelo/), 'Biz 125');
    await user.type(form.getByLabelText(/^Hodômetro inicial/), '1200');
    await user.click(form.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/motorcycles', {
        nickname: 'Biz',
        brand: null,
        model: 'Biz 125',
        modelYear: null,
        plate: null,
        initialOdometerKm: 1200,
        tankCapacityLiters: null,
        active: true,
      }),
    );
    expect(await screen.findByText('Moto cadastrada com sucesso!')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('envia marca, ano, placa em maiúsculas e capacidade do tanque (aceita vírgula)', async () => {
    const user = userEvent.setup();
    mockApi.post.mockResolvedValue({ data: FAZER });
    renderTab([]);
    const form = await openNew(user);

    await user.type(form.getByLabelText(/^Apelido/), 'Fazer');
    await user.type(form.getByLabelText(/^Marca/), 'Yamaha');
    await user.type(form.getByLabelText(/^Modelo/), 'Fazer 250');
    await user.type(form.getByLabelText(/^Ano/), '2022');
    await user.type(form.getByLabelText(/^Placa/), 'abc1d23');
    await user.type(form.getByLabelText(/^Hodômetro inicial/), '0');
    await user.type(form.getByLabelText(/^Capacidade do tanque/), '14,5');
    await user.click(form.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/motorcycles', {
        nickname: 'Fazer',
        brand: 'Yamaha',
        model: 'Fazer 250',
        modelYear: 2022,
        plate: 'ABC1D23',
        initialOdometerKm: 0,
        tankCapacityLiters: 14.5,
        active: true,
      }),
    );
  });

  it.each([
    ['Hodômetro inicial', '-5', 'Hodômetro não pode ser negativo'],
    ['Hodômetro inicial', '12,5', 'Informe um número inteiro'],
    ['Ano', '1800', 'Ano inválido'],
    ['Capacidade do tanque', '0', 'Capacidade inválida'],
  ])('valida %s = "%s"', async (label, value, message) => {
    const user = userEvent.setup();
    renderTab([]);
    const form = await openNew(user);
    await user.type(form.getByLabelText(/^Apelido/), 'Biz');
    await user.type(form.getByLabelText(/^Modelo/), 'Biz 125');
    await user.type(form.getByLabelText(/^Hodômetro inicial/), '1000');
    const field = form.getByLabelText(new RegExp(`^${label}`));
    await user.clear(field);
    await user.type(field, value);

    await user.click(form.getByRole('button', { name: 'Salvar' }));

    expect(await form.findByText(message)).toBeInTheDocument();
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('editar abre o formulário preenchido e envia PUT com o id', async () => {
    const user = userEvent.setup();
    mockApi.put.mockResolvedValue({ data: FAZER });
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Editar moto Fazer' }));
    const form = within(await screen.findByRole('dialog'));
    expect(form.getByLabelText(/^Apelido/)).toHaveValue('Fazer');
    expect(form.getByLabelText(/^Modelo/)).toHaveValue('Fazer 250');
    expect(form.getByLabelText(/^Hodômetro inicial/)).toHaveValue('1000');
    expect(form.getByLabelText(/^Capacidade do tanque/)).toHaveValue('14');

    await user.clear(form.getByLabelText(/^Apelido/));
    await user.type(form.getByLabelText(/^Apelido/), 'Fazer Azul');
    await user.click(form.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(mockApi.put).toHaveBeenCalledWith(
        `/api/v1/motorcycles/${MOTO_ID}`,
        expect.objectContaining({ nickname: 'Fazer Azul', model: 'Fazer 250', initialOdometerKm: 1000, active: true }),
      ),
    );
    expect(await screen.findByText('Moto atualizada com sucesso!')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it('dá pra inativar a moto pelo formulário', async () => {
    const user = userEvent.setup();
    mockApi.put.mockResolvedValue({ data: FAZER });
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Editar moto Fazer' }));
    const form = within(await screen.findByRole('dialog'));
    await user.click(form.getByRole('checkbox', { name: /Moto ativa/ }));
    await user.click(form.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(mockApi.put).toHaveBeenCalledWith(`/api/v1/motorcycles/${MOTO_ID}`, expect.objectContaining({ active: false })),
    );
  });

  it('excluir pede confirmação avisando do efeito em cascata e só então chama a API', async () => {
    const user = userEvent.setup();
    mockApi.delete.mockResolvedValue({ data: undefined });
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Excluir moto Fazer' }));
    const confirm = within(await screen.findByRole('dialog'));
    expect(confirm.getByText(/apaga também todos os abastecimentos, trocas de óleo e leituras/i)).toBeInTheDocument();
    expect(mockApi.delete).not.toHaveBeenCalled();

    await user.click(confirm.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith(`/api/v1/motorcycles/${MOTO_ID}`));
    expect(await screen.findByText('Moto excluída com sucesso!')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it('cancelar a exclusão não chama a API', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Excluir moto Fazer' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    expect(mockApi.delete).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('erro da API mostra o motivo (problem+json "detail") e mantém o diálogo aberto', async () => {
    const user = userEvent.setup();
    mockApi.post.mockRejectedValue(problem('Falha na validação'));
    renderTab([]);
    const form = await openNew(user);
    await user.type(form.getByLabelText(/^Apelido/), 'Biz');
    await user.type(form.getByLabelText(/^Modelo/), 'Biz 125');
    await user.type(form.getByLabelText(/^Hodômetro inicial/), '1000');

    await user.click(form.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Erro: Falha na validação')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('erro sem detalhe usa mensagem genérica', async () => {
    const user = userEvent.setup();
    mockApi.delete.mockRejectedValue(new Error('rede'));
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Excluir moto Fazer' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('Erro ao excluir moto')).toBeInTheDocument();
  });

  it('o diálogo tem título acessível e ao reabrir o formulário vem limpo', async () => {
    const user = userEvent.setup();
    renderTab([]);
    let form = await openNew(user);
    expect(screen.getByRole('dialog', { name: 'Nova moto' })).toBeInTheDocument();
    await user.type(form.getByLabelText(/^Apelido/), 'Rascunho');
    await user.click(form.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    form = await openNew(user);

    expect(form.getByLabelText(/^Apelido/)).toHaveValue('');
  });
});
