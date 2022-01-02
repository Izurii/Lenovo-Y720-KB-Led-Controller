# Requirements

-   Described in the main README

# How to build

Inside the same folder that this README is run: `yarn run build` or go back one folder and run `yarn run build-led-addon`.

The compiled file is located inside the `./build/Release`

# How it works

This is a node native addon, so the source code is written in C++.

We send a payload to a HID device and done, led ons and colors everywhere.

Now... the details of it.

We have two main functions here:

-   `_getHidrawDevice`
    -   Tries to find the correct HID device so we can send the payload and control the keyboard backlight.
-   `setKeyboardOptions`
    -   Receives the values from the app and create the payload and send it to the correct device.

# How `_getHidrawDevice` works

First we open the directory `/sys/class/hidraw` (this is where linux kernel put the symbolic links of the actual hid devices).

From there we read the content of the directory, applying some rules (the directory name can't be "**.**", "**..**").

For each directory that we found we're going to read a specfic file inside it (/sys/class/hidraw/**DIRECTORY_FOUND**/device/uevent) and as soons as the script found a file that contains this string "**HID_NAME=ITE33D1:00 048D:837A**" we stop the search and store the name of the directory where we found the file that contains the string.

Why **HID_NAME=ITE33D1:00 048D:837A**?

Because that's the name of the HID device that controls the backlight in the Lenovo Legion Y720, example:

-   This is the output of the command `cat /sys/class/hidraw/hidraw0/device/uevent` (in this case, the keyboard device is the `hidraw0` folder)
    -   ```
        izurii@pop-os:~$ cat /sys/class/hidraw/hidraw0/device/uevent
        DRIVER=hid-generic
        HID_ID=0018:0000048D:0000837A
        HID_NAME=ITE33D1:00 048D:837A
        HID_PHYS=i2c-ITE33D1:00
        ...
        ```

Now we just return the stored directory name as a **std::string** value. This completes the `_getHidrawDevice` method.

---

# How `setKeyboardOptions` works

This function just verify if all the arguments received from the main application is valid and if it is send it as a payload to the HID device that we found earlier.

BTW these are the validations I do:

-   Backlight style needs to be a value between 0 and 4 (inclusive).
-   For each item in the array of the options for each keyboard segment
    -   Needs to have the segment color and the brightness.
    -   The color is a value between 0 and 19 (inclusive).
    -   The brightness is a value between 0 and 5 (inclusive).

The actual path we use to send the payload is `/dev/DIRECTORY_FOUND`.

We send the payload using a system call, `IOCTL`, example of a payload:

`ioctl(fd, HIDIOCSFEATURE(6), {204, 0, 3, 2, 3, 0});`

The function `ioctl` is from the `sys/ioctl.h` include that we do. We pass as arguments to the function:

-   The file descriptor of the file `/dev/DIRECTORY_FOUND`
-   The request
-   Payload, buffer, something

In our case we have:

-   `fd` <- The file descriptor
-   `HIDIOCSFEATURE(6)` <- The request used `SetFeature`, and the 6 is the size of the buffer.
-   `{204, 0, 3, 2, 3, 0}` <- The actual buffer

We call `ioctl` five times, four being to set all the four segments of the keyboard and one more call to "complete" the thing (later I'll be explaining the details of it).

That's it.

---

The other function `getHidrawDevice` is just to export to node using the NAPI.

# Reverse engineer of the Lenovo Driver

Well, let's begin with the most difficult part of this project.

Let's explore the Lenovo Nerve Center (the software used on Windows to control the fan and backlight).

That's the file/dir structure of the software: https://pastebin.com/xECgCHj6

If you open the pastebin link you're gonna see a lot of files and directories, to look each one is going to take much time, so let's filter the list a bit:

Let's run: `ls -lRp --ignore="*."{jpg,png,xml,gif,cso,pShader,ini,fx,dat}`

That's the result: https://pastebin.com/S5A79sX3, much better.

As soon as I was looking through the list of files and dirs I glance at something named "LED..."

-   ./bin/x64/LedSettingsPlugin.dll

Take note of that DLL, but looking at the rest, nothing rings a bell, just some led profiles, and other dlls, exe...

So let get's our hand dirty, open IDA and load the `LedSettingsPlugin` dll.

First thing that may appear is to load some other DLL `OLEAUT32`, I grab this dll from my System32 folder from Windows and load into IDA and now we wait a bit so IDA can do his things.

Pressing Shift+F12 IDA should show you a lot of strings that he found on the file you loaded. So let's search what we're looking for LEDS!

![image](https://user-images.githubusercontent.com/46232520/147886320-a7b97196-35f0-4421-83f7-a46cf4b5838c.png)

After a bit of clicks and scrolling through strings and more strings I find those mentioning the Y720 model and something with Leds, that's probably it.

Let's go and see the `Y720LedSetHelper::SetLEDStatusEx` (SetLed is something that rings a bell)

![image](https://user-images.githubusercontent.com/46232520/147886545-709d4bbb-718c-4b7e-ba58-4b4ac9ea8c91.png)

Looking at the assembly, right off the bat I set that the `call sub_180028CA0` appears more than one time, a total of four times, let's take a look at that.

![image](https://user-images.githubusercontent.com/46232520/147886633-99471d04-4b5f-4142-9ca9-c264488c9471.png)

This is probably just some log thing for debugging the driver. I'll rename that function so we know what is does just looking at the `call`

![image](https://user-images.githubusercontent.com/46232520/147890596-4d3e91bc-79e6-42ca-9128-13e9df4d8612.png)

But let's take another look here

![image](https://user-images.githubusercontent.com/46232520/147890655-f9716478-3fe1-4ca4-8e36-a21b3b143160.png)

This show us a important piece of information, the last five instructions are populating some registers with values and sending it to the debug thing. The first arg is the address from the `aSetBlockDColor`, the second arg is the register `edx`, third arg `r8d` and the fourth arg is `r9d`.

Looking at the debug thing we can see that the second, third and fourth argument is being used to populate the the `aSetBlockDColor`, in other words:

"Set block(edx), color(r8d), style(r9d)"

So now we know that `edx` holds the value of the "block", `r8d` holds the value of the color and `r9d` the style.

After some renaming we get to this:
