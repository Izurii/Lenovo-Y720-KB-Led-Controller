# Lenovo-Y720-KB-Led-Controller
[![Github releases (by asset)](https://img.shields.io/github/downloads/Izurii/Lenovo-Y720-KB-Led-Controller/total.svg)](https://github.com/Izurii/Lenovo-Y720-KB-Led-Controller/releases/) [![Dependency Status][depstat-image]][depstat-url] [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/donate/?hosted_button_id=VCESYBAUCTF5S)


This software controls the backlight of Lenovo Legion Y720 Keyboard on Linux, as the Lenovo didn't make the drivers/software for Linux.

It works mostly the same as the Lenovo Nerve Center, including the global hotkey of **Fn+Space** to change between profiles created by the user.

Here a screenshot:

![Screenshot from 2021-04-09 14-41-02](https://user-images.githubusercontent.com/46232520/114219873-a24fe100-9941-11eb-885e-57e28ce7df80.png)

# How to install

Download the latest version here: [Releases](https://github.com/Izurii/Lenovo-Y720-KB-Led-Controller/releases)

You can use the AppImage to run just once the software using this in a terminal with the folder you downloaded the software open

```
./Lenovo Y720 Keyboard LED Controller-x.AppImage
```

Or you can install the deb packages using:

```
sudo dpkg -i y720-kb-led-controller-x.deb
```

# How to grant access to /dev/hidraw0 automatically

Create a file called `/etc/udev/rules.d/99-hidraw-permissions.rules`:
```
KERNEL=="hidraw*", SUBSYSTEM=="hidraw", MODE="0664", GROUP="plugdev"
```

Add your user to the `plugdev` group:

```
usermod -a -G plugdev $USER
```

Reboot.

# How to build it yourself

```
git clone https://github.com/Izurii/Lenovo-Y720-KB-Led-Controller
yarn
yarn dist
```

# How to start using yarn

```
yarn start
```

[depstat-url]: https://david-dm.org/Izurii/Lenovo-Y720-KB-Led-Controller
[depstat-image]: https://david-dm.org/Izurii/Lenovo-Y720-KB-Led-Controller.svg?style=flat
