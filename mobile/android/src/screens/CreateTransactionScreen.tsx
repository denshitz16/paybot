import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { useMutation, useQuery } from 'react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { WebView } from 'react-native-webview';
import QRCode from 'react-native-qrcode-svg';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#3B82F6', // Blue
  secondary: '#10B981', // Green
  danger: '#EF4444',
  dark: '#111827',
  light: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  maya: '#00BA97',
};

const PAYMENT_METHODS = [
  { id: 'maya', label: 'Maya QR', icon: 'qr-code-2', color: '#00BA97' },
  { id: 'card', label: 'Card Payment', icon: 'credit-card', color: '#3B82F6' },
  { id: 'gcash', label: 'GCash', icon: 'phone-android', color: '#0055BA' },
  { id: 'grabpay', label: 'GrabPay', icon: 'account-balance-wallet', color: '#00B14F' },
];

const api = {
  createTransaction: async (token, terminalId, data) => {
    const response = await fetch(
      `https://telegram.drl-developers.info/api/v1/pos-terminals/${terminalId}/transactions`,
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

const KeypadButton = ({ label, onPress, type = 'number', icon = null }) => (
  <TouchableOpacity
    style={[
      styles.keypadButton,
      type === 'action' && styles.keypadButtonAction,
      type === 'delete' && styles.keypadButtonDelete,
    ]}
    onPress={() => onPress(label)}
    activeOpacity={0.6}
  >
    {icon ? (
      <MaterialIcons name={icon} size={28} color={type === 'number' ? COLORS.text : '#fff'} />
    ) : (
      <Text style={[styles.keypadButtonText, type !== 'number' && styles.keypadButtonTextAction]}>
        {label}
      </Text>
    )}
  </TouchableOpacity>
);

export const CreateTransactionScreen = ({ route, navigation }) => {
  const { terminal } = route.params;
  const [token, setToken] = useState(null);
  const [amount, setAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('maya');
  const [showWebView, setShowWebView] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [qrContent, setQrContent] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [showMethodSelector, setShowMethodSelector] = useState(false);

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('auth_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  const handleKeyPress = (key) => {
    if (key === '⌫') {
      setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }

    if (key === '.') {
      if (amount.includes('.')) return;
      setAmount((prev) => prev + '.');
      return;
    }

    setAmount((prev) => {
      if (prev === '0') return key;
      // Limit decimals to 2
      if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev;
      return prev + key;
    });
  };

  const createMutation = useMutation(
    (data) => api.createTransaction(token, terminal.id, data),
    {
      onSuccess: (data) => {
        if (data.success) {
          setOrderId(data.order_id);
          if (data.qr_content) {
            setQrContent(data.qr_content);
          } else if (data.payment_url) {
            setCheckoutUrl(data.payment_url);
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

  useEffect(() => {
    let interval;
    if (orderId && (qrContent || checkoutUrl) && paymentStatus === 'pending') {
      interval = setInterval(async () => {
        try {
          const response = await fetch(
            `https://telegram.drl-developers.info/api/v1/pos-terminals/transactions/${orderId}`,
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
  }, [orderId, qrContent, checkoutUrl, paymentStatus, token]);

  const handleProcessPayment = () => {
    const floatAmount = parseFloat(amount);
    if (isNaN(floatAmount) || floatAmount <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid amount',
        text2: 'Please enter an amount greater than 0',
      });
      return;
    }

    createMutation.mutate({
      description: description || 'POS Sale',
      amount: floatAmount * 100, // Convert to cents for API
      payment_method: selectedMethod,
    });
  };

  if (showWebView && checkoutUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.checkoutHeader}>
          <TouchableOpacity onPress={() => setShowWebView(false)}>
            <MaterialIcons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.checkoutHeaderTitle}>Card Payment</Text>
          <View style={{ width: 24 }} />
        </View>

        <WebView
          source={{ uri: checkoutUrl }}
          style={{ flex: 1 }}
        />

        {paymentStatus === 'completed' && (
           <View style={styles.fullScreenSuccess}>
             <MaterialIcons name="check-circle" size={100} color={COLORS.secondary} />
             <Text style={styles.successText}>PAID SUCCESSFULLY</Text>
             <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
               <Text style={styles.doneButtonText}>Finish</Text>
             </TouchableOpacity>
           </View>
        )}
      </SafeAreaView>
    );
  }

  if (qrContent) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.qrHeader}>
          <TouchableOpacity onPress={() => { setQrContent(null); setOrderId(null); setPaymentStatus('pending'); }}>
            <MaterialIcons name="arrow-back" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.mayaLogoContainer}>
             <Text style={styles.mayaLogoText}>maya</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.qrContent}>
           <Text style={styles.qrAmount}>₱{parseFloat(amount).toFixed(2)}</Text>
           <Text style={styles.qrInstruction}>Scan to pay with Maya</Text>

           <View style={styles.qrCard}>
             {paymentStatus === 'completed' ? (
                <View style={styles.successInner}>
                   <MaterialIcons name="check-circle" size={120} color={COLORS.secondary} />
                   <Text style={styles.successTitle}>COMPLETED</Text>
                   <Text style={styles.t0Badge}>T+0 SETTLED</Text>
                </View>
             ) : (
               <QRCode
                 value={qrContent}
                 size={width * 0.65}
                 color="black"
                 backgroundColor="white"
               />
             )}
           </View>

           {paymentStatus === 'pending' && (
             <View style={styles.statusIndicator}>
               <ActivityIndicator color={COLORS.maya} />
               <Text style={styles.statusText}>Waiting for payment...</Text>
             </View>
           )}

           {paymentStatus === 'completed' && (
             <TouchableOpacity style={styles.printButton} onPress={() => navigation.goBack()}>
                <MaterialIcons name="print" size={24} color="#fff" />
                <Text style={styles.printButtonText}>Print Receipt</Text>
             </TouchableOpacity>
           )}
        </View>

        <View style={styles.qrFooter}>
           <Text style={styles.terminalCodeLabel}>Terminal: {terminal.terminal_code}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />

      {/* POS Display */}
      <View style={styles.displayContainer}>
        <View style={styles.displayHeader}>
           <TouchableOpacity onPress={() => navigation.goBack()}>
             <MaterialIcons name="menu" size={28} color="#fff" />
           </TouchableOpacity>
           <Text style={styles.displayTitle}>{terminal.terminal_name}</Text>
           <MaterialIcons name="wifi" size={20} color={COLORS.secondary} />
        </View>

        <View style={styles.amountDisplay}>
           <Text style={styles.currencyLabel}>PHP</Text>
           <Text style={styles.amountText}>{parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>

        <View style={styles.methodSelector}>
           <TouchableOpacity
             style={styles.methodToggle}
             onPress={() => setShowMethodSelector(true)}
           >
              <MaterialIcons
                name={PAYMENT_METHODS.find(m => m.id === selectedMethod)?.icon}
                size={20}
                color="#fff"
              />
              <Text style={styles.methodToggleText}>
                {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.label}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#fff" />
           </TouchableOpacity>
        </View>
      </View>

      {/* Numeric Keypad */}
      <View style={styles.keypadContainer}>
        <View style={styles.keypadRow}>
          <KeypadButton label="1" onPress={handleKeyPress} />
          <KeypadButton label="2" onPress={handleKeyPress} />
          <KeypadButton label="3" onPress={handleKeyPress} />
        </View>
        <View style={styles.keypadRow}>
          <KeypadButton label="4" onPress={handleKeyPress} />
          <KeypadButton label="5" onPress={handleKeyPress} />
          <KeypadButton label="6" onPress={handleKeyPress} />
        </View>
        <View style={styles.keypadRow}>
          <KeypadButton label="7" onPress={handleKeyPress} />
          <KeypadButton label="8" onPress={handleKeyPress} />
          <KeypadButton label="9" onPress={handleKeyPress} />
        </View>
        <View style={styles.keypadRow}>
          <KeypadButton label="." onPress={handleKeyPress} />
          <KeypadButton label="0" onPress={handleKeyPress} />
          <KeypadButton label="⌫" onPress={handleKeyPress} type="delete" icon="backspace" />
        </View>

        <TouchableOpacity
          style={[styles.chargeButton, createMutation.isLoading && { opacity: 0.7 }]}
          onPress={handleProcessPayment}
          disabled={createMutation.isLoading}
        >
          {createMutation.isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.chargeButtonText}>CHARGE</Text>
              <MaterialIcons name="chevron-right" size={28} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Payment Method Modal */}
      <Modal
        visible={showMethodSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMethodSelector(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMethodSelector(false)}
        >
          <View style={styles.modalContent}>
             <Text style={styles.modalTitle}>Select Payment Method</Text>
             {PAYMENT_METHODS.map((method) => (
               <TouchableOpacity
                 key={method.id}
                 style={[
                   styles.methodItem,
                   selectedMethod === method.id && styles.methodItemActive
                 ]}
                 onPress={() => {
                   setSelectedMethod(method.id);
                   setShowMethodSelector(false);
                 }}
               >
                 <View style={[styles.methodIconContainer, { backgroundColor: method.color }]}>
                    <MaterialIcons name={method.icon} size={24} color="#fff" />
                 </View>
                 <Text style={styles.methodItemLabel}>{method.label}</Text>
                 {selectedMethod === method.id && (
                    <MaterialIcons name="check" size={24} color={COLORS.primary} />
                 )}
               </TouchableOpacity>
             ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  displayContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  displayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  displayTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  amountDisplay: {
    alignItems: 'center',
    marginVertical: 40,
  },
  currencyLabel: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  amountText: {
    color: '#fff',
    fontSize: 64,
    fontWeight: '700',
  },
  methodSelector: {
    alignItems: 'center',
  },
  methodToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 10,
  },
  methodToggleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  keypadContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  keypadButton: {
    width: (width - 60) / 3,
    height: 70,
    backgroundColor: COLORS.light,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadButtonText: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.text,
  },
  keypadButtonDelete: {
    backgroundColor: '#FEE2E2',
  },
  chargeButton: {
    backgroundColor: COLORS.primary,
    height: 70,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 10,
  },
  chargeButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  methodItemActive: {
    backgroundColor: '#F0F7FF',
  },
  methodIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  methodItemLabel: {
    flex: 1,
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '600',
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  mayaLogoContainer: {
    backgroundColor: COLORS.maya,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mayaLogoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  qrContent: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 20,
  },
  qrAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  qrInstruction: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginVertical: 10,
  },
  qrCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 30,
    marginTop: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    gap: 10,
  },
  statusText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  qrFooter: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
  },
  terminalCodeLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  successInner: {
    width: width * 0.65,
    height: width * 0.65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginTop: 15,
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
  printButton: {
    backgroundColor: COLORS.dark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 40,
    gap: 10,
  },
  printButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkoutHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  fullScreenSuccess: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  successText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginVertical: 30,
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 60,
    paddingVertical: 15,
    borderRadius: 30,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

