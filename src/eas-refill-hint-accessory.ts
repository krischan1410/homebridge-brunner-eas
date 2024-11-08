import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { EASPlatform } from './eas-platform';
import { EASBroadcastReceiver } from './eas-broadcast-receiver';
import { EASAccessory } from './eas-accessory';

export const uniqueId = 'brunner-eas-device-1';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class EASRefillHintAccessory implements EASAccessory {
  private service: Service;

  constructor(
    private readonly platform: EASPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly broadcastReceiver: EASBroadcastReceiver,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Brunner')
      .setCharacteristic(this.platform.Characteristic.Model, 'EAS')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '<unknown>');

    // get the Switch service if it exists, otherwise create a new Switch service
    this.service = this.accessory.getService(this.platform.Service.Switch)
                || this.accessory.addService(this.platform.Service.Switch);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Switch
    this.platform.log.info('First calue of On: ' + this.service.getCharacteristic(this.platform.Characteristic.On).value);

    // register handlers for the current On Characteristic.
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.getCurrentRefillHint.bind(this))
      .onSet(this.dontTouchIt.bind(this));
  }

  /**
   *
   * @param newBurnOffStage
   */
  public updateRefillHint: (newRefillHint: boolean) => void = newRefillHint =>
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(newRefillHint);

  /**
   *
   * @param newVersion
   */
  public updateVersion: (newVersion: string) => void = newVersion => {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, newVersion);
  };

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possible. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   */
  async getCurrentRefillHint(): Promise<CharacteristicValue> {
    const currentRefillHint = this.broadcastReceiver.refillHint;

    this.platform.log.debug('Get Characteristic CurrentRefillHint ->', currentRefillHint);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return currentRefillHint;
  }

  async dontTouchIt(newValue: unknown): Promise<void> {
    const realValue = this.broadcastReceiver.refillHint;
    this.platform.log.debug(`Dont't touch this, newValue: ${newValue}, realValue: ${realValue}`);
    if (newValue !== realValue) {
      setTimeout(() => this.updateRefillHint(realValue), 1000);
    }
  }
}
