import { client } from '../lib/api';

export interface WalletBalance {
  wallet_id: number;
  balance: number;
  currency: string;
}

export interface AdminWalletEntry {
  user_id: string;
  telegram_username?: string;
  balance: number;
  wallet_id: number;
}

export interface WalletActionResponse {
  success: boolean;
  message: string;
  balance: number;
  transaction_id: number;
}

export interface AdminWalletAdjustRequest {
  amount: number;
  note?: string;
}

export const walletApi = {
  async getBalance(currency: string = 'PHP'): Promise<WalletBalance> {
    const response = await client.apiCall.invoke({
      url: `/api/v1/wallet/balance?currency=${currency}`,
      method: 'GET',
      data: {},
    });
    return response.data;
  },

  // Admin endpoints for PHP wallets
  async listPhpWallets(): Promise<AdminWalletEntry[]> {
    const response = await client.apiCall.invoke({
      url: '/api/v1/wallet/admin/php-wallets',
      method: 'GET',
      data: {},
    });
    return response.data;
  },

  async adjustPhpWallet(
    userId: string,
    amount: number,
    note?: string
  ): Promise<WalletActionResponse> {
    const response = await client.apiCall.invoke({
      url: `/api/v1/wallet/admin/php-wallets/${encodeURIComponent(userId)}/adjust`,
      method: 'POST',
      data: { amount, note },
    });
    return response.data;
  },

  // Admin endpoints for USD wallets
  async listUsdWallets(): Promise<AdminWalletEntry[]> {
    const response = await client.apiCall.invoke({
      url: '/api/v1/wallet/admin/usd-wallets',
      method: 'GET',
      data: {},
    });
    return response.data;
  },

  async adjustUsdWallet(
    userId: string,
    amount: number,
    note?: string
  ): Promise<WalletActionResponse> {
    const response = await client.apiCall.invoke({
      url: `/api/v1/wallet/admin/usd-wallets/${encodeURIComponent(userId)}/adjust`,
      method: 'POST',
      data: { amount, note },
    });
    return response.data;
  },
};
