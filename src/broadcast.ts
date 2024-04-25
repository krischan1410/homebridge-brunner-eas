import { Socket, createSocket } from 'dgram';
import { xml2js } from 'xml-js';

import { Status, mergeStatus } from './status';
import { Logger, PlatformConfig } from 'homebridge';


export class EASBroadcastListener {

  private DEFAULT_PORT = 45454;

  private status: Status = { temperature: 18 } as Status;

  get temperature(): number {
    return this.status.temperature;
  }

  constructor(
    config: PlatformConfig,
    private logger: Logger,
    private temperatureSetter: (newTemperature: number) => void,
  ) {
    const server = createSocket('udp4');
    server.bind(config.port ?? this.DEFAULT_PORT);

    // When udp server started and listening.
    server.on('listening', this.startListening(server));

    // When EAS send another broadcast message.
    server.on('message', this.readMessage);

    // Close connection if script stopped
    // exitHook(() => stopServer(server));
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

    // Merge the new values into current status.
    if (mergeStatus(this.status, stage, values)) {
      this.logger.info('Geänderte Temperatur ' + this.status.temperature + ' oder Abbrandstufe ' + this.status.burnOffStage);
      this.temperatureSetter(this.status.temperature);
    }
  };

  private stopServer(server: Socket){
    return () => {
      server.close();
      this.logger.info('Close Socket...');
    };
  }
}
