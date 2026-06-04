import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useForm, Controller } from 'react-hook-form';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { WebView } from 'react-native-webview';
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#0EA5E9',
  secondary: '#10B981',
  danger: '#EF4444',
  dark: '#0F172A',
  light: '#F8FAFC',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
};

const PAYMENT_METHODS = [
  { id: 'card', label: 'Tap to Phone', icon: 'contactless' },
  { id: 'maya', label: 'Maya QR', icon: 'qr-code-2' },
  { id: 'gcash', label: 'GCash', icon: 'account-balance-wallet' },
  { id: 'grabpay', label: 'GrabPay', icon: 'shopping-bag' },
];

const api = {
  createTransaction: async (token, terminalId, data) => {
    const response = await fetch(
      `https://mayaproduction.up.railway.app/api/v1/pos-terminals/${terminalId}/transactions`,
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
  const [isNfcActive, setIsNfcActive] = useState(false);

  const { control, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      description: '',
      amount: '',
      payment_method: 'card',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
    },
  });

  const amount = watch('amount');

  useEffect(() => {
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
          if (selectedMethod === 'card') {
            setIsNfcActive(true);
            // In a real implementation, you would start NFC reading here.
            // For now, we simulate a successful tap after 3 seconds.
            setTimeout(() => {
              // Simulate successful tap -> redirect to checkout if needed or poll status
              // For Maya Business Card API, it usually returns a checkout URL if 3DS is required.
              if (data.checkout_url) {
                setCheckoutUrl(data.checkout_url);
                setShowWebView(true);
              } else {
                Toast.show({
                  type: 'success',
                  text1: 'Card Tapped!',
                  text2: 'Authorizing payment...',
                });
              }
            }, 3000);
          } else if (data.qr_content) {
            setQrContent(data.qr_content);
            Toast.show({
              type: 'success',
              text1: 'QR Code Generated',
              text2: 'Customer can now scan to pay.',
            });
          } else if (data.checkout_url) {
            setCheckoutUrl(data.checkout_url);
            setShowWebView(true);
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

  // Poll for payment status
  useEffect(() => {
    let interval;
    if (orderId && paymentStatus === 'pending') {
      interval = setInterval(async () => {
        try {
          const response = await fetch(
            `https://mayaproduction.up.railway.app/api/v1/pos-terminals/transactions/${orderId}`,
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
              setIsNfcActive(false);
              clearInterval(interval);
              Toast.show({
                type: 'success',
                text1: 'Payment Received!',
                text2: 'Transaction completed successfully.',
              });
            } else if (status === 'failed' || status === 'cancelled') {
              setPaymentStatus(status);
              setIsNfcActive(false);
              clearInterval(interval);
            }
          }
        } catch (e) {
          console.error('Polling error', e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [orderId, paymentStatus, token]);

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
      description: data.description || 'POS Transaction',
      amount: parseFloat(data.amount) * 100, // API expects cents
      payment_method: selectedMethod,
      customer_name: data.customer_name || '',
      customer_email: data.customer_email || '',
      customer_phone: data.customer_phone || '',
    });
  };

  if (isNfcActive) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.nfcContainer}>
          <MaterialIcons name="contactless" size={120} color={COLORS.primary} />
          <Text style={styles.nfcTitle}>Ready to Tap</Text>
          <Text style={styles.nfcSubtitle}>Hold card near the back of the phone</Text>
          <Text style={styles.nfcAmount}>₱{parseFloat(amount || 0).toFixed(2)}</Text>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setIsNfcActive(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
            if (navState.url.includes('/success') || navState.url.includes('/completed')) {
              Toast.show({ type: 'success', text1: 'Payment successful!' });
              setTimeout(() => navigation.goBack(), 2000);
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
          <TouchableOpacity onPress={() => { setQrContent(null); setOrderId(null); setPaymentStatus('pending'); }}>
            <MaterialIcons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.checkoutHeaderTitle}>QR Payment</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.qrContainer}>
          <Text style={styles.qrTitle}>₱{parseFloat(amount || 0).toFixed(2)}</Text>
          <Text style={styles.qrSubtitle}>{watch('description') || 'Payment Order'}</Text>

          <View style={styles.qrCodeBox}>
            {paymentStatus === 'completed' ? (
              <View style={styles.successBox}>
                <MaterialIcons name="check-circle" size={120} color={COLORS.secondary} />
                <Text style={styles.successText}>SUCCESS</Text>
              </View>
            ) : (
              <QRCode value={qrContent} size={width * 0.7} color="black" backgroundColor="white" />
            )}
          </View>

          {paymentStatus === 'pending' && (
            <View style={styles.waitingBox}>
              <ActivityIndicator color={COLORS.primary} style={{ marginRight: 10 }} />
              <Text style={styles.waitingText}>Waiting for payment...</Text>
            </View>
          )}

          {paymentStatus === 'completed' && (
            <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
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
        <Text style={styles.headerTitle}>New Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
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
                    placeholderTextColor="#94A3B8"
                    autoFocus
                  />
                </View>
              )}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="Order Description"
                  value={value}
                  onChangeText={onChange}
                  placeholderTextColor="#94A3B8"
                />
              )}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Select Payment Method</Text>
            <View style={styles.methodsGrid}>
              {PAYMENT_METHODS.filter(m => terminal.enabled_payment_methods.includes(m.id)).map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.methodButton, selectedMethod === method.id && styles.methodButtonActive]}
                  onPress={() => setSelectedMethod(method.id)}
                >
                  <MaterialIcons
                    name={method.icon}
                    size={32}
                    color={selectedMethod === method.id ? COLORS.primary : '#94A3B8'}
                  />
                  <Text style={[styles.methodLabel, selectedMethod === method.id && styles.methodLabelActive]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, createMutation.isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={createMutation.isLoading}
          >
            {createMutation.isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="bolt" size={24} color="#fff" />
                <Text style={styles.submitButtonText}>Process Payment</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  content: { flex: 1, padding: 24 },
  section: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 12 },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currencySymbol: { fontSize: 32, fontWeight: '800', color: COLORS.primary, marginRight: 12 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '800', color: COLORS.text },
  input: {
    backgroundColor: COLORS.light,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
  },
  methodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  methodButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  methodButtonActive: { borderColor: COLORS.primary, backgroundColor: '#F0F9FF', borderWidth: 2 },
  methodLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 12 },
  methodLabelActive: { color: COLORS.primary },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    elevation: 4,
  },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '700', marginLeft: 10 },
  nfcContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  nfcTitle: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: 32 },
  nfcSubtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginTop: 12 },
  nfcAmount: { fontSize: 48, fontWeight: '900', color: COLORS.primary, marginTop: 48 },
  cancelButton: { marginTop: 64, padding: 16 },
  cancelButtonText: { color: COLORS.danger, fontWeight: '700', fontSize: 16 },
  qrContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  qrTitle: { fontSize: 48, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  qrSubtitle: { fontSize: 18, color: COLORS.textSecondary, marginBottom: 40 },
  qrCodeBox: { padding: 20, backgroundColor: 'white', borderRadius: 24, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2 },
  waitingBox: { flexDirection: 'row', alignItems: 'center', marginTop: 40 },
  waitingText: { fontSize: 16, color: COLORS.textSecondary },
  successBox: { width: 250, height: 250, alignItems: 'center', justifyContent: 'center' },
  successText: { fontSize: 32, fontWeight: 'bold', color: COLORS.secondary, marginTop: 10 },
  doneButton: { backgroundColor: COLORS.primary, paddingHorizontal: 60, paddingVertical: 18, borderRadius: 16, marginTop: 40 },
  doneButtonText: { color: 'white', fontSize: 18, fontWeight: '700' },
  checkoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  checkoutHeaderTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
});
