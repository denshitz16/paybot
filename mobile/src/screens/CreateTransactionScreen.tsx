import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  Dimensions,
} from 'react-native';
import { useMutation } from 'react-query';

const { width } = Dimensions.get('window');
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useForm, Controller } from 'react-hook-form';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { WebView } from 'react-native-webview';
import QRCode from 'react-native-qrcode-svg';

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  danger: '#EF4444',
  dark: '#1F2937',
  light: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit/Debit Card', icon: 'credit-card' },
  { id: 'maya', label: 'Maya', icon: 'account-balance-wallet' },
  { id: 'gcash', label: 'GCash', icon: 'phone-android' },
  { id: 'grabpay', label: 'GrabPay', icon: 'shopping-cart' },
];

const api = {
  createTransaction: async (token, terminalId, data) => {
    const response = await fetch(
      `https://paybot-production-7350.up.railway.app/api/v1/pos-terminals/${terminalId}/transactions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to create transaction');
    }
    return response.json();
  },
};

export const CreateTransactionScreen = ({ route, navigation }) => {
  const { terminal } = route.params;
  const [token, setToken] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [showWebView, setShowWebView] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [qrContent, setQrContent] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');

  const { control, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      description: '',
      amount: '0',
      payment_method: 'card',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
    },
  });

  const amount = watch('amount');

  React.useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('auth_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  const createMutation = useMutation(
    (data) => api.createTransaction(token, terminal.id, data),
    {
      onSuccess: (data) => {
        if (data.success) {
          setOrderId(data.order_id);
          if (data.qr_content) {
            setQrContent(data.qr_content);
            Toast.show({
              type: 'success',
              text1: 'QR Code Generated',
              text2: 'Customer can now scan to pay.',
            });
          } else if (data.checkout_url) {
            setCheckoutUrl(data.checkout_url);
            setShowWebView(true);
            Toast.show({
              type: 'success',
              text1: 'Payment order created',
              text2: 'Opening payment gateway...',
            });
          }
        }
      },
      onError: (error) => {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.message || 'Failed to create transaction',
        });
      },
    }
  );

  // Poll for payment status when orderId is set and qrContent is shown
  useEffect(() => {
    let interval;
    if (orderId && qrContent && paymentStatus === 'pending') {
      interval = setInterval(async () => {
        try {
          const response = await fetch(
            `https://paybot-production-7350.up.railway.app/api/v1/pos-terminals/transactions/${orderId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );
          if (response.ok) {
            const result = await response.json();
            const status = result.data?.transaction?.status;
            if (status === 'completed') {
              setPaymentStatus('completed');
              clearInterval(interval);
              Toast.show({
                type: 'success',
                text1: 'Payment Received!',
                text2: 'Transaction completed successfully.',
              });
            } else if (status === 'failed' || status === 'cancelled') {
              setPaymentStatus(status);
              clearInterval(interval);
            }
          }
        } catch (e) {
          console.error('Polling error', e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [orderId, qrContent, paymentStatus, token]);

  const onSubmit = (data) => {
    Keyboard.dismiss();
    if (!data.amount || parseFloat(data.amount) <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid amount',
        text2: 'Please enter an amount greater than 0',
      });
      return;
    }

    createMutation.mutate({
      description: data.description || 'Payment Order',
      amount: parseFloat(data.amount),
      payment_method: selectedMethod,
      customer_name: data.customer_name || '',
      customer_email: data.customer_email || '',
      customer_phone: data.customer_phone || '',
    });
  };

  if (showWebView && checkoutUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.checkoutHeader}>
          <TouchableOpacity
            onPress={() => {
              setShowWebView(false);
              setCheckoutUrl(null);
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.checkoutHeaderTitle}>Complete Payment</Text>
          <View style={{ width: 24 }} />
        </View>

        <WebView
          source={{ uri: checkoutUrl }}
          style={{ flex: 1 }}
          onNavigationStateChange={(navState) => {
            if (navState.url.includes('/payment/success') || navState.url.includes('/payment/completed')) {
              Toast.show({
                type: 'success',
                text1: 'Payment successful!',
              });
              setTimeout(() => {
                navigation.goBack();
              }, 2000);
            }
          }}
        />
      </SafeAreaView>
    );
  }

  if (qrContent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.checkoutHeader}>
          <TouchableOpacity
            onPress={() => {
              setQrContent(null);
              setOrderId(null);
              setPaymentStatus('pending');
            }}
          >
            <MaterialIcons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.checkoutHeaderTitle}>Terminal QR Payment</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.qrContainer}>
          <Text style={styles.qrTitle}>₱{parseFloat(amount || 0).toFixed(2)}</Text>
          <Text style={styles.qrSubtitle}>{watch('description') || 'Payment Order'}</Text>

          <View style={styles.qrCodeBox}>
            {paymentStatus === 'completed' ? (
              <View style={styles.successBox}>
                <MaterialIcons name="check-circle" size={120} color={COLORS.secondary} />
                <Text style={styles.successText}>PAYMENT SUCCESS</Text>
                <Text style={styles.t0Badge}>T0 SETTLED</Text>
              </View>
            ) : (
              <QRCode
                value={qrContent}
                size={width * 0.7}
                color="black"
                backgroundColor="white"
              />
            )}
          </View>

          {paymentStatus === 'pending' && (
            <View style={styles.waitingBox}>
              <ActivityIndicator color={COLORS.primary} style={{ marginRight: 10 }} />
              <Text style={styles.waitingText}>Waiting for customer to pay...</Text>
            </View>
          )}

          {paymentStatus === 'completed' && (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.qrFooter}>T0 Settlement Priority Enabled</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Payment Order</Text>
        <View style={{ width: 24 }} />
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Terminal Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terminal</Text>
            <View style={styles.terminalInfo}>
              <Text style={styles.terminalName}>{terminal.terminal_name}</Text>
              <Text style={styles.terminalCode}>{terminal.terminal_code}</Text>
            </View>
          </View>

          {/* Payment Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Details</Text>

            {/* Amount */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Amount (PHP) *</Text>
              <Controller
                control={control}
                name="amount"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>₱</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={value}
                      onChangeText={onChange}
                      placeholderTextColor={COLORS.textSecondary}
                    />
                  </View>
                )}
              />
              {errors.amount && (
                <Text style={styles.errorText}>{errors.amount.message}</Text>
              )}
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Order #12345"
                    value={value}
                    onChangeText={onChange}
                    placeholderTextColor={COLORS.textSecondary}
                  />
                )}
              />
            </View>

            {/* Payment Method */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Payment Method *</Text>
              <View style={styles.methodsGrid}>
                {PAYMENT_METHODS.filter((m) =>
                  terminal.enabled_payment_methods.includes(m.id)
                ).map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.methodButton,
                      selectedMethod === method.id && styles.methodButtonActive,
                    ]}
                    onPress={() => setSelectedMethod(method.id)}
                  >
                    <MaterialIcons
                      name={method.icon}
                      size={28}
                      color={selectedMethod === method.id ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.methodLabel,
                        selectedMethod === method.id && styles.methodLabelActive,
                      ]}
                    >
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Customer Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Information</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Customer Name</Text>
              <Controller
                control={control}
                name="customer_name"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="John Doe"
                    value={value}
                    onChangeText={onChange}
                    placeholderTextColor={COLORS.textSecondary}
                  />
                )}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Customer Email</Text>
              <Controller
                control={control}
                name="customer_email"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="john@example.com"
                    keyboardType="email-address"
                    value={value}
                    onChangeText={onChange}
                    placeholderTextColor={COLORS.textSecondary}
                  />
                )}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Customer Phone</Text>
              <Controller
                control={control}
                name="customer_phone"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="+63 9XX XXX XXXX"
                    keyboardType="phone-pad"
                    value={value}
                    onChangeText={onChange}
                    placeholderTextColor={COLORS.textSecondary}
                  />
                )}
              />
            </View>
          </View>

          {/* Summary */}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₱{parseFloat(amount || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fee</Text>
              <Text style={styles.summaryValue}>
                ₱{(parseFloat(amount || 0) * 0.01).toFixed(2)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>
                ₱{(parseFloat(amount || 0) * 1.01).toFixed(2)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, createMutation.isLoading && styles.submitButtonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={createMutation.isLoading}
      >
        {createMutation.isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialIcons name="payment" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>Continue to Payment</Text>
          </>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  checkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkoutHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  terminalInfo: {
    backgroundColor: COLORS.light,
    padding: 12,
    borderRadius: 10,
  },
  terminalName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  terminalCode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodButton: {
    flex: 1,
    minWidth: '48%',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F7FF',
  },
  methodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  methodLabelActive: {
    color: COLORS.primary,
  },
  summary: {
    backgroundColor: COLORS.light,
    borderRadius: 10,
    padding: 16,
    marginBottom: 80,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTopMargin: 12,
    marginTop: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  submitButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qrContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  qrTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginBottom: 40,
  },
  qrCodeBox: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  waitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
  },
  waitingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  successBox: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginTop: 10,
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 60,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 40,
  },
  doneButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  qrFooter: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  t0Badge: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
    overflow: 'hidden',
  },
});
