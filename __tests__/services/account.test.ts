const mockInvoke = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
  },
}));

const { accountService } = require('@/services/account');

describe('accountService', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('invokes the delete-account Edge Function', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

    await accountService.deleteCurrentAccount();

    expect(mockInvoke).toHaveBeenCalledWith('delete-account');
  });

  it('throws when the function invocation fails', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Function failed' },
    });

    await expect(accountService.deleteCurrentAccount()).rejects.toThrow('Function failed');
  });

  it('throws when the function returns an error payload', async () => {
    mockInvoke.mockResolvedValue({
      data: { error: 'Could not delete account' },
      error: null,
    });

    await expect(accountService.deleteCurrentAccount()).rejects.toThrow(
      'Could not delete account'
    );
  });
});
