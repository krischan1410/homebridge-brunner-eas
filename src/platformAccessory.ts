import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { BrunnerEASHomebridgePlatform } from './platform';
import { EASBroadcastListener } from './broadcast';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class BrunnerEASPlatformAccessory {
  private service: Service;
  private listener: EASBroadcastListener;

  constructor(
    private readonly platform: BrunnerEASHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Brunner')
      .setCharacteristic(this.platform.Characteristic.Model, 'EAS')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '<unknown>');

    // get the TemperatureSensor service if it exists, otherwise create a new TemperatureSensor service
    this.service = this.accessory.getService(this.platform.Service.TemperatureSensor)
                || this.accessory.addService(this.platform.Service.TemperatureSensor);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/TemperatureSensor

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this)); // GET - bind to the `getOn` method below

    // Updating characteristics values asynchronouslyby starting the listener service.
    this.platform.log.warn('Now starting listener at port ' + this.platform.config.port);
    this.listener = new EASBroadcastListener(this.platform.config, this.platform.log, this.updateTemperature);
  }

  /**
   *
   * @param newTemperature
   */
  private updateTemperature: (newTemperature: number) => void = newTemperature =>
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, newTemperature);

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possible. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   */
  async getCurrentTemperature(): Promise<CharacteristicValue> {
    const currentTemperature = this.listener.temperature;

    this.platform.log.debug('Get Characteristic CurrentTemperature ->', currentTemperature);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return currentTemperature;
  }
}
