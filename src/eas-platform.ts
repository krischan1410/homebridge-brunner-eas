import { API, DynamicPlatformPlugin, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { Logger } from 'homebridge/lib/logger';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { EASTemperatureAccessory, uniqueId as temperatureUniqueId } from './eas-temperature-accessory';
import { EASRefillHintAccessory, uniqueId as refillHintUniqueId } from './eas-refill-hint-accessory';
import { Device } from './eas-accessory';
import { EASBroadcastReceiver } from './eas-broadcast-receiver';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class EASPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  private broadcastReceiver: EASBroadcastReceiver;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    // Updating characteristics values asynchronously by starting the listener service.
    this.broadcastReceiver = new EASBroadcastReceiver(this.config, this.log);

    if (!config) {
      this.log.error('Cannot find configuration for the plugin');
      return;
    }

    this.log.debug('Finished initializing platform:', this.config.name);

    // Homebridge 1.8.0 introduced a `log.success` method that can be used to log success messages
    // For users that are on a version prior to 1.8.0, we need a 'polyfill' for this method
    if (!log.success) {
      log.success = log.info;
    }

    Logger.setDebugEnabled(false);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Execute didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.checkTemperatureAccessories();
      this.checkRefillHintAccessories();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It simply adds teh found accessories to the list of accessories for use by checkAccessories().
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  private checkTemperatureAccessories() {
    const device: Device = {
      uniqueId: temperatureUniqueId,
      displayName: this.config.accessoryName,
    };

    const uuid = this.api.hap.uuid.generate(device.uniqueId);
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    let temperatureAccessory: EASTemperatureAccessory;

    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
      temperatureAccessory = new EASTemperatureAccessory(this, existingAccessory, this.broadcastReceiver);
    } else {
      this.log.info('Adding new accessory:', device.displayName);
      const accessory = new this.api.platformAccessory(device.displayName, uuid);
      accessory.context.device = device;
      temperatureAccessory = new EASTemperatureAccessory(this, accessory, this.broadcastReceiver);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
    this.broadcastReceiver.addTemperatureListener(
      newTemperature => temperatureAccessory.updateTemperature(newTemperature),
    );
    this.broadcastReceiver.addVersionListener(
      newVersion => temperatureAccessory.updateVersion(newVersion),
    );
  }

  private checkRefillHintAccessories() {
    const device: Device = {
      uniqueId: refillHintUniqueId,
      displayName: this.config.refillHint,
    };

    const uuid = this.api.hap.uuid.generate(device.uniqueId);
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    let refillHintAccessory: EASRefillHintAccessory | undefined = undefined;

    if (existingAccessory) {
      if (device.displayName) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        refillHintAccessory = new EASRefillHintAccessory(this, existingAccessory, this.broadcastReceiver);
      } else {
        // Remove platform accessories because when no longer configured.
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        this.log.info('Removed existing refillHint accessory from cache');
      }
    } else {
      if (device.displayName) {
        this.log.info('Adding new accessory:', device.displayName);
        const accessory = new this.api.platformAccessory(device.displayName, uuid);
        accessory.context.device = device;
        refillHintAccessory = new EASRefillHintAccessory(this, accessory, this.broadcastReceiver);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
    if (refillHintAccessory) {
      this.broadcastReceiver.addRefillHintListener(
        newRefillHint => refillHintAccessory.updateRefillHint(newRefillHint),
      );
    }
  }
}
