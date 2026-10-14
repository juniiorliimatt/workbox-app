import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TuningCarro from '@/pages/forza/TuningCarro';
import { TuningRecommendationDTO, TuningSuggestionDTO } from '@/interfaces/forza';
import { makeCarSetup, makeDraftSetup, makeGuides, makeRecommendation, renderAt } from './helpers';

const { mockApi } = vi.hoisted(() => ({ mockApi: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));

const SETUP_URL = '/api/v1/tuning/cars/3667/S2/setup';

const renderPage = () => renderAt(<TuningCarro />, { path: '/forza/tuning/:carOrdinal/:performanceClass', route: '/forza/tuning/3667/S2' });

/** GET devolve a recomendação ou o setup conforme a URL. */
const serve = (recommendation: TuningRecommendationDTO, setup = makeCarSetup()) =>
  mockApi.get.mockImplementation(async (url: string) => ({ data: url.endsWith('/setup') ? setup : recommendation }));

const pressureTarget: TuningSuggestionDTO = {
  priority: 1,
  thisCycle: true,
  guide: 'pneus',
  parameter: 'Pressão dos pneus dianteiros',
  axle: 'FRONT',
  direction: 'DECREASE',
  rationale: 'Pneu superaquecido.',
  evidence: 'Temperatura média do eixo dianteiro: 225 °F',
  amount: 0.1,
  unit: 'bar',
  magnitude: 'SMALL',
  setupKey: 'tire_pressure_front',
  current: 1.8,
  target: 1.7,
  atLimit: false,
};

const withTargets = (cycle: TuningSuggestionDTO[]) =>
  makeRecommendation({ setupConfirmed: true, thisCycle: cycle, guides: makeGuides({ pneus: { status: 'ADJUST', summary: '1 ajuste sugerido', suggestions: cycle } }) });

describe('Forza · Tuning · setup do carro e valor-alvo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.post.mockResolvedValue({ status: 204 });
    mockApi.delete.mockResolvedValue({ status: 204 });
  });

  describe('com o setup aceito', () => {
    it('shows the current value and the target of each adjustment', async () => {
      serve(withTargets([pressureTarget]));

      renderPage();

      const cycle = await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
      expect(within(cycle).getByText(/Atual 1,8 bar → alvo 1,7 bar/)).toBeInTheDocument();
    });

    it('warns when the value is already at the limit and cannot go further', async () => {
      const stuck = { ...pressureTarget, priority: 4, parameter: 'Pressão dos pneus traseiros', axle: 'REAR' as const, current: 1, target: 1, atLimit: true, thisCycle: false };
      serve(makeRecommendation({ setupConfirmed: true, thisCycle: [pressureTarget], guides: makeGuides({ pneus: { status: 'ADJUST', summary: '2 ajustes', suggestions: [pressureTarget, stuck] } }) }));

      renderPage();

      // a guia Pneus tem ajuste: o acordeão já abre expandido
      expect(await screen.findByText(/No limite: não dá para ir além \(atual 1 bar\)/i)).toBeInTheDocument();
    });

    it('does not fetch the setup until the Setup tab is opened', async () => {
      serve(withTargets([pressureTarget]));

      renderPage();
      await screen.findByRole('region', { name: /Aplicar neste ciclo/i });

      expect(mockApi.get).toHaveBeenCalledTimes(1);
      expect(mockApi.get.mock.calls[0][0]).toBe('/api/v1/tuning/cars/3667/S2');
    });

    it('"Apliquei" asks for confirmation, applies the targets, reloads and says the collection restarted', async () => {
      serve(withTargets([pressureTarget]));
      mockApi.post.mockResolvedValue({ data: makeCarSetup() });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: /Apliquei/i }));
      expect(mockApi.post).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Confirmar' }));

      await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith(`${SETUP_URL}/apply`));
      expect(await screen.findByText(/coleta reiniciada/i)).toBeInTheDocument();
      await waitFor(() => expect(mockApi.get.mock.calls.filter((c) => c[0] === '/api/v1/tuning/cars/3667/S2').length).toBeGreaterThanOrEqual(2));
    });

    it('"Apliquei" is not offered when no adjustment has a target (e.g. only ground clearance)', async () => {
      serve(makeRecommendation({ setupConfirmed: true }));

      renderPage();
      await screen.findByRole('region', { name: /Aplicar neste ciclo/i });

      expect(screen.queryByRole('button', { name: /Apliquei/i })).not.toBeInTheDocument();
    });

    it('tells the user when applying fails', async () => {
      serve(withTargets([pressureTarget]));
      mockApi.post.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { detail: 'Não há ajuste com valor-alvo para aplicar neste ciclo.' } } });
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: /Apliquei/i }));
      await user.click(screen.getByRole('button', { name: 'Confirmar' }));

      expect(await screen.findByText(/Não há ajuste com valor-alvo/i)).toBeInTheDocument();
    });

    it('opens the Setup tab on demand, loading the confirmed setup', async () => {
      serve(withTargets([pressureTarget]));
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('region', { name: /Aplicar neste ciclo/i });

      await user.click(screen.getByRole('tab', { name: /Setup/i }));

      expect(await screen.findByRole('button', { name: /Salvar setup/i })).toBeInTheDocument();
      expect(mockApi.get).toHaveBeenCalledWith(SETUP_URL, expect.anything());
    });

    it('saves the edited setup and reloads the recommendation', async () => {
      serve(withTargets([pressureTarget]));
      mockApi.put.mockResolvedValue({ data: makeCarSetup() });
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
      await user.click(screen.getByRole('tab', { name: /Setup/i }));
      const caster = await screen.findByRole('spinbutton', { name: 'Caster dianteiro' });
      await user.clear(caster);
      await user.type(caster, '6.5');

      await user.click(screen.getByRole('button', { name: /Salvar setup/i }));

      await waitFor(() => expect(mockApi.put).toHaveBeenCalledTimes(1));
      expect(mockApi.put.mock.calls[0][0]).toBe(SETUP_URL);
      expect(mockApi.put.mock.calls[0][1].values.caster).toBe(6.5);
      expect(await screen.findByText(/Setup salvo/i)).toBeInTheDocument();
    });

    it('deletes the setup after confirming, going back to the draft', async () => {
      const recommendation = withTargets([pressureTarget]);
      serve(recommendation);
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('region', { name: /Aplicar neste ciclo/i });
      await user.click(screen.getByRole('tab', { name: /Setup/i }));
      await user.click(await screen.findByRole('button', { name: /Apagar setup/i }));
      serve({ ...recommendation, setupConfirmed: false, thisCycle: [], guides: [] }, makeDraftSetup());

      await user.click(screen.getByRole('button', { name: 'Confirmar' }));

      await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith(SETUP_URL));
      expect(await screen.findByRole('button', { name: /Aceitar e iniciar coleta/i })).toBeInTheDocument();
    });
  });

  describe('sem o setup aceito', () => {
    const unconfirmed = () =>
      makeRecommendation({
        setupConfirmed: false,
        thisCycle: [],
        guides: [],
        readiness: { ready: false, sessions: 0, requiredSessions: 5, samples: 0, requiredSamples: 20000, highConfidence: false, highRequiredSessions: 10, highRequiredSamples: 50000, missing: ['Confira o setup do carro e aceite os valores para começar a coleta.'] },
      });

    it('opens on the Setup tab with the draft to check and accept', async () => {
      serve(unconfirmed(), makeDraftSetup());

      renderPage();

      expect(await screen.findByText(/Confira os valores abaixo/i)).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Setup/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('button', { name: /Aceitar e iniciar coleta/i })).toBeDisabled();   // falta o câmbio
    });

    it('accepting saves the setup, announces the collection started and moves to the recommendation tab', async () => {
      serve(unconfirmed(), makeDraftSetup());
      mockApi.put.mockResolvedValue({ data: makeCarSetup() });
      const user = userEvent.setup();
      renderPage();
      await screen.findByText(/Confira os valores abaixo/i);
      await user.type(screen.getByRole('spinbutton', { name: 'Transmissão final' }), '3.5');
      const gears = [3, 2.2, 1.7, 1.3, 1.05, 0.85];
      for (const [i, ratio] of gears.entries()) {
        await user.type(screen.getByRole('spinbutton', { name: `Relação da ${i + 1}ª marcha` }), String(ratio));
      }
      await user.type(screen.getByRole('spinbutton', { name: 'Mola dianteira — mínimo do slider' }), '20');
      await user.type(screen.getByRole('spinbutton', { name: 'Mola dianteira — máximo do slider' }), '220');
      await user.type(screen.getByRole('spinbutton', { name: 'Altura do solo dianteira (sempre no máximo)' }), '220');
      await user.type(screen.getByRole('spinbutton', { name: 'Altura do solo dianteira (sempre no máximo) — mínimo do slider' }), '10');
      await user.type(screen.getByRole('spinbutton', { name: 'Altura do solo dianteira (sempre no máximo) — máximo do slider' }), '220');
      serve(makeRecommendation({ setupConfirmed: true }));

      await user.click(screen.getByRole('button', { name: /Aceitar e iniciar coleta/i }));

      await waitFor(() => expect(mockApi.put).toHaveBeenCalledTimes(1));
      expect(mockApi.put.mock.calls[0][1]).toMatchObject({ gearCount: 6, ranges: { spring_front: { min: 20, max: 220 }, ride_height_front: { min: 10, max: 220 } } });
      expect(await screen.findByText(/a coleta começa agora/i)).toBeInTheDocument();
      expect(await screen.findByRole('region', { name: /Aplicar neste ciclo/i })).toBeInTheDocument();
    }, 30000);   // digitar o câmbio e o intervalo da mola, campo a campo, é lento no jsdom

    it('does not offer to restart the collection (it has not started)', async () => {
      serve(unconfirmed(), makeDraftSetup());

      renderPage();
      await screen.findByText(/Confira os valores abaixo/i);

      expect(screen.queryByRole('button', { name: /Reiniciar coleta/i })).not.toBeInTheDocument();
    });

    it('shows an error with retry when the setup cannot be loaded', async () => {
      mockApi.get.mockImplementation(async (url: string) => {
        if (url.endsWith('/setup')) throw new Error('Network Error');
        return { data: unconfirmed() };
      });

      renderPage();

      expect(await screen.findByText(/Não foi possível carregar o setup/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeInTheDocument();
    });
  });
});
