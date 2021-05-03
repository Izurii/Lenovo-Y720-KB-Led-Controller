# Lenovo-Y720-KB-Led-Controller
[![Github releases (by asset)](https://img.shields.io/github/downloads/Izurii/Lenovo-Y720-KB-Led-Controller/total.svg)](https://github.com/Izurii/Lenovo-Y720-KB-Led-Controller/releases/)

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

# How to build it yourself

```
git clone https://github.com/Izurii/Lenovo-Y720-KB-Led-Controller
npm install
npm rebuild
npm run dist
```
