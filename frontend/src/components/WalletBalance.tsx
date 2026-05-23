import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface WalletBalanceProps {
  availablePhp: number;
  pendingPhp: number;
  usdBalance: number;
  isKycVerified: boolean;
}

export function WalletBalance({
  availablePhp,
  pendingPhp,
  usdBalance,
  isKycVerified,
}: WalletBalanceProps) {
  const totalPhp = availablePhp + pendingPhp;

  return (
    <div className="space-y-4">
      {/* Main Balance Display */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Balance</p>
              <h1 className="text-4xl font-bold text-emerald-700">
                ₱{totalPhp.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h1>
            </div>

            {/* Sub-balances */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-200">
              <div>
                <p className="text-xs text-gray-600">Available (Spendable)</p>
                <p className="text-xl font-semibold text-emerald-600">
                  ₱{availablePhp.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Pending (T+1 Cards)</p>
                <p className="text-xl font-semibold text-amber-600">
                  ₱{pendingPhp.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* USD Balance Card */}
      {usdBalance > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">USD Balance</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${usdBalance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-300" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* KYC Status Alert */}
      {!isKycVerified && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-900 text-sm">KYC Verification Pending</p>
                <p className="text-xs text-yellow-800 mt-1">
                  Complete identity verification to unlock all wallet features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
