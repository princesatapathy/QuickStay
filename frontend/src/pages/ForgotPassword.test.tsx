import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPassword from './ForgotPassword';

// A plain function (not vi.fn) so a rejected result is not tracked as unhandled by the spy.
const api = vi.hoisted(() => ({ calls: [] as unknown[], outcome: (): Promise<unknown> => Promise.resolve({}) }));
vi.mock('../api/auth', () => ({
  forgotPassword: (data: unknown) => { api.calls.push(data); return api.outcome(); },
}));

function ResetStub() {
  const state = useLocation().state as { email?: string } | null;
  return <p>reset page for {state?.email}</p>;
}

const renderPage = () => render(
  <MemoryRouter initialEntries={['/forgot-password']}>
    <Routes>
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetStub />} />
    </Routes>
  </MemoryRouter>,
);

describe('ForgotPassword', () => {
  beforeEach(() => { api.calls.length = 0; api.outcome = () => Promise.resolve({}); });

  it('sends the email, then moves to the code screen carrying the email', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText('Email'), 'guest@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));

    expect(api.calls).toEqual([{ email: 'guest@example.com' }]);
    expect(await screen.findByText('reset page for guest@example.com')).toBeInTheDocument();
  });

  it('stays on the page and shows an error when the request fails', async () => {
    api.outcome = () => Promise.reject({ response: { data: { message: 'email: must be a well-formed email address' } } });
    renderPage();

    await userEvent.type(screen.getByLabelText('Email'), 'guest@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));

    expect(await screen.findByText(/well-formed/i)).toBeInTheDocument();
    expect(screen.queryByText(/reset page for/)).not.toBeInTheDocument();
  });
});
