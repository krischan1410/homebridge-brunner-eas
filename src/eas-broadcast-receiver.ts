import { Socket, createSocket } from 'dgram';
import { xml2js } from 'xml-js';

import { Stage, Status, defaultStatus, readStatus } from './status';
import { Logger, PlatformConfig } from 'homebridge';
import { DEFAULT_PORT } from './settings';

type TemperatureListener = (newTemperature: number) => void;
type RefillHintListener = (newRefillHint: boolean) => void;
type BurnOffStageListener = (newStage: Stage) => void;
type VersionListener = (newVersion: string) => void;

export class EASBroadcastReceiver {

  private status: Status = defaultStatus;

  private temperatureListeners: TemperatureListener[] = [];
  private refillHintListeners: RefillHintListener[] = [];
  private burnOffStageListeners: BurnOffStageListener[] = [];
  private versionListeners: VersionListener[] = [];

  get temperature(): number {
    return this.status.temperature;
  }

  get refillHint(): boolean {
    return this.status.refillNow;
  }

  constructor(
    config: PlatformConfig,
    private logger: Logger,
  ) {
    this.logger.warn('Now starting listener at port ' + config.port);

    const server = createSocket('udp4');
    server.bind(config.port ?? DEFAULT_PORT);

    // When udp server started and listening.
    server.on('listening', this.startListening(server));

    // When EAS send another broadcast message.
    server.on('message', this.readMessage);

    // Close connection if script stopped
    // exitHook(() => stopServer(server));
  }

  public addTemperatureListener(listener: TemperatureListener) {
    this.temperatureListeners.push(listener);
  }

  public removeTemperatureListener(listener: TemperatureListener) {
    const idx = this.temperatureListeners.findIndex(l => l === listener);
    if (idx >= 0) {
      this.temperatureListeners.splice(idx, 1);
    }
  }

  public addRefillHintListener(listener: RefillHintListener) {
    this.refillHintListeners.push(listener);
  }

  public removeRefillHintListener(listener: RefillHintListener) {
    const idx = this.refillHintListeners.findIndex(l => l === listener);
    if (idx >= 0) {
      this.refillHintListeners.splice(idx, 1);
    }
  }

  public addBurnOffStageListener(listener: BurnOffStageListener) {
    this.burnOffStageListeners.push(listener);
  }

  public removeBurnOffStageListener(listener: BurnOffStageListener) {
    const idx = this.burnOffStageListeners.findIndex(l => l === listener);
    if (idx >= 0) {
      this.burnOffStageListeners.splice(idx, 1);
    }
  }

  public addVersionListener(listener: VersionListener) {
    this.versionListeners.push(listener);
  }

  public removeVersionListener(listener: VersionListener) {
    const idx = this.versionListeners.findIndex(l => l === listener);
    if (idx >= 0) {
      this.versionListeners.splice(idx, 1);
    }
  }

  private startListening(server: Socket): () => void {
    return () => {
      const address = server.address();
      this.logger.info('UDP Server started and listening on ' + address.address + ':' + address.port);
    };
  }

  private readMessage: (message: Buffer) => void = message => {
    // EAS sends a null-terminated string buffer, so better remove everything after (including) the \0 char.
    const xml = message.toString().replace(/\0.*$/, '').trim();
    this.logger.debug(xml);

    // Convert the sent XML to JSON and filter for "bdle" objects (thus ignoring "d" objects).
    const root = xml2js(xml).elements[0];
    if (!root || root.name !== 'bdle') {
      return;
    }

    // Extract the attribute "stat" from root element and split the semicolon separated value of "text" subelement.
    const stage = root.attributes.stat;
    const values = root.elements[0]?.text?.split(';') as string[];
    if (!stage || values.length < 14) {
      return;
    }

    // Read and compare the new values with current status.
    this.logger.debug(JSON.stringify(values));
    const newStatus = readStatus(stage, values);
    this.logger.debug(JSON.stringify(this.status));

    if (this.status.temperature !== newStatus.temperature) {
      this.logger.info('Geänderte Temperatur ' + newStatus.temperature);
      this.temperatureListeners.forEach(setTemperature => setTemperature(newStatus.temperature));
    }
    if (this.status.burnOffStage !== newStatus.burnOffStage) {
      this.logger.info('Geänderte Abbrandstufe ' + newStatus.burnOffStage);
      this.burnOffStageListeners.forEach(setBurnOffStage => setBurnOffStage(newStatus.burnOffStage));
    }
    if (this.status.refillNow !== newStatus.refillNow) {
      this.logger.info('Geänderte Nachfüllhinweis ' + newStatus.refillNow);
      this.refillHintListeners.forEach(setRefillHint => setRefillHint(newStatus.refillNow));
    }
    if (this.status.vers !== newStatus.vers) {
      const newVersion = `${newStatus.vers.charAt(0)}.${newStatus.vers.substring(1)}`;
      this.logger.info('Geänderte Firmware-Version ' + newVersion);
      this.versionListeners.forEach(setVersion => setVersion(newVersion));
    }

    // Finally overwrite the status with new values.
    this.status = newStatus;
  };

  private stopServer(server: Socket){
    return () => {
      server.close();
      this.logger.info('Close Socket...');
    };
  }
}
