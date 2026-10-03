import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DataOutHint from '@/components/forza/DataOutHint';

const { mockApi } = vi.hoisted(() => ({ mockApi: { get: vi.fn() } }));
vi.mock('@/services/useAxiosWithAuth', () => ({ useAxiosWithAuth: () => mockApi, default: () => mockApi }));

describe('DataOutHint', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the IP announced by the service and the port', async () => {
    mockApi.get.mockResolvedValue({ data: { hostAddresses: ['192.168.100.36'], udpPort: 5310 } });

    render(<DataOutHint browserHostname="localhost" />);

    expect(await screen.findByText('192.168.100.36')).toBeInTheDocument();
    expect(screen.getByText('5310')).toBeInTheDocument();
    expect(screen.getByText(/Ative o Data Out no jogo apontando para o IP/)).toBeInTheDocument();
    expect(mockApi.get.mock.calls[0][0]).toBe('/api/v1/live/info');
  });

  it('uses the announced (host-published) port, not a hardcoded one', async () => {
    mockApi.get.mockResolvedValue({ data: { hostAddresses: ['10.0.0.5'], udpPort: 5311 } });

    render(<DataOutHint browserHostname="localhost" />);

    expect(await screen.findByText('5311')).toBeInTheDocument();
  });

  it('lists every announced IP when the machine has several', async () => {
    mockApi.get.mockResolvedValue({ data: { hostAddresses: ['192.168.0.10', '10.0.0.5'], udpPort: 5310 } });

    render(<DataOutHint browserHostname="localhost" />);

    expect(await screen.findByText('192.168.0.10')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.5')).toBeInTheDocument();
    expect(screen.getByText(/um destes IPs/)).toBeInTheDocument();
  });

  it('falls back to the host used to open the app when nothing is announced', async () => {
    mockApi.get.mockResolvedValue({ data: { hostAddresses: [], udpPort: 5310 } });

    render(<DataOutHint browserHostname="192.168.0.99" />);

    expect(await screen.findByText('192.168.0.99')).toBeInTheDocument();
  });

  it('keeps a generic sentence (with the default port) when no IP can be determined', async () => {
    mockApi.get.mockResolvedValue({ data: { hostAddresses: [], udpPort: 5310 } });

    render(<DataOutHint browserHostname="localhost" />);

    expect(await screen.findByText(/IP deste PC/)).toBeInTheDocument();
    expect(screen.getByText('5310')).toBeInTheDocument();
  });

  it('degrades to the generic sentence when the info request fails', async () => {
    mockApi.get.mockRejectedValue(new Error('Network Error'));

    render(<DataOutHint browserHostname="localhost" />);

    expect(await screen.findByText(/IP deste PC/)).toBeInTheDocument();
    expect(screen.getByText('5310')).toBeInTheDocument();
  });

  it('aborts the request on unmount', async () => {
    let signal: AbortSignal | undefined;
    mockApi.get.mockImplementation((_u: string, c?: { signal?: AbortSignal }) => {
      signal = c?.signal;
      return new Promise(() => undefined);
    });

    const { unmount } = render(<DataOutHint browserHostname="localhost" />);
    unmount();

    expect(signal?.aborted).toBe(true);
  });
});
