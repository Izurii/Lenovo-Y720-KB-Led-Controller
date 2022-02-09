# Lenovo-Y720-KB-Led-Controller

[![Github releases (by asset)](https://img.shields.io/github/downloads/Izurii/Lenovo-Y720-KB-Led-Controller/total.svg)](https://github.com/Izurii/Lenovo-Y720-KB-Led-Controller/releases/) [Dependency Status][depstat-url] [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/donate/?hosted_button_id=VCESYBAUCTF5S)

This software controls the backlight of Lenovo Legion Y720 Keyboard on Linux, as the Lenovo didn't make the drivers/software for Linux.

It works mostly the same as the Lenovo Nerve Center, including the global hotkey of **Fn+Space** to change between profiles created by the user and the hotkey that is located in the key **7** of the numpad this hotkey opens the software.

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

# How to grant access to Hidraw and Input device

Hidraw device is used for controlling the leds and the input device is used to detect the hotkey Fn+Space.

Create a file called `/etc/udev/rules.d/99-any-name-you-want.rules` and write this to the file

```
SUBSYSTEM=="hidraw", ATTRS{name}=="ITE33D1:00", MODE="0666"
SUBSYSTEM=="input", ATTRS{name}=="*Keyboard*", MODE="0666"
```

Reboot your PC or use this command to reload and trigger the new udev rules `sudo udevadm control --reload-rules && sudo udevadm trigger`

# DEV

# Recommendations

-   VSCode with the extensions listed below
    -   Better C++ Syntax
    -   Better Shell Syntax
    -   C/C++ Extension Pack by Microsoft
    -   CodeLLDB (to debug things if you know what you're doing)
    -   EditorConfig for VS Code
    -   Shell Script Command Completion
    -   ShellCheck (if you want to use this extension follow their guide on how to install it)
-   Patience

# Requirements to build or start the dev version

-   GCC/G++
-   yarn
-   libevdev (the needed files are already in the ./libs/hotkey/libs folder, but you never know ¯\_(ツ)\_/¯ )
-   node-gyp (I do recommend to globally install it using either `npm install -g node-gyp` or `yarn global add node-gyp`)

# How to build it yourself

1. First clone the repo

```
git clone https://github.com/Izurii/Lenovo-Y720-KB-Led-Controller
```

2. Build

```
yarn build
```

# How to start the software using yarn

```
yarn start
```

# Good to know

-   Both scripts (build and start) has a lot of things behind doing all the dirty work.
-   `yarn run build` or `yarn build` do these actions:
    -   As soon as you run the command, yarn will trigger the "prebuild" script, the prebuild script is going to run the sh file `./scripts/prebuild_start.sh`. This shell script is going to run all the things needed to build the application, take a look at the script and see what it does.
    -   The same logic applies to `yarn run start` it runs the file `./scripts/prebuild_start.sh`
-   You can take a look at the [README inside the folder `./scripts`](./scripts/README.md) if you want more details in what those scripts is doing.
-   I wrote some details how the addons I built for the app works
    -   [LED Controller Node Native Addon Documentation](./libs/led/README.md)
    -   [Hotkey Monitor Node Native Addon Documentation](./libs/hotkey/README.md)

[depstat-url]: https://david-dm.org/Izurii/Lenovo-Y720-KB-Led-Controller
[depstat-image]: https://david-dm.org/Izurii/Lenovo-Y720-KB-Led-Controller.svg?style=flat
