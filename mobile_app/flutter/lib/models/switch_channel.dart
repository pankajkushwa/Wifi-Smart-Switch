class SwitchChannel {
  final int gangId;
  final String name;
  final String type; // fan, light, socket, chandelier
  final int gpioPin;
  final bool isOn;
  final int remainingTimerSec;

  SwitchChannel({
    required this.gangId,
    required this.name,
    required this.type,
    required this.gpioPin,
    required this.isOn,
    this.remainingTimerSec = 0,
  });

  SwitchChannel copyWith({
    bool? isOn,
    int? remainingTimerSec,
  }) {
    return SwitchChannel(
      gangId: gangId,
      name: name,
      type: type,
      gpioPin: gpioPin,
      isOn: isOn ?? this.isOn,
      remainingTimerSec: remainingTimerSec ?? this.remainingTimerSec,
    );
  }
}
