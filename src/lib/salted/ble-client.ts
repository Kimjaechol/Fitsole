/**
 * SALTED smart insole BLE client adapter with mock provider.
 * Per D-05, D-06: Mockable adapter interface since SALTED SDK is unavailable.
 * Real BLE integration activates when SDK access is obtained.
 */

import type {
  BleConnectionState,
  SaltedPressureFrame,
} from './types';

// ──────────────────────────────────────────────
// Adapter Interface
// ──────────────────────────────────────────────

/** Abstract adapter interface for SALTED insole connection */
export interface SaltedAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  startSession(onFrame: (frame: SaltedPressureFrame) => void): Promise<void>;
  stopSession(): Promise<SaltedPressureFrame[]>;
  getConnectionState(): BleConnectionState;
  isSupported(): boolean;
}

// ──────────────────────────────────────────────
// Web Bluetooth Adapter (real hardware)
// ──────────────────────────────────────────────

/**
 * Real Web Bluetooth adapter for SALTED insoles.
 * TODO: Replace placeholder service UUIDs with actual SALTED BLE UUIDs when SDK available.
 */
export class WebBluetoothSaltedAdapter implements SaltedAdapter {
  // TODO: Replace with actual SALTED service UUID
  private static readonly SALTED_SERVICE_UUID = '00001800-0000-1000-8000-00805f9b34fb';
  // TODO: Replace with actual SALTED characteristic UUID for pressure data
  private static readonly PRESSURE_CHAR_UUID = '00002a00-0000-1000-8000-00805f9b34fb';

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private connectionState: BleConnectionState = 'disconnected';
  private frames: SaltedPressureFrame[] = [];
  private onFrameCallback: ((frame: SaltedPressureFrame) => void) | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private uploadInterval: ReturnType<typeof setInterval> | null = null;
  private sessionStartTime = 0;

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  getConnectionState(): BleConnectionState {
    return this.connectionState;
  }

  async connect(): Promise<void> {
    if (!this.isSupported()) {
      this.connectionState = 'error';
      throw new Error('Web Bluetooth is not supported in this browser');
    }

    this.connectionState = 'connecting';

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'SALTED' }],
        optionalServices: [WebBluetoothSaltedAdapter.SALTED_SERVICE_UUID],
      });

      this.device.addEventListener('gattserverdisconnected', () => {
        this.connectionState = 'disconnected';
        this.cleanup();
      });

      this.server = await this.device.gatt!.connect();
      const service = await this.server.getPrimaryService(
        WebBluetoothSaltedAdapter.SALTED_SERVICE_UUID
      );
      this.characteristic = await service.getCharacteristic(
        WebBluetoothSaltedAdapter.PRESSURE_CHAR_UUID
      );

      this.connectionState = 'connected';
    } catch (err) {
      this.connectionState = 'error';
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.cleanup();
    if (this.server?.connected) {
      this.server.disconnect();
    }
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.connectionState = 'disconnected';
  }

  async startSession(onFrame: (frame: SaltedPressureFrame) => void): Promise<void> {
    if (this.connectionState !== 'connected' || !this.characteristic) {
      throw new Error('Not connected to SALTED insole');
    }

    this.frames = [];
    this.onFrameCallback = onFrame;
    this.sessionStartTime = Date.now();
    this.connectionState = 'streaming';

    // Request Wake Lock during session (RESEARCH pitfall #6)
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch {
      // Wake Lock is best-effort; continue without it
    }

    // Listen for BLE notifications
    this.characteristic.addEventListener(
      'characteristicvaluechanged',
      this.handleNotification
    );
    await this.characteristic.startNotifications();

    // Chunk-upload to server every 10 seconds during session
    this.uploadInterval = setInterval(() => {
      this.uploadChunk();
    }, 10_000);
  }

  async stopSession(): Promise<SaltedPressureFrame[]> {
    if (this.characteristic) {
      this.characteristic.removeEventListener(
        'characteristicvaluechanged',
        this.handleNotification
      );
      try {
        await this.characteristic.stopNotifications();
      } catch {
        // Ignore stop notification errors during disconnect
      }
    }

    this.cleanup();
    this.connectionState = 'connected';

    // Upload remaining frames
    await this.uploadChunk();

    const result = [...this.frames];
    this.frames = [];
    return result;
  }

  private handleNotification = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;

    // TODO: Parse actual SALTED BLE data format when SDK available
    // Current placeholder: parse DataView as pressure array
    const timestamp = Date.now() - this.sessionStartTime;
    const pressureArray: number[] = [];
    for (let i = 0; i < value.byteLength; i += 4) {
      if (i + 4 <= value.byteLength) {
        pressureArray.push(value.getFloat32(i, true));
      }
    }

    const frame: SaltedPressureFrame = {
      timestamp,
      pressureArray,
      imuData: null, // TODO: Parse IMU data from BLE payload
    };

    this.frames.push(frame);
    this.onFrameCallback?.(frame);
  };

  private cleanup(): void {
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
    this.onFrameCallback = null;
  }

  private async uploadChunk(): Promise<void> {
    if (this.frames.length === 0) return;

    // TODO: Implement actual server upload when API endpoint is ready
    // For now, frames are buffered in memory and returned on stopSession()
  }
}

