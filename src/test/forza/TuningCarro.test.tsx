import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TuningCarro from '@/pages/forza/TuningCarro';
import { makeGuides, makeInitialSetup, makeRecommendation, renderAt } from './helpers';

const { mockApi } = vi.hoisted(() => ({ mockApi: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));

const renderPage = () => renderAt(<TuningCarro />, { path: '/forza/tuning/:carOrdinal/:performanceClass', route: '/forza/tuning/3667/S2' });

describe('Forza · Tuning · recomendação do carro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: makeRecommendation() });
    mockApi.post.mockResolvedValue({ status: 204 });
  });

  it('titles the page with the car and shows class/PI and drivetrain', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: /2021 Porsche 911 GT3/i })).toBeInTheDocument();
    expect(screen.getByText(/S2 · PI 812/)).toBeInTheDocument();
    expect(screen.getByText(/Traseira \(RWD\)/)).toBeInTheDocument();
    expect(mockApi.get.mock.calls[0][0]).toBe('/api/v1/tuning/cars/3667/S2');
  });

  it('lists the cycle adjustments in order, with direction in words, axle, rationale and evidence', async () => {
    renderPage();

    const cycle = await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
    const items = within(cycle).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Altura do solo traseira')).toBeInTheDocument();
    expect(within(items[0]).getByText(/Aumentar/)).toBeInTheDocument();
    expect(within(items[0]).getByText('Traseira')).toBeInTheDocument();
    expect(within(items[0]).getByText(/fundo de curso em 7%/)).toBeInTheDocument();
    expect(within(items[1]).getByText(/Reduzir/)).toBeInTheDocument();
    expect(within(items[1]).getByText(/225 °F/)).toBeInTheDocument();
  });

  it('words the brake balance as a move toward the front or the rear (never increase/decrease)', async () => {
    const toFront = { priority: 1, thisCycle: true, guide: 'freios', parameter: 'Equilíbrio de freio', axle: 'FRONT' as const, direction: 'INCREASE' as const, rationale: 'Sobresterço na entrada.', evidence: '60% das amostras de entrada de curva em sobresterço (n=700)' };
    const toRear = { ...toFront, priority: 2, axle: 'REAR' as const, rationale: 'Subesterço na entrada.', evidence: '58% das amostras de entrada de curva em subesterço (n=700)' };
    mockApi.get.mockResolvedValue({
      data: makeRecommendation({ thisCycle: [toFront, toRear], guides: makeGuides({ freios: { status: 'ADJUST', summary: '2 ajustes sugeridos', suggestions: [toFront, toRear] } }) }),
    });

    renderPage();

    const cycle = await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
    const items = within(cycle).getAllByRole('listitem');
    expect(within(items[0]).getByText(/Mover para a dianteira/)).toBeInTheDocument();
    expect(within(items[1]).getByText(/Mover para a traseira/)).toBeInTheDocument();
    expect(within(cycle).queryByText(/Aumentar/)).not.toBeInTheDocument();
    expect(within(cycle).queryByText(/Reduzir/)).not.toBeInTheDocument();
    expect(within(items[0]).getByText(/no FH5 o slider de equilíbrio é invertido/i)).toBeInTheDocument();
  });

  it('shows HOW MUCH to change, in the unit the game shows, with the size of the step', async () => {
    renderPage();

    const cycle = await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
    const items = within(cycle).getAllByRole('listitem');
    expect(within(items[0]).getByText(/Aumentar 0,5 cm/)).toBeInTheDocument();
    expect(within(items[0]).getByText('Passo pequeno')).toBeInTheDocument();
    expect(within(items[1]).getByText(/Reduzir 0,3 bar/)).toBeInTheDocument();
    expect(within(items[1]).getByText('Passo grande')).toBeInTheDocument();
  });

  it('words the brake balance step as a move of N points toward the front or the rear', async () => {
    const toFront = { priority: 1, thisCycle: true, guide: 'freios', parameter: 'Equilíbrio de freio', axle: 'FRONT' as const, direction: 'INCREASE' as const, rationale: 'r', evidence: 'e', amount: 2, unit: 'pontos percentuais', magnitude: 'MEDIUM' as const };
    mockApi.get.mockResolvedValue({ data: makeRecommendation({ thisCycle: [toFront] }) });

    renderPage();

    const cycle = await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
    expect(within(cycle).getByText(/Mover 2 pontos percentuais para a dianteira/)).toBeInTheDocument();
    expect(within(cycle).getByText('Passo médio')).toBeInTheDocument();
  });

  it('shows only the direction when the step is unknown (never an invented number)', async () => {
    const noStep = { priority: 1, thisCycle: true, guide: 'cambio', parameter: 'Relação da 4ª marcha', axle: 'NONE' as const, direction: 'DECREASE' as const, rationale: 'r', evidence: 'e', amount: null, unit: null, magnitude: null };
    mockApi.get.mockResolvedValue({ data: makeRecommendation({ thisCycle: [noStep] }) });

    renderPage();

    const cycle = await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
    expect(within(cycle).getByText('Reduzir')).toBeInTheDocument();
    expect(within(cycle).queryByText(/Passo /)).not.toBeInTheDocument();
    expect(within(cycle).queryByText(/null|undefined|NaN/)).not.toBeInTheDocument();
  });

  describe('configuração inicial', () => {
    const collecting = (overrides = {}) =>
      makeRecommendation({
        readiness: { ready: false, sessions: 3, requiredSessions: 10, samples: 9000, requiredSamples: 50000, missing: ['Faltam 7 sessões.'] },
        guides: [],
        thisCycle: [],
        initialSetup: makeInitialSetup(),
        ...overrides,
      });

    it('destaca como "Recomendação inicial" enquanto o carro coleta pela primeira vez, com os valores por eixo e as observações', async () => {
      mockApi.get.mockResolvedValue({ data: collecting() });

      renderPage();

      const section = await screen.findByRole('region', { name: /Recomendação inicial/i });
      expect(within(section).getByText(/ponto de partida/i)).toBeInTheDocument();
      const tires = within(section).getByText('Pressão dos pneus').closest('tr') as HTMLElement;
      expect(within(tires).getAllByText('1,5 a 2,0 bar')).toHaveLength(2); // dianteiro e traseiro
      expect(within(tires).getByText(/1,5 em carro pequeno/)).toBeInTheDocument();
      const springs = within(section).getByText('Molas', { selector: 'td' }).closest('tr') as HTMLElement;
      expect(within(springs).getAllByText('80')).toHaveLength(2);
      const brake = within(section).getByText('Equilíbrio').closest('tr') as HTMLElement;
      expect(within(brake).getByText('45%')).toBeInTheDocument();
      expect(within(section).getByText('105%')).toBeInTheDocument();
      expect(within(section).getAllByText('Pneus').length).toBeGreaterThan(0); // título do grupo
    });

    it('depois de reiniciar a coleta (já passou do primeiro ciclo) vira só uma referência recolhida', async () => {
      mockApi.get.mockResolvedValue({ data: collecting({ checkpointAt: '2026-10-05T12:00:00Z' }) });

      renderPage();

      await screen.findByRole('heading', { name: /2021 Porsche 911 GT3/i });
      expect(screen.queryByRole('region', { name: /Recomendação inicial/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Configuração inicial de referência/i })).toHaveAttribute('aria-expanded', 'false');
    });

    it('com a recomendação pronta, a configuração inicial fica recolhida como referência e o ciclo continua em destaque', async () => {
      mockApi.get.mockResolvedValue({ data: makeRecommendation({ initialSetup: makeInitialSetup() }) });

      renderPage();

      expect(await screen.findByRole('region', { name: /Aplicar neste ciclo/i })).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: /Recomendação inicial/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Configuração inicial de referência/i })).toHaveAttribute('aria-expanded', 'false');
    });

    it('expandir a referência mostra os valores', async () => {
      const user = userEvent.setup();
      mockApi.get.mockResolvedValue({ data: makeRecommendation({ initialSetup: makeInitialSetup() }) });

      renderPage();
      await user.click(await screen.findByRole('button', { name: /Configuração inicial de referência/i }));

      expect(screen.getByRole('button', { name: /Configuração inicial de referência/i })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('1,5 em carro pequeno; 2,0 em carro grande.')).toBeInTheDocument();
    });

    it('sem configuração inicial (ausente ou vazia) nada aparece', async () => {
      mockApi.get.mockResolvedValue({ data: collecting({ initialSetup: [] }) });

      renderPage();

      await screen.findByRole('heading', { name: /2021 Porsche 911 GT3/i });
      expect(screen.queryByText(/Recomendação inicial/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Configuração inicial de referência/i)).not.toBeInTheDocument();
    });
  });

  it('explains how to compute the spring step: percentage points of the slider range, with a worked example', async () => {
    const base = { priority: 1, thisCycle: true, guide: 'molas', axle: 'FRONT' as const, direction: 'DECREASE' as const, rationale: 'r', evidence: 'e', magnitude: 'LARGE' as const };
    const spring = { ...base, parameter: 'Mola dianteira', amount: 15, unit: 'pontos percentuais do curso do slider' };
    mockApi.get.mockResolvedValue({ data: makeRecommendation({ thisCycle: [spring] }) });

    renderPage();

    const cycle = await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
    expect(within(cycle).getByText('Reduzir 15 pontos percentuais do curso do slider')).toBeInTheDocument();
    // 15 pp de um slider de 20 a 150 kgf/mm (curso = 130) = 19,5 kgf/mm
    expect(within(cycle).getByText(/curso é o máximo menos o mínimo do slider.*15 pontos percentuais = 15% desse curso.*20 a 150.*19,5 kgf\/mm/i)).toBeInTheDocument();
  });

  it('does not show the spring explanation when no spring is in the cycle', async () => {
    const camber = { priority: 1, thisCycle: true, guide: 'alinhamento', parameter: 'Cambagem dianteira (mais negativa)', axle: 'FRONT' as const, direction: 'DECREASE' as const, rationale: 'r', evidence: 'e', amount: 0.2, unit: '°', magnitude: 'SMALL' as const };
    mockApi.get.mockResolvedValue({ data: makeRecommendation({ thisCycle: [camber] }) });

    renderPage();

    const cycle = await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
    expect(within(cycle).queryByText(/curso é o máximo menos o mínimo/i)).not.toBeInTheDocument();
  });

  it('glues degrees to the number, and spaces the other units', async () => {
    const base = { priority: 1, thisCycle: true, guide: 'alinhamento', axle: 'FRONT' as const, direction: 'DECREASE' as const, rationale: 'r', evidence: 'e', magnitude: 'SMALL' as const };
    const camber = { ...base, parameter: 'Cambagem dianteira (mais negativa)', amount: 0.2, unit: '°' };
    const spring = { ...base, priority: 2, guide: 'molas', parameter: 'Mola dianteira', amount: 5, unit: 'pontos percentuais do curso do slider' };
    const ratio = { ...base, priority: 3, guide: 'cambio', parameter: 'Relação final (transmissão final)', axle: 'NONE' as const, amount: 0.1, unit: 'na relação' };
    mockApi.get.mockResolvedValue({ data: makeRecommendation({ thisCycle: [camber, spring, ratio] }) });

    renderPage();

    const cycle = await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
    expect(within(cycle).getByText('Reduzir 0,2°')).toBeInTheDocument();
    expect(within(cycle).getByText('Reduzir 5 pontos percentuais do curso do slider')).toBeInTheDocument();
    expect(within(cycle).getByText('Reduzir 0,1 na relação')).toBeInTheDocument();
  });

  it('shows only the direction when there is a unit but no amount', async () => {
    const odd = { priority: 1, thisCycle: true, guide: 'pneus', parameter: 'Pressão dos pneus dianteiros', axle: 'FRONT' as const, direction: 'DECREASE' as const, rationale: 'r', evidence: 'e', amount: null, unit: 'bar', magnitude: null };
    mockApi.get.mockResolvedValue({ data: makeRecommendation({ thisCycle: [odd] }) });

    renderPage();

    const cycle = await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
    expect(within(cycle).getByText('Reduzir')).toBeInTheDocument();
  });

  it('explains that the step is the size of this cycle\'s change, not the final value', async () => {
    renderPage();

    expect(await screen.findByText(/tamanho da mudança deste ciclo, não o valor final/i)).toBeInTheDocument();
  });

  it('keeps increase/decrease for every other parameter', async () => {
    renderPage();

    const cycle = await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
    expect(within(cycle).getByText(/Aumentar/)).toBeInTheDocument();
    expect(within(cycle).queryByText(/Mover para a/)).not.toBeInTheDocument();
    expect(within(cycle).queryByText(/slider de equilíbrio/i)).not.toBeInTheDocument();
  });

  it('shows EVERY tuning guide of the game, even the ones with nothing to change', async () => {
    renderPage();

    await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
    for (const title of ['Pneus', 'Câmbio', 'Alinhamento', 'Barras anti-rolagem', 'Molas', 'Amortecimento', 'Aerodinâmica', 'Freios', 'Diferencial']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${title}`) })).toBeInTheDocument();
    }
  });

  it('labels each guide as to adjust, OK or without signal (text, not only color)', async () => {
    renderPage();
    await screen.findByRole('region', { name: /Aplicar neste ciclo/i });

    expect(within(screen.getByRole('button', { name: /^Molas/ })).getByText('Ajustar')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /^Câmbio/ })).getByText('OK')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /^Aerodinâmica/ })).getByText('Sem sinal na telemetria')).toBeInTheDocument();
  });

  it('opens a guide to show its summary, notes and suggestions', async () => {
    const user = userEvent.setup();
    mockApi.get.mockResolvedValue({
      data: makeRecommendation({ guides: makeGuides({ cambio: { notes: ['Dado por marcha só com transmissão de corrida.'] } }) }),
    });
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^Câmbio/ }));

    expect(await screen.findByText('Câmbio dentro do esperado.')).toBeVisible();
    expect(screen.getByText(/transmissão de corrida/)).toBeVisible();
  });

  it('with nothing to adjust, says so but still lists the guides', async () => {
    mockApi.get.mockResolvedValue({ data: makeRecommendation({ thisCycle: [], guides: makeGuides() }) });

    renderPage();

    expect(await screen.findByText(/Nenhum ajuste necessário neste ciclo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Freios/ })).toBeInTheDocument();
  });

  it('while collecting: shows progress and what is missing, no guides and no reset button', async () => {
    mockApi.get.mockResolvedValue({
      data: makeRecommendation({
        readiness: { ready: false, sessions: 7, requiredSessions: 10, samples: 4000, requiredSamples: 6000, missing: ['Faltam 3 sessões com este carro (7 de 10).', 'Faltam 2000 amostras (~2 min de pilotagem gravada).'] },
        guides: [],
        thisCycle: [],
      }),
    });

    renderPage();

    expect(await screen.findByText('Faltam 3 sessões com este carro (7 de 10).')).toBeInTheDocument();
    expect(screen.getByText(/Faltam 2000 amostras/)).toBeInTheDocument();
    expect(screen.getByText('7 de 10 sessões')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pneus/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Aplicar neste ciclo/i })).not.toBeInTheDocument();
  });

  it('explains the limits: directions only (no setup values from the game), max 3 per cycle', async () => {
    renderPage();

    expect(await screen.findByText(/não envia os valores do setup/i)).toBeInTheDocument();
    expect(screen.getByText(/no máximo 3 ajustes por ciclo/i)).toBeInTheDocument();
  });

  it('restarts the collection only after confirming, then reloads', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Reiniciar coleta/i }));

    expect(mockApi.post).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/api/v1/tuning/cars/3667/S2/checkpoint'));
    await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(2));
  });

  it('cancelling the confirmation does nothing', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Reiniciar coleta/i }));

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(mockApi.post).not.toHaveBeenCalled();
    expect(mockApi.get).toHaveBeenCalledTimes(1);
  });

  it('tells the user when the restart fails', async () => {
    const user = userEvent.setup();
    mockApi.post.mockRejectedValue(new Error('500'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Reiniciar coleta/i }));

    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText(/Não foi possível reiniciar a coleta/i)).toBeInTheDocument();
  });

  it('shows a friendly message for a car without sessions', async () => {
    mockApi.get.mockRejectedValue({ isAxiosError: true, response: { status: 404 } });

    renderPage();

    expect(await screen.findByText(/Nenhuma sessão coletada para este carro/i)).toBeInTheDocument();
  });

  it('shows an error with retry on other failures', async () => {
    const user = userEvent.setup();
    mockApi.get.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({ data: makeRecommendation() });
    renderPage();

    expect(await screen.findByText(/Não foi possível carregar a recomendação/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Tentar novamente/i }));

    expect(await screen.findByRole('region', { name: /Aplicar neste ciclo/i })).toBeInTheDocument();
  });
});
