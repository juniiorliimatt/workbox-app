import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import SetupForm from '@/components/forza/SetupForm';
import { makeCarSetup, makeDraftSetup } from './helpers';

const renderForm = (setup = makeCarSetup(), props: Partial<React.ComponentProps<typeof SetupForm>> = {}) => {
  const onSave = vi.fn();
  const onDelete = vi.fn();
  render(<SetupForm setup={setup} saving={false} onSave={onSave} onDelete={onDelete} {...props} />);
  return { onSave, onDelete };
};

const field = (name: string | RegExp) => screen.getByRole('spinbutton', { name }) as HTMLInputElement;

describe('Forza · Tuning · formulário de setup do carro', () => {
  it('draft: asks to check the recipe values and accept to start collecting', () => {
    renderForm(makeDraftSetup());

    expect(screen.getByText(/confira os valores/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aceitar e iniciar coleta/i })).toBeInTheDocument();
    expect(field('Pressão dos pneus dianteiros').value).toBe('1.75');
    expect(field('Equilíbrio de freio (0% traseira, 100% dianteira)').value).toBe('45');
  });

  it('confirmed: offers to save and warns that changing a value restarts the collection', () => {
    renderForm();

    expect(screen.queryByText(/confira os valores/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar setup/i })).toBeEnabled();
    expect(screen.getByText(/mudar qualquer valor reinicia a coleta/i)).toBeInTheDocument();
  });

  it('groups the fields by the game menu and shows the limit of each one', () => {
    renderForm();

    expect(screen.getByRole('heading', { name: 'Pneus' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Câmbio' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Molas' })).toBeInTheDocument();
    expect(screen.getAllByText('1 a 3,8 bar')).toHaveLength(2);
    expect(screen.getByText('2,2 a 6,1')).toBeInTheDocument();
  });

  it('draft: fields without a recipe (gearbox, spring range) are empty and block the accept button until filled', async () => {
    const { onSave } = renderForm(makeDraftSetup());

    expect(field('Transmissão final').value).toBe('');
    expect(screen.getByRole('button', { name: /aceitar e iniciar coleta/i })).toBeDisabled();
    expect(screen.getByText(/preencha todos os campos/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('flags a value outside the game limits and disables saving', async () => {
    renderForm();

    const pressure = field('Pressão dos pneus dianteiros');
    await userEvent.clear(pressure);
    await userEvent.type(pressure, '4.5');

    expect(screen.getByText(/deve estar entre 1 e 3,8/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar setup/i })).toBeDisabled();
  });

  it('springs ask for the slider range of the car and keep the value inside it', async () => {
    renderForm();

    expect(field('Mola dianteira — mínimo do slider').value).toBe('20');
    expect(field('Mola dianteira — máximo do slider').value).toBe('220');
    const spring = field('Mola dianteira');
    await userEvent.clear(spring);
    await userEvent.type(spring, '300');

    expect(screen.getByText(/deve estar entre 20 e 220/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar setup/i })).toBeDisabled();
  });

  it('rejects a spring range whose minimum is not below the maximum', async () => {
    renderForm();

    const min = field('Mola dianteira — mínimo do slider');
    await userEvent.clear(min);
    await userEvent.type(min, '220');

    expect(screen.getByText(/o mínimo deve ser menor que o máximo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar setup/i })).toBeDisabled();
  });

  it('follows the number of gears: fewer gears hide the extra inputs, more gears add empty ones that must be filled', async () => {
    renderForm();
    const gears = field('Quantidade de marchas');

    await userEvent.clear(gears);
    await userEvent.type(gears, '4');
    expect(screen.queryByRole('spinbutton', { name: 'Relação da 5ª marcha' })).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Relação da 4ª marcha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar setup/i })).toBeEnabled();

    await userEvent.clear(gears);
    await userEvent.type(gears, '8');
    expect(field('Relação da 8ª marcha').value).toBe('');
    expect(screen.getByRole('button', { name: /salvar setup/i })).toBeDisabled();
  });

  it('submits the numbers, the gear count and the spring ranges', async () => {
    const { onSave } = renderForm();
    const gears = field('Quantidade de marchas');
    await userEvent.clear(gears);
    await userEvent.type(gears, '5');
    const caster = field('Caster dianteiro');
    await userEvent.clear(caster);
    await userEvent.type(caster, '6.5');

    await userEvent.click(screen.getByRole('button', { name: /salvar setup/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const request = onSave.mock.calls[0][0];
    expect(request.gearCount).toBe(5);
    expect(request.values.caster).toBe(6.5);
    expect(request.values.gear_5).toBe(1.05);
    expect(request.values).not.toHaveProperty('gear_6');
    expect(request.ranges).toEqual({ spring_front: { min: 20, max: 220 } });
  });

  it('delete: only when the setup is confirmed, asking for confirmation first', async () => {
    const { onDelete } = renderForm();

    await userEvent.click(screen.getByRole('button', { name: /apagar setup/i }));
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('delete is not offered on the draft', () => {
    renderForm(makeDraftSetup());

    expect(screen.queryByRole('button', { name: /apagar setup/i })).not.toBeInTheDocument();
  });
});