// ──────────────────────────────────────────────
// Mock Provider (development/testing)
// ──────────────────────────────────────────────

/**
 * Mock SALTED provider generating realistic 5-min walking session data.
 * 100Hz sampling rate, ~300K frames over 5 minutes.
 * Simulates heel strike -> midfoot -> toe-off pressure progression per gait cycle.
 */
export class MockSaltedProvider implements SaltedAdapter {
  private connectionState: BleConnectionState = 'disconnected';
  private frames: SaltedPressureFrame[] = [];
  private streamInterval: ReturnType<typeof setInterval> | null = null;
  private onFrameCallback: ((frame: SaltedPressureFrame) => void) | null = null;
  private sessionStartTime = 0;

  /** Grid layout: 20 rows x 10 columns (200 sensors) */
  private static readonly GRID_ROWS = 20;
  private static readonly GRID_COLS = 10;
  private static readonly SENSOR_COUNT = 200;
  private static readonly SAMPLING_HZ = 100;

  /** Gait cycle duration in ms (typical walking ~1.0-1.2s per stride) */
  private static readonly GAIT_CYCLE_MS = 1100;

  isSupported(): boolean {
    return true;
  }

  getConnectionState(): BleConnectionState {
    return this.connectionState;
  }

  async connect(): Promise<void> {
    this.connectionState = 'connecting';
    // Simulate brief connection delay
    await new Promise((resolve) => setTimeout(resolve, 200));
    this.connectionState = 'connected';
  }

  async disconnect(): Promise<void> {
    this.stopStreaming();
    this.connectionState = 'disconnected';
  }

  async startSession(onFrame: (frame: SaltedPressureFrame) => void): Promise<void> {
    if (this.connectionState !== 'connected') {
      throw new Error('Not connected');
    }

    this.frames = [];
    this.onFrameCallback = onFrame;
    this.sessionStartTime = Date.now();
    this.connectionState = 'streaming';

    // Generate frames at 100Hz
    const intervalMs = 1000 / MockSaltedProvider.SAMPLING_HZ;
    this.streamInterval = setInterval(() => {
      const timestamp = Date.now() - this.sessionStartTime;
      const frame = this.generateFrame(timestamp);
      this.frames.push(frame);
      this.onFrameCallback?.(frame);
    }, intervalMs);
  }

  async stopSession(): Promise<SaltedPressureFrame[]> {
    this.stopStreaming();
    this.connectionState = 'connected';
    const result = [...this.frames];
    this.frames = [];
    return result;
  }

