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

const renderPage = (email?: string) => render(
  <MemoryRouter initialEntries={[{ pathname: '/reset-password', state: email ? { email } : null }]}>
    <ResetPassword />
  </MemoryRouter>,
);

const fillAndSubmit = async ({ code = '123456', password = 'long-enough-pw', confirmation = undefined as string | undefined } = {}) => {
  confirmation ??= password;
  await userEvent.type(screen.getByLabelText('6-digit code'), code);
  await userEvent.type(screen.getByLabelText('New password'), password);
  await userEvent.type(screen.getByLabelText('Confirm new password'), confirmation);
  await userEvent.click(screen.getByRole('button', { name: 'Set new password' }));
};

describe('ResetPassword', () => {
  beforeEach(() => { api.calls.length = 0; api.outcome = () => Promise.resolve({}); });

  it('prefills the email from the forgot-password step', () => {
    renderPage('guest@example.com');

    expect(screen.getByLabelText('Email')).toHaveValue('guest@example.com');
    expect(screen.getByText(/if an account exists for guest@example.com/i)).toBeInTheDocument();
  });

  it('lets the user type the email when they arrive without one', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText('Email'), 'typed@example.com');
    await fillAndSubmit();

    expect(api.calls).toEqual([{ email: 'typed@example.com', otp: '123456', newPassword: 'long-enough-pw' }]);
  });

  it('refuses mismatched passwords without calling the API', async () => {
    renderPage('guest@example.com');

    await fillAndSubmit({ password: 'long-enough-pw', confirmation: 'different-pw-1' });

    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    expect(api.calls).toHaveLength(0);
  });

  it('submits email, code and new password, then links to login', async () => {
    renderPage('guest@example.com');

    await fillAndSubmit();

    expect(api.calls).toEqual([{ email: 'guest@example.com', otp: '123456', newPassword: 'long-enough-pw' }]);
    expect(await screen.findByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  it('shows the server message for a wrong or expired code', async () => {
    api.outcome = () => Promise.reject({ response: { data: { message: 'Code is invalid or has expired' } } });
    renderPage('guest@example.com');

    await fillAndSubmit();

    expect(await screen.findByText(/invalid or has expired/i)).toBeInTheDocument();
  });

  it('offers a way to request a new code', () => {
    renderPage('guest@example.com');

    expect(screen.getByRole('link', { name: 'Send a new code' })).toHaveAttribute('href', '/forgot-password');
  });
});
