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
  private infoService: Service;

  constructor(
    private readonly platform: EASPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly broadcastReceiver: EASBroadcastReceiver,
  ) {

    // set accessory information
    this.infoService = this.accessory.getService(this.platform.Service.AccessoryInformation)!;
    this.infoService.setCharacteristic(this.platform.Characteristic.Manufacturer, 'Brunner');
    this.infoService.setCharacteristic(this.platform.Characteristic.Model, 'EAS');

    // Look up configuration of service type
    const serviceType = this.platform.config.hintAsSensor
      ? this.platform.Service.ContactSensor
      : this.platform.Service.Switch;
    // get the service if it exists, otherwise create a new service
    this.service = this.accessory.getService(serviceType)
                || this.accessory.addService(serviceType);

    // Remove any existing stale service.
    const otherServiceType = this.platform.config.hintAsSensor
      ? this.platform.Service.Switch
      : this.platform.Service.ContactSensor;
    const staleService = this.accessory.getService(otherServiceType);
    if (staleService) {
      this.accessory.removeService(staleService);
    }

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);

    // register handlers for the current On/ContactSensorState Characteristic.
    if (this.platform.config.hintAsSensor) {
      this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState)
        .onGet(this.getCurrentRefillHint.bind(this));
    } else {
      this.service.getCharacteristic(this.platform.Characteristic.On)
        .onGet(this.getCurrentRefillHint.bind(this))
        .onSet(this.dontTouchIt.bind(this));
    }
  }

  /**
   *
   * @param newBurnOffStage
   */
  public updateRefillHint: (newRefillHint: boolean) => void = newRefillHint => {
    if (this.platform.config.hintAsSensor) {
      this.service.updateCharacteristic(this.platform.Characteristic.ContactSensorState,
        this.toSensorState(newRefillHint));
    } else {
      this.service.updateCharacteristic(this.platform.Characteristic.On, newRefillHint);
    }
  };

  /**
   *
   * @param newVersion
   */
  public updateVersion: (newVersion: string) => void = newVersion => {
    this.infoService.setCharacteristic(this.platform.Characteristic.FirmwareRevision, newVersion);
  };

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possible. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   */
  async getCurrentRefillHint(): Promise<CharacteristicValue> {
    const currentRefillHint = this.platform.config.hintAsSensor
      ? this.toSensorState(this.broadcastReceiver.refillHint)
      : this.broadcastReceiver.refillHint;

    this.platform.log.debug('Get Characteristic CurrentRefillHint ->', currentRefillHint);
    return currentRefillHint;
  }

  async dontTouchIt(newValue: unknown): Promise<void> {
    const realValue = this.broadcastReceiver.refillHint;
    this.platform.log.debug(`Dont't touch this, newValue: ${newValue}, realValue: ${realValue}`);
    if (newValue !== realValue) {
      setTimeout(() => this.service.setCharacteristic(this.platform.Characteristic.On, realValue), 1000);
    }
  }

  private toSensorState(contact: boolean): number {
    return contact
      ? this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED
      : this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
  }
}

