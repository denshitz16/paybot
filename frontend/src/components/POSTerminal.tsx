import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, XCircle, CreditCard, Plus } from 'lucide-react';

const transactionSchema = z.object({
  description: z.string().min(1, 'Description required'),
  amount: z.number().positive('Amount must be positive'),
  payment_method: z.enum(['maya', 'card', 'gcash', 'grabpay']),
  customer_name: z.string().optional(),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_phone: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface Terminal {
  id: number;
  terminal_code: string;
  terminal_name: string;
  status: string;
  is_active: boolean;
  location: string;
  enabled_payment_methods: string[];
}

interface Transaction {
  id: number;
  order_id: string;
  description: string;
  amount: number;
  payment_method: string;
  status: string;
  customer_name: string;
  created_at: string;
  payment_url: string;
}

const api = {
  getTerminals: async () => {
    const response = await fetch('/api/v1/pos-terminals/', {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
    });
    if (!response.ok) throw new Error('Failed to fetch terminals');
    return response.json();
  },

  getTransactions: async (terminalId: number) => {
    const response = await fetch(`/api/v1/pos-terminals/${terminalId}/transactions`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
    });
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  },

  createTransaction: async (terminalId: number, data: TransactionFormData) => {
    const response = await fetch(`/api/v1/pos-terminals/${terminalId}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create transaction');
    return response.json();
  },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const variants: Record<string, { icon: React.ReactNode; color: string }> = {
    completed: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'bg-green-100 text-green-800' },
    pending: { icon: <Clock className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-800' },
    failed: { icon: <XCircle className="w-4 h-4" />, color: 'bg-red-100 text-red-800' },
    active: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'bg-green-100 text-green-800' },
    inactive: { icon: <XCircle className="w-4 h-4" />, color: 'bg-gray-100 text-gray-800' },
  };

  const variant = variants[status] || { icon: null, color: 'bg-gray-100 text-gray-800' };

  return (
    <Badge className={`flex items-center gap-1 ${variant.color}`}>
      {variant.icon}
      {status}
    </Badge>
  );
};

const CreateTransactionForm: React.FC<{ terminalId: number; onSuccess: () => void }> = ({
  terminalId,
  onSuccess,
}) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: 0,
      payment_method: 'card',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: TransactionFormData) => api.createTransaction(terminalId, data),
    onSuccess: (data) => {
      if (data.success && data.checkout_url) {
        window.open(data.checkout_url, '_blank');
        onSuccess();
      }
    },
  });

  const amount = watch('amount');

  return (
    <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
      <div>
        <Label>Description</Label>
        <Input {...register('description')} placeholder="Order description" />
        {errors.description && <span className="text-red-500 text-sm">{errors.description.message}</span>}
      </div>

      <div>
        <Label>Amount (PHP)</Label>
        <Input
          {...register('amount', { valueAsNumber: true })}
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
        />
        {errors.amount && <span className="text-red-500 text-sm">{errors.amount.message}</span>}
      </div>

      <div>
        <Label>Payment Method</Label>
        <select {...register('payment_method')} className="w-full border rounded-md p-2">
          <option value="card">Credit/Debit Card</option>
          <option value="maya">Maya</option>
          <option value="gcash">GCash</option>
          <option value="grabpay">GrabPay</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Customer Name (Optional)</Label>
          <Input {...register('customer_name')} placeholder="John Doe" />
        </div>
        <div>
          <Label>Customer Email (Optional)</Label>
          <Input {...register('customer_email')} type="email" placeholder="john@example.com" />
        </div>
      </div>

      <div>
        <Label>Customer Phone (Optional)</Label>
        <Input {...register('customer_phone')} placeholder="+63 9XX XXX XXXX" />
      </div>

      <Button type="submit" className="w-full" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Processing...' : `Create Transaction (₱${amount.toFixed(2)})`}
      </Button>

      {createMutation.isError && (
        <div className="bg-red-100 text-red-800 p-3 rounded-md flex gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{(createMutation.error as Error).message}</span>
        </div>
      )}
    </form>
  );
};

const TerminalCard: React.FC<{ terminal: Terminal }> = ({ terminal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const transactionsQuery = useQuery({
    queryKey: ['transactions', terminal.id],
    queryFn: () => api.getTransactions(terminal.id),
    enabled: isOpen,
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-900 text-white pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{terminal.terminal_name}</CardTitle>
            <CardDescription className="text-slate-200">
              Code: <code className="bg-slate-800 px-2 py-1 rounded">{terminal.terminal_code}</code>
            </CardDescription>
          </div>
          <StatusBadge status={terminal.is_active ? 'active' : 'inactive'} />
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {terminal.location && (
          <div>
            <span className="text-sm font-medium">Location:</span>
            <p className="text-sm text-gray-600">{terminal.location}</p>
          </div>
        )}

        <div>
          <span className="text-sm font-medium">Supported Methods:</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {terminal.enabled_payment_methods.map((method) => (
              <Badge key={method} variant="outline">
                {method.toUpperCase()}
              </Badge>
            ))}
          </div>
        </div>

        <Tabs defaultValue="transactions" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="new">New Transaction</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-4 space-y-2">
            {transactionsQuery.data?.data?.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactionsQuery.data.data.map((txn: Transaction) => (
                  <div key={txn.id} className="border rounded-lg p-3 flex justify-between items-start">
                    <div>
                      <p className="font-medium">{txn.description}</p>
                      <p className="text-sm text-gray-600">₱{(txn.amount / 100).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(txn.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge status={txn.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No transactions yet</p>
            )}
          </TabsContent>

          <TabsContent value="new" className="mt-4">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="default">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Payment Order</DialogTitle>
                  <DialogDescription>
                    Create a new payment order for {terminal.terminal_name}
                  </DialogDescription>
                </DialogHeader>
                <CreateTransactionForm
                  terminalId={terminal.id}
                  onSuccess={() => {
                    setIsOpen(false);
                    transactionsQuery.refetch();
                  }}
                />
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export const POSTerminalDashboard: React.FC = () => {
  const terminalsQuery = useQuery({
    queryKey: ['terminals'],
    queryFn: api.getTerminals,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">POS Terminals</h1>
        <p className="text-gray-600 mt-2">Manage your virtual payment terminals</p>
      </div>

      {terminalsQuery.isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Loading terminals...</p>
          </CardContent>
        </Card>
      ) : terminalsQuery.isError ? (
        <Card>
          <CardContent className="pt-6">
            <div className="bg-red-100 text-red-800 p-4 rounded-md flex gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>Failed to load terminals. Please try again.</span>
            </div>
          </CardContent>
        </Card>
      ) : terminalsQuery.data?.data?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {terminalsQuery.data.data.map((terminal: Terminal) => (
            <TerminalCard key={terminal.id} terminal={terminal} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center space-y-4">
              <CreditCard className="w-16 h-16 mx-auto text-gray-400" />
              <h3 className="text-lg font-medium">No terminals yet</h3>
              <p className="text-gray-600">
                Contact your administrator to request a POS terminal for your business.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default POSTerminalDashboard;