  private stopStreaming(): void {
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }
    this.onFrameCallback = null;
  }

  /**
   * Generate a single realistic pressure frame for the given timestamp.
   * Simulates gait cycle: heel strike -> midfoot loading -> forefoot push-off -> swing
   */
  private generateFrame(timestamp: number): SaltedPressureFrame {
    const { GRID_ROWS, GRID_COLS, SENSOR_COUNT, GAIT_CYCLE_MS } = MockSaltedProvider;

    // Phase within the gait cycle (0 to 1)
    const cyclePhase = (timestamp % GAIT_CYCLE_MS) / GAIT_CYCLE_MS;

    // Stance phase: 0-0.6 of cycle, swing phase: 0.6-1.0
    const isStance = cyclePhase < 0.6;

    const pressureArray = new Array(SENSOR_COUNT).fill(0);

    if (isStance) {
      const stancePhase = cyclePhase / 0.6; // 0 to 1 within stance

      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const idx = r * GRID_COLS + c;
          const rowNorm = r / (GRID_ROWS - 1); // 0=heel, 1=toe

          let pressure = 0;

          if (stancePhase < 0.2) {
            // Heel strike phase: high pressure in heel region (rows 0-5)
            if (rowNorm < 0.3) {
              pressure = 400 + 300 * (1 - rowNorm / 0.3) * (stancePhase / 0.2);
            }
          } else if (stancePhase < 0.5) {
            // Midfoot loading: pressure spreads across entire foot
            const loadingPhase = (stancePhase - 0.2) / 0.3;
            if (rowNorm < 0.3) {
              // Heel decreasing
              pressure = 700 * (1 - loadingPhase * 0.6) * (1 - rowNorm / 0.3);
            } else if (rowNorm < 0.7) {
              // Midfoot increasing
              pressure = 300 * loadingPhase;
            } else {
              // Forefoot starting to load
              pressure = 200 * loadingPhase * ((rowNorm - 0.7) / 0.3);
            }
          } else {
            // Toe-off: high pressure in forefoot (rows 14-19)
            const pushPhase = (stancePhase - 0.5) / 0.5;
            if (rowNorm > 0.7) {
              pressure = 500 + 200 * ((rowNorm - 0.7) / 0.3) * (1 - pushPhase * 0.3);
            } else if (rowNorm > 0.3) {
              pressure = 150 * (1 - pushPhase);
            }
          }

          // Medial-lateral distribution (slightly more medial = mild pronation)
          const colNorm = c / (GRID_COLS - 1);
          const medialBias = colNorm < 0.5 ? 1.1 : 0.9;

          // Add noise for realism
          const noise = (Math.random() - 0.5) * 30;

          pressureArray[idx] = Math.max(0, pressure * medialBias + noise);
        }
      }
    }
    // Swing phase: all zeros (foot in the air)

    // Generate IMU data: walking acceleration patterns
    const imuData = this.generateImuData(cyclePhase, isStance);

    return {
      timestamp,
      pressureArray,
      imuData,
    };
  }

  /**
   * Generate realistic IMU data for a walking gait cycle.
   */
  private generateImuData(
    cyclePhase: number,
    isStance: boolean
  ): SaltedPressureFrame['imuData'] {
    // Vertical acceleration (accelZ): impact at heel strike, push-off at toe-off
    let accelZ = 9.81; // gravity baseline
    if (isStance) {
      const stancePhase = cyclePhase / 0.6;
      if (stancePhase < 0.1) {
        // Heel strike impact
        accelZ += 8.0 * (stancePhase / 0.1);
      } else if (stancePhase < 0.2) {
        accelZ += 8.0 * (1 - (stancePhase - 0.1) / 0.1);
      } else if (stancePhase > 0.8) {
        // Toe-off push
        accelZ += 4.0 * ((stancePhase - 0.8) / 0.2);
      }
    }

    // Forward acceleration (accelY): deceleration at heel strike, acceleration at push-off
    let accelY = 0;
    if (isStance) {
      const stancePhase = cyclePhase / 0.6;
      accelY = stancePhase < 0.3 ? -2.0 * (1 - stancePhase / 0.3) : 1.5 * ((stancePhase - 0.3) / 0.7);
    }

    // Lateral acceleration (accelX): mild medial shift
    const accelX = 0.3 * Math.sin(cyclePhase * 2 * Math.PI) + (Math.random() - 0.5) * 0.2;

    // Gyroscope: angular velocity from ankle rotation
    const gyroX = isStance
      ? 50 * Math.sin(cyclePhase / 0.6 * Math.PI) * (Math.PI / 180)
      : 30 * Math.sin((cyclePhase - 0.6) / 0.4 * Math.PI) * (Math.PI / 180);
    const gyroY = (Math.random() - 0.5) * 5 * (Math.PI / 180);
    const gyroZ = (Math.random() - 0.5) * 3 * (Math.PI / 180);

    return {
      accelX: accelX + (Math.random() - 0.5) * 0.1,
      accelY: accelY + (Math.random() - 0.5) * 0.1,
      accelZ: accelZ + (Math.random() - 0.5) * 0.2,
      gyroX,
      gyroY,
      gyroZ,
    };
  }
}

// ──────────────────────────────────────────────
// Factory
// ──────────────────────────────────────────────

/**
 * Factory function: returns MockSaltedProvider if useMock=true or WebBluetooth unavailable.
 */
export function createSaltedClient(useMock?: boolean): SaltedAdapter {
  if (useMock) {
    return new MockSaltedProvider();
  }

  const realAdapter = new WebBluetoothSaltedAdapter();
  if (!realAdapter.isSupported()) {
    return new MockSaltedProvider();
  }

  return realAdapter;
}
