import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { SmartSwitchScreen } from './src/screens/SmartSwitchScreen';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F8FB' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SmartSwitchScreen />
    </SafeAreaView>
  );
}
