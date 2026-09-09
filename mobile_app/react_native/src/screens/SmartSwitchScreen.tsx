import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Vibration } from 'react-native';

export interface ChannelItem {
  gangId: number;
  name: string;
  type: string;
  gpio: number;
  isOn: boolean;
}

export const SmartSwitchScreen: React.FC = () => {
  const [channels, setChannels] = useState<ChannelItem[]>([
    { gangId: 1, name: 'Main Chandelier', type: 'chandelier', gpio: 4, isOn: true },
    { gangId: 2, name: 'Ceiling Fan', type: 'fan', gpio: 5, isOn: false },
    { gangId: 3, name: 'Ambient Downlights', type: 'light', gpio: 6, isOn: true },
    { gangId: 4, name: 'Balcony Strip Light', type: 'light', gpio: 7, isOn: false },
  ]);

  const activeCount = channels.filter(c => c.isOn).length;

  const toggleGang = (gangId: number) => {
    Vibration.vibrate(10);
    setChannels(prev => prev.map(ch => ch.gangId === gangId ? { ...ch, isOn: !ch.isOn } : ch));
  };

  const setAll = (state: boolean) => {
    setChannels(prev => prev.map(ch => ({ ...ch, isOn: state })));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Home</Text>
        <Text style={styles.headerSubtitle}>Living Room • {activeCount} switches on</Text>
      </View>

      {/* Master Overview Card */}
      <View style={styles.masterCard}>
        <View>
          <Text style={styles.masterTitle}>Smart Switch (4-Gang)</Text>
          <Text style={styles.masterStatus}>ESP32-S3 Online • Wi-Fi Connected</Text>
        </View>
        <View style={styles.masterActions}>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setAll(false)}>
            <Text style={styles.btnSecondaryText}>All Off</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setAll(true)}>
            <Text style={styles.btnPrimaryText}>All On</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid of Appliance Cards */}
      <FlatList
        data={channels}
        numColumns={2}
        keyExtractor={item => item.gangId.toString()}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => toggleGang(item.gangId)}
            style={[styles.tile, item.isOn ? styles.tileOn : styles.tileOff]}
          >
            <View style={styles.tileTop}>
              <Text style={styles.tileBadge}>G{item.gangId}</Text>
              <Text style={[styles.statusText, item.isOn ? styles.statusOn : styles.statusOff]}>
                {item.isOn ? 'ON' : 'OFF'}
              </Text>
            </View>

            <View style={styles.tileBottom}>
              <Text style={styles.channelName}>{item.name}</Text>
              <Text style={styles.channelSubtext}>{item.isOn ? 'Power active' : 'Standby'}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FB', padding: 16 },
  header: { marginBottom: 14, paddingTop: 10 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  headerSubtitle: { fontSize: 12, color: '#10B981', marginTop: 2, fontWeight: '600' },
  masterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  masterTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  masterStatus: { fontSize: 11, color: '#64748B', marginTop: 2 },
  masterActions: { flexDirection: 'row', gap: 8 },
  btnSecondary: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnSecondaryText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  btnPrimary: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  btnPrimaryText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  grid: { paddingBottom: 20 },
  tile: {
    flex: 1,
    margin: 6,
    padding: 16,
    height: 130,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  tileOn: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
    elevation: 3,
  },
  tileOff: {
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileBadge: { fontSize: 11, fontWeight: 'bold', color: '#94A3B8' },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  statusOn: { color: '#2563EB' },
  statusOff: { color: '#94A3B8' },
  tileBottom: { marginTop: 10 },
  channelName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  channelSubtext: { fontSize: 10, color: '#64748B', marginTop: 2 },
});
