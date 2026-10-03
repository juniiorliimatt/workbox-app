import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import SectionCard from '@/components/SectionCard';

describe('SectionCard', () => {
  it('renders title and description', () => {
    render(<SectionCard title="Receitas" description="Controle de entradas" icon={<span data-testid="ic" />} onClick={vi.fn()} />);

    expect(screen.getByText('Receitas')).toBeInTheDocument();
    expect(screen.getByText('Controle de entradas')).toBeInTheDocument();
    expect(screen.getByTestId('ic')).toBeInTheDocument();
  });

  it('is a keyboard-reachable button that calls onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<SectionCard title="Receitas" description="d" icon={<span />} onClick={onClick} />);

    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
