<p align="center">
  <img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

<span align="center">
  # Homebridge Brunner EAS Plugin
</span>

This is a simple Homebridge plugin providing access to the EAS device of Brunner (Elektrische Abbrand-Steuerung = Electric Burndown Control). It implements two accessories, the temperature sensor located inside the oven, and a read-only switch (or contact sensor) indicating the need for refill of the oven.

### Customise Plugin

You can configure the plugin by changing the following properties.
+ The `name` of the platform as used in the logs of Homebridge. The default value most probably fits.
+ The `accessoryName` of the EAS device. You may accept the default value, but feel free to change it to something personal, because this name is visibly in Home app.
+ The `port` number that this plugin listens to. This should fit - you can change this if your EAS device broadcasts to a different port.
+ The `refillHint` string, which defines - if set - the name of an additional switch accessory which is turned on when EAS advises to refill.
+ If the `hintAsSensor` is true, the refill hint is shown as a contact sensor (which is closed if hint is active) instead of a switch.
 