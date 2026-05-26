import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export const TransactionsScreen = () => {
  const mockTransactions = [
    { id: '1', description: 'Sample Sale', amount: 5000, status: 'completed', date: '2024-05-26T10:00:00Z' },
    { id: '2', description: 'Coffee Order', amount: 250, status: 'pending', date: '2024-05-26T11:30:00Z' },
  ];

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.left}>
        <Text style={styles.desc}>{item.description}</Text>
        <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>₱{(item.amount / 100).toFixed(2)}</Text>
        <Text style={[styles.status, { color: item.status === 'completed' ? '#10B981' : '#F59E0B' }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Transactions</Text>
      </View>
      <FlatList
        data={mockTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  list: {
    padding: 20,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  left: {
    flex: 1,
  },
  desc: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  date: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  status: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
  },
});
