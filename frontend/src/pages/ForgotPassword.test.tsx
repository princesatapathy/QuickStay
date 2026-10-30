import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPassword from './ForgotPassword';

// A plain function (not vi.fn) so a rejected result is not tracked as unhandled by the spy.
const api = vi.hoisted(() => ({ calls: [] as unknown[], outcome: (): Promise<unknown> => Promise.resolve({}) }));
vi.mock('../api/auth', () => ({
  forgotPassword: (data: unknown) => { api.calls.push(data); return api.outcome(); },
}));

const renderPage = () => render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

describe('ForgotPassword', () => {
  beforeEach(() => { api.calls.length = 0; api.outcome = () => Promise.resolve({}); });

  it('sends the email and shows the same neutral confirmation', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText('Email'), 'guest@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(api.calls).toEqual([{ email: 'guest@example.com' }]);
    expect(await screen.findByText(/if an account exists/i)).toBeInTheDocument();
  });

  it('shows an error when the request fails', async () => {
    api.outcome = () => Promise.reject({ response: { data: { message: 'email: must be a well-formed email address' } } });
    renderPage();

    await userEvent.type(screen.getByLabelText('Email'), 'guest@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText(/well-formed/i)).toBeInTheDocument();
  });
});
