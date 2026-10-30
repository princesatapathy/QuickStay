import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResetPassword from './ResetPassword';

// A plain function (not vi.fn) so a rejected result is not tracked as unhandled by the spy.
const api = vi.hoisted(() => ({ calls: [] as unknown[], outcome: (): Promise<unknown> => Promise.resolve({}) }));
vi.mock('../api/auth', () => ({
  resetPassword: (data: unknown) => { api.calls.push(data); return api.outcome(); },
}));

const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><ResetPassword /></MemoryRouter>);

const fillAndSubmit = async (password: string, confirmation: string) => {
  await userEvent.type(screen.getByLabelText('New password'), password);
  await userEvent.type(screen.getByLabelText('Confirm new password'), confirmation);
  await userEvent.click(screen.getByRole('button', { name: 'Set new password' }));
};

describe('ResetPassword', () => {
  beforeEach(() => { api.calls.length = 0; api.outcome = () => Promise.resolve({}); });

  it('asks for a new link when the token is missing from the URL', () => {
    renderAt('/reset-password');

    expect(screen.getByText(/link is missing or incomplete/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });

  it('refuses mismatched passwords without calling the API', async () => {
    renderAt('/reset-password?token=abc');

    await fillAndSubmit('long-enough-pw', 'different-pw-1');

    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    expect(api.calls).toHaveLength(0);
  });

  it('submits the token and new password, then links to login', async () => {
    renderAt('/reset-password?token=abc');

    await fillAndSubmit('long-enough-pw', 'long-enough-pw');

    expect(api.calls).toEqual([{ token: 'abc', newPassword: 'long-enough-pw' }]);
    expect(await screen.findByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  it('shows the server message for an expired link', async () => {
    api.outcome = () => Promise.reject({ response: { data: { message: 'Reset link is invalid or has expired' } } });
    renderAt('/reset-password?token=abc');

    await fillAndSubmit('long-enough-pw', 'long-enough-pw');

    expect(await screen.findByText(/invalid or has expired/i)).toBeInTheDocument();
  });
});
