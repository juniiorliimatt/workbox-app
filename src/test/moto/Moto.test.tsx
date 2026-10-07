import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Moto from '@/pages/Moto';
import { makeMotorcycle, renderMoto, routeGet } from './helpers';

const { mockApi } = vi.hoisted(() => ({ mockApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));
// Os painéis de aba têm suas próprias suítes; aqui só a casca (abas, seleção de moto, vazio, erro).
vi.mock('@/pages/moto/ResumoTab', () => ({ default: () => <div>conteúdo do resumo</div> }));
vi.mock('@/pages/moto/AbastecimentosTab', () => ({ default: () => <div>conteúdo dos abastecimentos</div> }));
vi.mock('@/pages/moto/OleoTab', () => ({ default: () => <div>conteúdo do óleo</div> }));
vi.mock('@/pages/moto/MotosTab', () => ({ default: () => <div>conteúdo das motos</div> }));

const FAZER = makeMotorcycle();
const BIZ = makeMotorcycle({ id: '99999999-9999-9999-9999-999999999999', nickname: 'Biz', model: 'Biz 125' });

describe('Moto · casca do módulo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('mostra o título, as quatro abas e abre no Resumo', async () => {
    routeGet(mockApi.get, { '/api/v1/motorcycles': [FAZER] });

    renderMoto(<Moto />);

    expect(await screen.findByRole('heading', { name: 'Workbox Moto' })).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(tabs).toEqual(['Resumo', 'Abastecimentos', 'Óleo', 'Motos']);
    expect(await screen.findByText('conteúdo do resumo')).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveAttribute('aria-selected', 'true');
  });

  it('troca de aba pelo clique e reflete na URL (?aba=)', async () => {
    const user = userEvent.setup();
    routeGet(mockApi.get, { '/api/v1/motorcycles': [FAZER] });
    renderMoto(<Moto />);

    await user.click(await screen.findByRole('tab', { name: 'Abastecimentos' }));

    expect(screen.getByRole('tab', { name: 'Abastecimentos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('conteúdo dos abastecimentos')).toBeVisible();
    expect(screen.getByText('conteúdo do resumo')).not.toBeVisible();
  });

  it('abre direto na aba indicada em ?aba=oleo', async () => {
    routeGet(mockApi.get, { '/api/v1/motorcycles': [FAZER] });

    renderMoto(<Moto />, '/moto?aba=oleo');

    expect(await screen.findByRole('tab', { name: 'Óleo' })).toHaveAttribute('aria-selected', 'true');
  });

  it('aba desconhecida em ?aba= cai no Resumo', async () => {
    routeGet(mockApi.get, { '/api/v1/motorcycles': [FAZER] });

    renderMoto(<Moto />, '/moto?aba=xyz');

    expect(await screen.findByRole('tab', { name: 'Resumo' })).toHaveAttribute('aria-selected', 'true');
  });

  it('sem motos: convida a cadastrar a primeira e abre a aba Motos', async () => {
    routeGet(mockApi.get, { '/api/v1/motorcycles': [] });

    renderMoto(<Moto />);

    expect(await screen.findByText(/Cadastre sua primeira moto/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Motos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByLabelText('Moto')).not.toBeInTheDocument();
  });

  it('com várias motos, seleciona a primeira ativa e lembra a escolha', async () => {
    const user = userEvent.setup();
    routeGet(mockApi.get, { '/api/v1/motorcycles': [makeMotorcycle({ active: false, nickname: 'Antiga' }), FAZER, BIZ] });
    renderMoto(<Moto />);

    const select = await screen.findByLabelText('Moto');
    expect(select).toHaveTextContent('Fazer');

    await user.click(select);
    await user.click(await screen.findByRole('option', { name: /Biz/ }));

    expect(screen.getByLabelText('Moto')).toHaveTextContent('Biz');
    expect(window.localStorage.getItem('workbox.moto.selecionada')).toBe(BIZ.id);
  });

  it('restaura a moto escolhida antes e ignora um id que não existe mais', async () => {
    window.localStorage.setItem('workbox.moto.selecionada', BIZ.id);
    routeGet(mockApi.get, { '/api/v1/motorcycles': [FAZER, BIZ] });
    const { unmount } = renderMoto(<Moto />);
    expect(await screen.findByLabelText('Moto')).toHaveTextContent('Biz');
    unmount();

    window.localStorage.setItem('workbox.moto.selecionada', 'id-apagado');
    renderMoto(<Moto />);
    expect(await screen.findByLabelText('Moto')).toHaveTextContent('Fazer');
  });

  it('erro ao carregar as motos mostra alerta com "Tentar novamente"', async () => {
    const user = userEvent.setup();
    mockApi.get.mockRejectedValueOnce(new Error('boom'));
    mockApi.get.mockResolvedValue({ data: [FAZER] });
    renderMoto(<Moto />);

    expect(await screen.findByText(/Não foi possível carregar suas motos/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Tentar novamente/i }));

    await waitFor(() => expect(screen.getByLabelText('Moto')).toHaveTextContent('Fazer'));
  });
});
