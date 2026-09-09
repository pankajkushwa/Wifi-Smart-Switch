import { CodeFileEntry } from './firmwareFilesData';

export const mobileFiles: CodeFileEntry[] = [
  {
    path: 'mobile_app/flutter/lib/screens/home_screen.dart',
    name: 'home_screen.dart',
    category: 'mobile_flutter',
    language: 'dart',
    description: 'Flutter Home UI: Tuya / Smart Life Switch Grid with Riverpod State',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/switch_channel.dart';

final switchChannelsProvider = StateNotifierProvider<SwitchChannelsNotifier, List<SwitchChannel>>((ref) {
  return SwitchChannelsNotifier();
});

class SwitchChannelsNotifier extends StateNotifier<List<SwitchChannel>> {
  SwitchChannelsNotifier() : super([
    SwitchChannel(gangId: 1, name: 'Main Chandelier', type: 'chandelier', gpioPin: 4, isOn: true),
    SwitchChannel(gangId: 2, name: 'Ceiling Fan', type: 'fan', gpioPin: 5, isOn: false),
    SwitchChannel(gangId: 3, name: 'Ambient Downlights', type: 'light', gpioPin: 6, isOn: true),
    SwitchChannel(gangId: 4, name: 'Balcony Strip Light', type: 'light', gpioPin: 7, isOn: false),
  ]);

  void toggle(int gangId) {
    state = state.map((ch) {
      if (ch.gangId == gangId) {
        return ch.copyWith(isOn: !ch.isOn);
      }
      return ch;
    }).toList();
  }

  void setAll(bool isOn) {
    state = state.map((ch) => ch.copyWith(isOn: isOn)).toList();
  }
}

class HomeScreen extends ConsumerWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final channels = ref.watch(switchChannelsProvider);
    final activeCount = channels.where((c) => c.isOn).length;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('My Home', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 18)),
            Text('Living Room • $activeCount on', style: const TextStyle(color: Colors.green, fontSize: 11)),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Switch Grid
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: channels.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.15,
            ),
            itemBuilder: (ctx, idx) {
              final ch = channels[idx];
              return InkWell(
                onTap: () => ref.read(switchChannelsProvider.notifier).toggle(ch.gangId),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: ch.isOn ? Colors.blueAccent.withOpacity(0.4) : Colors.black.withOpacity(0.06),
                      width: ch.isOn ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Icon(Icons.lightbulb_outline, color: ch.isOn ? Colors.amber.shade700 : Colors.grey, size: 28),
                          Text(ch.isOn ? 'ON' : 'OFF', style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: ch.isOn ? Colors.green : Colors.grey,
                            fontSize: 11,
                          )),
                        ],
                      ),
                      Text(ch.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), maxLines: 1),
                    ],
                  ),
                ),
              );
            },
          )
        ],
      ),
    );
  }
}`
  },
  {
    path: 'mobile_app/flutter/pubspec.yaml',
    name: 'pubspec.yaml',
    category: 'mobile_flutter',
    language: 'yaml',
    description: 'Flutter Package Manifest & Dependencies (Riverpod, MQTT Client)',
    content: `name: smart_touch_switch
description: Commercial ESP32-S3 Smart Touch Switch Companion App
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.4.9
  mqtt_client: ^10.2.0
  flutter_spinkit: ^5.2.0
  shared_preferences: ^2.2.2
  cupertino_icons: ^1.0.6

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true`
  },
  {
    path: 'mobile_app/react_native/src/screens/SmartSwitchScreen.tsx',
    name: 'SmartSwitchScreen.tsx',
    category: 'mobile_rn',
    language: 'typescript',
    description: 'React Native Smart Life Dashboard (TypeScript + Haptics)',
    content: `import React, { useState } from 'react';
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Home</Text>
        <Text style={styles.headerSubtitle}>Living Room • {activeCount} switches on</Text>
      </View>

      <FlatList
        data={channels}
        numColumns={2}
        keyExtractor={item => item.gangId.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => toggleGang(item.gangId)}
            style={[styles.tile, item.isOn ? styles.tileOn : styles.tileOff]}
          >
            <Text style={styles.channelName}>{item.name}</Text>
            <Text>{item.isOn ? 'ON' : 'OFF'}</Text>
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
  tile: { flex: 1, margin: 6, padding: 16, height: 130, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1 },
  tileOn: { borderColor: '#93C5FD', backgroundColor: '#EFF6FF' },
  tileOff: { borderColor: '#E2E8F0' },
  channelName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
});`
  },
  {
    path: 'mobile_app/react_native/package.json',
    name: 'package.json',
    category: 'mobile_rn',
    language: 'json',
    description: 'React Native NPM Dependencies & Build Scripts',
    content: `{
  "name": "SmartTouchSwitchApp",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "start": "react-native start"
  },
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.4",
    "react-native-svg": "^14.1.0",
    "react-native-vector-icons": "^10.0.3"
  },
  "devDependencies": {
    "@types/react": "~18.2.45",
    "@types/react-native": "~0.73.0",
    "typescript": "^5.0.4"
  }
}`
  }
];
