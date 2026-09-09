import 'package:flutter/material.dart';
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

  IconData _getIcon(String type) {
    switch (type) {
      case 'fan': return Icons.mode_fan_off_outlined;
      case 'socket': return Icons.power_outlined;
      case 'chandelier': return Icons.auto_awesome;
      default: return Icons.lightbulb_outline;
    }
  }

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
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle, color: Colors.blueAccent),
            onPressed: () {},
          )
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Master card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.black.withOpacity(0.05)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Smart Touch Switch (4-Gang)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    Text('$activeCount switches turned on', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                  ],
                ),
                Row(
                  children: [
                    OutlinedButton(
                      onPressed: () => ref.read(switchChannelsProvider.notifier).setAll(false),
                      child: const Text('All Off'),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () => ref.read(switchChannelsProvider.notifier).setAll(true),
                      child: const Text('All On'),
                    ),
                  ],
                )
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Grid
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
                    boxShadow: [
                      BoxShadow(
                        color: ch.isOn ? Colors.blueAccent.withOpacity(0.08) : Colors.black.withOpacity(0.02),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      )
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Icon(_getIcon(ch.type), color: ch.isOn ? Colors.amber.shade700 : Colors.grey, size: 28),
                          Text(ch.isOn ? 'ON' : 'OFF', style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: ch.isOn ? Colors.green : Colors.grey,
                            fontSize: 11,
                          )),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(ch.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), maxLines: 1),
                          const SizedBox(height: 4),
                          Text(ch.isOn ? 'Power active' : 'Standby', style: TextStyle(color: Colors.grey.shade500, fontSize: 10)),
                        ],
                      )
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
}
