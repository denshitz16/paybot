import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, CheckCircle } from 'lucide-react';

interface SettlementBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const settlementConfig = {
  INSTANT: {
    label: 'Instant',
    description: 'Credit applied immediately (QR/e-wallet)',
    icon: Zap,
    color: 'bg-green-100 text-green-800',
  },
  T0_SETTLEMENT: {
    label: 'T0 Settlement',
    description: 'Same-day credit (card)',
    icon: CheckCircle,
    color: 'bg-emerald-100 text-emerald-800',
  },
  PENDING_T1: {
    label: 'Pending (T+1)',
    description: 'Settling tomorrow',
    icon: Clock,
    color: 'bg-amber-100 text-amber-800',
  },
  SETTLED: {
    label: 'Settled',
    description: 'Confirmed and available',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800',
  },
};

export function SettlementBadge({ status, size = 'md' }: SettlementBadgeProps) {
  const config = settlementConfig[status as keyof typeof settlementConfig] || {
    label: status,
    description: '',
    icon: Clock,
    color: 'bg-gray-100 text-gray-800',
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex items-center gap-2">
      <Badge className={config.color} variant="outline">
        <Icon className={`${sizeClasses[size]} mr-1`} />
        {config.label}
      </Badge>
      {config.description && (
        <span className="text-xs text-gray-500">{config.description}</span>
      )}
    </div>
  );
}
