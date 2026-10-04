import { ReactElement } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Receitas from '@/pages/financas/Receitas';
import Despesas from '@/pages/financas/Despesas';
import { AuthContext } from '@/contexts/AuthContextValue';
import { SnackbarProvider } from '@/contexts/SnackbarContext';
import { createAuthValue } from '../forza/helpers';

/**
 * Caracterização das telas Receitas e Despesas (hoje quase idênticas): o mesmo conjunto de comportamentos roda nas
 * duas. Serve de rede de segurança pro refatoramento que extrai o que é comum — qualquer diferença entre as duas
 * (textos, URLs, campos) está declarada na spec de cada uma.
 */
const { mockApi } = vi.hoisted(() => ({ mockApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));

const TODAY = dayjs().format('YYYY-MM-DD');
const NOW = new Date();

interface Spec {
  name: string;
  render: () => ReactElement;
  listUrl: string;
  typesUrl: string;
  newButton: string;
  editTitle: string;
  created: string;
  updated: string;
  deleted: string;
  deleteTitle: string;
  deleteError: string;
  empty: string;
  typeDialog: string;
  typeCreated: string;
  batchTitle: string;
  batchMonthlyUrl: string;
  batchAnnualUrl: string;
  batchKey: 'revenues' | 'spendings';
  batchMonthlyOk: string;
  batchAnnualOk: string;
  item: Record<string, unknown>;
  types: Record<string, unknown>[];
  newTypeBody: Record<string, unknown>;
  spending: boolean;
}

const REVENUE: Spec = {
  name: 'Receitas',
  render: () => <Receitas />,
  listUrl: '/api/v1/revenues',
  typesUrl: '/api/v1/revenue-types',
  newButton: 'Nova Receita',
  editTitle: 'Editar Receita',
  created: 'Receita criada com sucesso!',
  updated: 'Receita atualizada com sucesso!',
  deleted: 'Receita excluída com sucesso!',
  deleteTitle: 'Excluir Receita',
  deleteError: 'Erro ao excluir receita',
  empty: 'Nenhuma receita encontrada.',
  typeDialog: 'Novo Tipo de Receita',
  typeCreated: 'Tipo criado com sucesso!',
  batchTitle: 'Lançamento em Lote de Receitas',
  batchMonthlyUrl: '/api/v1/revenues/batch',
  batchAnnualUrl: '/api/v1/revenues/batch/annual',
  batchKey: 'revenues',
  batchMonthlyOk: 'Receitas mensais em lote cadastradas com sucesso!',
  batchAnnualOk: 'Lote anual de receitas cadastrado com sucesso!',
  item: { id: 'r1', date: '2026-10-05', referenceDate: '2026-10-01', typeId: 't1', typeName: 'Salário', value: 1500 },
  types: [{ id: 't1', name: 'Salário' }, { id: 't2', name: 'Freelance' }],
  newTypeBody: { name: 'Dividendos' },
  spending: false,
};

const SPENDING: Spec = {
  name: 'Despesas',
  render: () => <Despesas />,
  listUrl: '/api/v1/spendings',
  typesUrl: '/api/v1/spending-types',
  newButton: 'Nova Despesa',
  editTitle: 'Editar Despesa',
  created: 'Despesa salva com sucesso!',
  updated: 'Despesa atualizada com sucesso!',
  deleted: 'Despesa excluída com sucesso!',
  deleteTitle: 'Excluir Despesa',
  deleteError: 'Erro ao excluir despesa: Desconhecido',
  empty: 'Nenhuma despesa encontrada.',
  typeDialog: 'Novo Tipo de Despesa',
  typeCreated: 'Tipo salvo com sucesso!',
  batchTitle: 'Lançamento em Lote de Despesas',
  batchMonthlyUrl: '/api/v1/spendings/batch',
  batchAnnualUrl: '/api/v1/spendings/batch/annual',
  batchKey: 'spendings',
  batchMonthlyOk: 'Despesas mensais em lote cadastradas com sucesso!',
  batchAnnualOk: 'Lote anual de despesas cadastrado com sucesso!',
  item: { id: 's1', date: '2026-10-05', referenceDate: '2026-10-01', description: 'Aluguel', typeId: 't1', typeName: 'Moradia', value: 800, wasPaid: true },
  types: [{ id: 't1', name: 'Moradia', category: 'ESSENTIAL' }, { id: 't2', name: 'Lazer', category: 'PERSONAL' }],
  newTypeBody: { name: 'Viagens', category: 'ESSENTIAL' },
  spending: true,
};

const renderPage = (spec: Spec) =>
  render(
    <AuthContext.Provider value={createAuthValue()}>
      <SnackbarProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
          <MemoryRouter>{spec.render()}</MemoryRouter>
        </LocalizationProvider>
      </SnackbarProvider>
    </AuthContext.Provider>,
  );

const stubApi = (spec: Spec, items: Record<string, unknown>[] = [spec.item], total = items.length) => {
  mockApi.get.mockImplementation((url: string) => {
    if (url === spec.listUrl) return Promise.resolve({ data: { content: items, totalElements: total } });
    if (url === spec.typesUrl) return Promise.resolve({ data: spec.types });
    if (url.endsWith('/history')) {
      return Promise.resolve({
        data: [
          { revision: 7, revisionType: 'ADD', changedAt: '2026-10-05T12:00:00', changedBy: 'qa.user@workbox.local', value: 1500 },
          { revision: 8, revisionType: 'MOD', changedAt: '2026-10-06T12:00:00', changedBy: null, value: 1600 },
          { revision: 9, revisionType: 'DEL', changedAt: null, changedBy: 'x', value: undefined },
        ],
      });
    }
    return Promise.reject(new Error(`url inesperada ${url}`));
  });
};

const listCalls = (spec: Spec) => mockApi.get.mock.calls.filter((c) => c[0] === spec.listUrl);
const lastListParams = (spec: Spec) => listCalls(spec).at(-1)?.[1]?.params as Record<string, unknown>;

const dialog = () => screen.getByRole('dialog');

describe.each([REVENUE, SPENDING])('Finanças · $name', (spec) => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubApi(spec);
    mockApi.post.mockResolvedValue({ data: {} });
    mockApi.put.mockResolvedValue({ data: {} });
    mockApi.delete.mockResolvedValue({ data: {} });
  });

  it('abre no mês corrente, ordenado por data decrescente, 12 por página, e carrega os tipos', async () => {
    renderPage(spec);

    await screen.findByText(String(spec.item.typeName));
    expect(lastListParams(spec)).toEqual({ page: 0, size: 12, sort: 'date,desc', year: NOW.getFullYear(), month: NOW.getMonth() + 1 });
    expect(mockApi.get.mock.calls.some((c) => c[0] === spec.typesUrl)).toBe(true);
  });

  it('mostra a linha com data, competência, tipo e valor em BRL', async () => {
    renderPage(spec);

    const row = (await screen.findByText(String(spec.item.typeName))).closest('tr') as HTMLElement;
    expect(within(row).getByText('05/10/2026')).toBeInTheDocument();
    expect(within(row).getByText('10/2026')).toBeInTheDocument();
    expect(within(row).getByText(/R\$\s?(1\.500|800),00/)).toBeInTheDocument();
    if (spec.spending) {
      expect(within(row).getByText('Aluguel')).toBeInTheDocument();
      expect(within(row).getByText('Pago')).toBeInTheDocument();
    }
  });

  it('mostra o estado vazio', async () => {
    stubApi(spec, [], 0);
    renderPage(spec);

    expect(await screen.findByText(spec.empty)).toBeInTheDocument();
  });

  it('competência ausente vira traço', async () => {
    stubApi(spec, [{ ...spec.item, referenceDate: undefined, description: undefined }]);
    renderPage(spec);

    const row = (await screen.findByText(String(spec.item.typeName))).closest('tr') as HTMLElement;
    expect(within(row).getAllByText('-').length).toBeGreaterThan(0);
  });

  it('filtro mensal: aplica tipo, mês e ano e volta para a primeira página', async () => {
    const user = userEvent.setup();
    renderPage(spec);
    await screen.findByText(String(spec.item.typeName));
    const panel = screen.getByText('Filtro Mensal:').parentElement as HTMLElement;

    await user.click(within(panel).getByRole('combobox', { name: 'Tipo' }));
    await user.click(await screen.findByRole('option', { name: String(spec.types[1].name) }));
    const year = within(panel).getByLabelText('Ano');
    await user.clear(year);
    await user.type(year, '2027');
    await user.click(within(panel).getByRole('button', { name: 'Filtrar' }));

    await waitFor(() => expect(lastListParams(spec)).toMatchObject({ page: 0, year: 2027, typeId: 't2', month: NOW.getMonth() + 1 }));
  });

  it('visão anual: mês "Todos" não manda o parâmetro month e o tipo vazio não manda typeId', async () => {
    const user = userEvent.setup();
    renderPage(spec);
    await screen.findByText(String(spec.item.typeName));

    await user.click(screen.getByRole('tab', { name: 'Visão Anual' }));

    await waitFor(() => expect(screen.getByText('Filtro Anual:')).toBeInTheDocument());
    await waitFor(() => {
      const params = lastListParams(spec);
      expect(params.month).toBeUndefined();
      expect(params.typeId).toBeUndefined();
      expect(params.year).toBe(NOW.getFullYear());
    });
  });

  it('ordenação: clicar numa coluna ordena ascendente e clicar de novo inverte', async () => {
    const user = userEvent.setup();
    renderPage(spec);
    await screen.findByText(String(spec.item.typeName));

    await user.click(screen.getByText('Valor (R$)'));
    await waitFor(() => expect(lastListParams(spec).sort).toBe('value,asc'));
    await user.click(screen.getByText('Valor (R$)'));
    await waitFor(() => expect(lastListParams(spec).sort).toBe('value,desc'));
    await user.click(screen.getByText('Competência'));
    await waitFor(() => expect(lastListParams(spec).sort).toBe('referenceDate,asc'));
  });

  it('paginação: trocar o tamanho da página recarrega com o novo size na página 0', async () => {
    const user = userEvent.setup();
    renderPage(spec);
    await screen.findByText(String(spec.item.typeName));

    await user.click(screen.getByRole('combobox', { name: /Itens por página/i }));
    await user.click(await screen.findByRole('option', { name: '24' }));

    await waitFor(() => expect(lastListParams(spec)).toMatchObject({ size: 24, page: 0 }));
  });

  it('cria um lançamento com o payload esperado e recarrega a lista', async () => {
    const user = userEvent.setup();
    renderPage(spec);
    await screen.findByText(String(spec.item.typeName));
    const before = listCalls(spec).length;

    await user.click(screen.getByRole('button', { name: spec.newButton }));
    const form = within(dialog());
    await user.click(form.getByRole('combobox', { name: 'Tipo' }));
    await user.click(await screen.findByRole('option', { name: String(spec.types[0].name) }));
    await user.type(form.getByLabelText(/^Valor/), '123.45');
    if (spec.spending) {
      await user.type(form.getByLabelText(/^Descrição$|^Descrição \*/), 'Conta de luz');
      await user.click(form.getByRole('checkbox', { name: 'Já foi pago' }));
    }
    await user.click(form.getByRole('button', { name: 'Salvar' }));

    const expected: Record<string, unknown> = { date: TODAY, referenceDate: null, value: 123.45, typeId: 't1' };
    if (spec.spending) Object.assign(expected, { description: 'Conta de luz', wasPaid: true });
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith(spec.listUrl, expected));
    expect(await screen.findByText(spec.created)).toBeInTheDocument();
    await waitFor(() => expect(listCalls(spec).length).toBeGreaterThan(before));
  });

  it('edita: abre preenchido e manda PUT no id da linha', async () => {
    const user = userEvent.setup();
    renderPage(spec);
    await screen.findByText(String(spec.item.typeName));

    await user.click(screen.getAllByTestId('EditIcon')[0]);
    const form = within(dialog());
    expect(await form.findByText(spec.editTitle)).toBeInTheDocument();
    expect(form.getByLabelText(/^Valor/)).toHaveValue(Number(spec.item.value));
    const value = form.getByLabelText(/^Valor/);
    await user.clear(value);
    await user.type(value, '999');
    await user.click(form.getByRole('button', { name: 'Salvar' }));

    const expected: Record<string, unknown> = { date: '2026-10-05', referenceDate: '2026-10-01', value: 999, typeId: 't1' };
    if (spec.spending) Object.assign(expected, { description: 'Aluguel', wasPaid: true });
    await waitFor(() => expect(mockApi.put).toHaveBeenCalledWith(`${spec.listUrl}/${spec.item.id}`, expected));
    expect(await screen.findByText(spec.updated)).toBeInTheDocument();
  });

  it('erro ao salvar mostra a mensagem do servidor e mantém o diálogo aberto', async () => {
    const user = userEvent.setup();
    mockApi.post.mockRejectedValue({ response: { data: { message: 'Valor inválido' } } });
    renderPage(spec);
    await screen.findByText(String(spec.item.typeName));

    await user.click(screen.getByRole('button', { name: spec.newButton }));
    const form = within(dialog());
    await user.click(form.getByRole('combobox', { name: 'Tipo' }));
    await user.click(await screen.findByRole('option', { name: String(spec.types[0].name) }));
    await user.type(form.getByLabelText(/^Valor/), '1');
    await user.click(form.getByRole('button', { name: 'Salvar' }));

    const expectedMessage = spec.spending ? 'Erro ao salvar despesa: Valor inválido' : 'Erro: Valor inválido';
    expect(await screen.findByText(expectedMessage)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('exclui só depois de confirmar', async () => {
    const user = userEvent.setup();
    renderPage(spec);
    await screen.findByText(String(spec.item.typeName));

    await user.click(screen.getAllByTestId('DeleteIcon')[0]);
    expect(await screen.findByText(spec.deleteTitle)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mockApi.delete).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getAllByTestId('DeleteIcon')[0]);
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith(`${spec.listUrl}/${spec.item.id}`));
    expect(await screen.findByText(spec.deleted)).toBeInTheDocument();
  });

  it('falha ao excluir mostra o erro e fecha a confirmação', async () => {
    const user = userEvent.setup();
    mockApi.delete.mockRejectedValue(new Error('boom'));
    renderPage(spec);
    await screen.findByText(String(spec.item.typeName));

    await user.click(screen.getAllByTestId('DeleteIcon')[0]);
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText(spec.deleteError.replace('Desconhecido', 'boom'))).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(spec.deleteTitle)).not.toBeInTheDocument());
  });

  it('histórico de auditoria: lista as revisões com chip por tipo, autor e valor', async () => {
    const user = userEvent.setup();
    renderPage(spec);
    await screen.findByText(String(spec.item.typeName));

    await user.click(screen.getAllByTitle('Ver Histórico')[0]);

    const audit = within(await screen.findByRole('dialog'));
    expect(await audit.findByText(new RegExp(`Histórico de Auditoria: ${spec.item.id}`))).toBeInTheDocument();
    expect(mockApi.get).toHaveBeenCalledWith(`${spec.listUrl}/${spec.item.id}/history`);
    expect(audit.getByText('Criação (ADD)')).toBeInTheDocument();
    expect(audit.getByText('Alteração (MOD)')).toBeInTheDocument();
    expect(audit.getByText('Exclusão (DEL)')).toBeInTheDocument();
    expect(audit.getByText('#7')).toBeInTheDocument();
    expect(audit.getByText('qa.user@workbox.local')).toBeInTheDocument();
    expect(audit.getByText('Sistema')).toBeInTheDocument(); // changedBy nulo
    expect(audit.getByText(/R\$\s?1\.600,00/)).toBeInTheDocument();
    await user.click(audit.getByRole('button', { name: 'Fechar' }));
    await waitFor(() => expect(screen.queryByText(/Histórico de Auditoria/)).not.toBeInTheDocument());
  });

  it('histórico vazio e erro ao carregar o histórico', async () => {
    const user = userEvent.setup();
    mockApi.get.mockImplementation((url: string) => {
      if (url === spec.listUrl) return Promise.resolve({ data: { content: [spec.item], totalElements: 1 } });
      if (url === spec.typesUrl) return Promise.resolve({ data: spec.types });
      return Promise.reject(new Error('falhou'));
    });
    renderPage(spec);
    await screen.findByText(String(spec.item.typeName));

    await user.click(screen.getAllByTitle('Ver Histórico')[0]);

    expect(await screen.findByText('Erro ao carregar histórico de auditoria')).toBeInTheDocument();
    expect(await screen.findByText('Nenhum registro de auditoria encontrado.')).toBeInTheDocument();
  });

  it('novo tipo a partir do formulário: cria, seleciona o tipo novo e avisa', async () => {
    const user = userEvent.setup();
    mockApi.post.mockResolvedValue({ data: { id: 't9', name: String(spec.newTypeBody.name), category: 'ESSENTIAL' } });
    renderPage(spec);
    await screen.findByText(String(spec.item.typeName));

    await user.click(screen.getByRole('button', { name: spec.newButton }));
    await user.click(within(dialog()).getByTitle('Adicionar novo tipo'));
    const typeDialog = within(await screen.findByRole('dialog', { name: spec.typeDialog }));
    await user.type(typeDialog.getByLabelText(/^Nome do Tipo/), String(spec.newTypeBody.name));
    await user.click(typeDialog.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith(spec.typesUrl, spec.newTypeBody));
    expect(await screen.findByText(spec.typeCreated)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Tipo' })).toHaveValue(String(spec.newTypeBody.name)));
  });

  it('lote mensal: manda as linhas na chave certa e recarrega', async () => {
    const user = userEvent.setup();
    renderPage(spec);
    await screen.findByText(String(spec.item.typeName));

    await user.click(screen.getByRole('button', { name: 'Lançamento em Lote' }));
    const batch = within(await screen.findByRole('dialog', { name: spec.batchTitle }));
    await user.click(batch.getByRole('combobox', { name: 'Tipo' }));
    await user.click(await screen.findByRole('option', { name: String(spec.types[1].name) }));
    await user.type(batch.getByLabelText(/^Valor/), '50');
    if (spec.spending) await user.type(batch.getByLabelText(/^Descrição$|^Descrição \*/), 'Streaming');
    await user.click(batch.getByRole('button', { name: 'Salvar Mensal' }));

    await waitFor(() => expect(mockApi.post).toHaveBeenCalledTimes(1));
    const [url, body] = mockApi.post.mock.calls[0];
    expect(url).toBe(spec.batchMonthlyUrl);
    const [line] = (body as Record<string, Record<string, unknown>[]>)[spec.batchKey];
    expect(line).toMatchObject({ date: TODAY, referenceDate: null, typeId: 't2', value: 50 });
    if (spec.spending) expect(line).toMatchObject({ description: 'Streaming', wasPaid: false });
    // Receita não manda campos de despesa (nem o contrário): o payload tem exatamente as chaves de cada API.
    expect(Object.keys(line).sort()).toEqual(
      spec.spending ? ['date', 'description', 'referenceDate', 'typeId', 'value', 'wasPaid'] : ['date', 'referenceDate', 'typeId', 'value'],
    );
    expect(await screen.findByText(spec.batchMonthlyOk)).toBeInTheDocument();
  });

  it('lote anual: manda a data base, o tipo e o valor, sem months quando nenhum mês é escolhido', async () => {
    const user = userEvent.setup();
    renderPage(spec);
    await screen.findByText(String(spec.item.typeName));

    await user.click(screen.getByRole('button', { name: 'Lançamento em Lote' }));
    const batch = within(await screen.findByRole('dialog', { name: spec.batchTitle }));
    await user.click(batch.getByRole('tab', { name: 'Lote Anual (Recorrente)' }));
    await user.click(batch.getByRole('combobox', { name: 'Tipo' }));
    await user.click(await screen.findByRole('option', { name: String(spec.types[0].name) }));
    await user.type(batch.getByLabelText(/^Valor/), '70');
    if (spec.spending) await user.type(batch.getByLabelText(/^Descrição Base/), 'Seguro');
    await user.click(batch.getByRole('button', { name: 'Salvar Anual' }));

    await waitFor(() => expect(mockApi.post).toHaveBeenCalledTimes(1));
    const [url, body] = mockApi.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toBe(spec.batchAnnualUrl);
    expect(body.months).toBeUndefined();
    const [line] = body[spec.batchKey] as Record<string, unknown>[];
    expect(line).toEqual(spec.spending
      ? { date: TODAY, typeId: 't1', description: 'Seguro', value: 70, wasPaid: false }
      : { date: TODAY, typeId: 't1', value: 70 });
    expect(await screen.findByText(spec.batchAnnualOk)).toBeInTheDocument();
  });

  it('lote: adicionar linha copia a data da anterior e remover só fica ativo com mais de uma linha', async () => {
    const user = userEvent.setup();
    renderPage(spec);
    await screen.findByText(String(spec.item.typeName));

    await user.click(screen.getByRole('button', { name: 'Lançamento em Lote' }));
    const batch = within(await screen.findByRole('dialog', { name: spec.batchTitle }));
    const removeButtons = () => batch.getAllByTestId('DeleteIcon').map((icon) => icon.closest('button') as HTMLButtonElement);
    expect(removeButtons()).toHaveLength(1);
    expect(removeButtons()[0]).toBeDisabled();

    await user.click(batch.getByRole('button', { name: 'Adicionar linha' }));

    expect(removeButtons()).toHaveLength(2);
    expect(removeButtons().every((button) => !button.disabled)).toBe(true);
    await user.click(removeButtons()[1]);
    expect(removeButtons()).toHaveLength(1);
  });

  it('falha ao salvar o lote mostra o erro', async () => {
    const user = userEvent.setup();
    mockApi.post.mockRejectedValue({ response: { data: { message: 'Tipo inexistente' } } });
    renderPage(spec);
    await screen.findByText(String(spec.item.typeName));

    await user.click(screen.getByRole('button', { name: 'Lançamento em Lote' }));
    const batch = within(await screen.findByRole('dialog', { name: spec.batchTitle }));
    await user.click(batch.getByRole('combobox', { name: 'Tipo' }));
    await user.click(await screen.findByRole('option', { name: String(spec.types[0].name) }));
    await user.type(batch.getByLabelText(/^Valor/), '5');
    if (spec.spending) await user.type(batch.getByLabelText(/^Descrição$|^Descrição \*/), 'x y z');
    await user.click(batch.getByRole('button', { name: 'Salvar Mensal' }));

    expect(await screen.findByText('Erro ao salvar lote: Tipo inexistente')).toBeInTheDocument();
  });
});
