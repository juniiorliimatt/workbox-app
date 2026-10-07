import { describe, expect, it } from 'vitest';
import { getErrorMessage, getProblemDetail } from '@/utils/errors';

const apiError = (data: unknown, message = 'Request failed with status code 400') => ({ message, response: { status: 400, data } });

describe('utils/errors', () => {
  describe('getProblemDetail', () => {
    it('lê o "detail" do corpo application/problem+json (RFC 9457)', () => {
      expect(getProblemDetail(apiError({ status: 400, detail: 'Hodômetro (1400 km) menor que o registro de 2026-01-10 (1500 km)' }))).toBe(
        'Hodômetro (1400 km) menor que o registro de 2026-01-10 (1500 km)',
      );
    });

    it.each([
      ['sem corpo', apiError(undefined)],
      ['detail vazio', apiError({ detail: '' })],
      ['detail que não é texto', apiError({ detail: 42 })],
      ['só "message" (não é problem+json)', apiError({ message: 'x' })],
      ['erro de rede, sem resposta', new Error('Network Error')],
      ['valor que não é objeto', 'boom'],
      ['null', null],
      ['undefined', undefined],
    ])('devolve undefined: %s', (_name, error) => {
      expect(getProblemDetail(error)).toBeUndefined();
    });
  });

  describe('getErrorMessage', () => {
    it('prefere o "detail" do problem+json — o padrão de erro de todos os serviços', () => {
      expect(getErrorMessage(apiError({ detail: 'Tipo de receita já existe: Salário' }))).toBe('Tipo de receita já existe: Salário');
    });

    it('o "detail" ganha do "message" quando os dois vêm', () => {
      expect(getErrorMessage(apiError({ detail: 'motivo', message: 'genérico' }))).toBe('motivo');
    });

    it('sem "detail", mantém o comportamento antigo: "message" do corpo', () => {
      expect(getErrorMessage(apiError({ message: 'Valor inválido' }))).toBe('Valor inválido');
    });

    it('sem corpo útil, cai na mensagem do próprio erro', () => {
      expect(getErrorMessage(apiError({}, 'Request failed with status code 500'))).toBe('Request failed with status code 500');
      expect(getErrorMessage(new Error('Network Error'))).toBe('Network Error');
    });

    it('ignora detail vazio e usa o próximo', () => {
      expect(getErrorMessage(apiError({ detail: '', message: 'Valor inválido' }))).toBe('Valor inválido');
    });

    it('não-objeto e vazio devolvem undefined', () => {
      expect(getErrorMessage('boom')).toBeUndefined();
      expect(getErrorMessage(null)).toBeUndefined();
      expect(getErrorMessage(undefined)).toBeUndefined();
    });
  });
});
