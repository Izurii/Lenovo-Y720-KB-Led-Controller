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

Following the code we see a bunch of things hapenning until we get to another `call`

`call sub_180004380`

This is what this function look like:

![image](https://user-images.githubusercontent.com/46232520/147892696-5aa718a5-32d2-4497-9463-06a25bd97fe5.png)

To me this function just appears to be some kind of validation for a string or something like that, so let's name it `stringValidation`.

After that we have a bit more of `mov`, `lea` and a `call` for `sub_1800E740`, let's take a look at it.

![image](https://user-images.githubusercontent.com/46232520/147892801-78b10fba-a5f7-4207-9fb4-8582d03db020.png)

This is what we need to look:

![image](https://user-images.githubusercontent.com/46232520/147892816-9b96efc2-6189-49f0-8e62-1cab7396b4be.png)

The call for the [`HidD_SetFeature`](https://docs.microsoft.com/en-us/windows-hardware/drivers/ddi/hidsdi/nf-hidsdi-hidd_setfeature), this is the function that sends something to a Hid device. 

But what he sends? Idk at this point. Reading through the Microsoft documentation about that function we see that we need three arguments to call this function:

 - A handle of a Hid device object (some kind of file descriptor from linux)
 - A pointer to a report buffer
 - The size in bytes of the report buffer

So I know that in the register `rcx` we have the `Hid device object`, `rdx` we have the report buffer and `r8d` the report buffer length. What we are interested is the `rdx` that contains the buffer, so let's follow him up;

`mov     rdx, rsi` (moving the value of `rsi` to `rdx)

Here we have a memcpy

```
lea     rcx, [rsi+1]	; Destination 		// Loading the address of the value in register rsi + 1 (offset) into rcx
mov     r9d, 5		; SourceSize		// Source size = 5
mov     r8, r12		; Source		// Moving value of r12 to r8, so the source is r12
mov     edx, r9d	; DestinationSize	// Destination size = 5 (same register of source size r9d)
call    cs:memcpy_s				// Call to memcpy_s
```

Ok, so now we know that the value of the `rsi` register is the buffer report, but it's missing one byte `lea	rcx, [rsi+1]` from this we can assume that is going to copy 5 bytes from `r12` and place it starting from the address of the value of `rsi` **+ 1**, so now we gotta find the first byte of `rsi` (and from this we can assume that the buffer in total have 6 bytes: 5 bytes from the memcpy and + 1 byte from ??) 

![image](https://user-images.githubusercontent.com/46232520/147917011-76ef6738-5bd2-4da4-8306-52b347fcbac9.png)

Just above the section that contains the call to HidD_SetFeature we have this block, the first instruction is `mov	byte ptr [rsi], 204`, that's it, the value 204 (decimal) is the value of the first byte of `rsi`

So now let's write down what we know about the buffer report: We know that is 6 bytes in size, the first byte is the value **204** and the other 5 bytes is something that comes from `r12`(the memcpy call that we saw before). 

Let's find out the value of this `r12` register. 

![image](https://user-images.githubusercontent.com/46232520/147923772-64aaacd0-69a3-4d75-8868-ffa166b6a251.png)

This in the initial block of the function. Look at the highlighted `r12`: `mov	r12, [rsp+176]` and `push r12`

From that we know that the value of `r12` comes from the `rsp` register. Let's go back to where we call this function we're seeing right now (aka. sub_18000E740).

![image](https://user-images.githubusercontent.com/46232520/147923809-7eee5101-1a69-4bd6-8366-f4b8f59d10e7.png)

I renamed the `sub_18000E740`to `HidSetFeature_thing`. This block I posted above is the call to the function and it's args, so let's look at it a bit:

The function `HidSetFeature_thing` have the signature of a [`__fastcall`](https://docs.microsoft.com/en-us/cpp/cpp/fastcall?view=msvc-170) (__fastcall is a calling convention) this means that the order of the args is made of:

	1. ECX or RCX
	2. EDX or RDX
	-  All other args are passed on the stack (right to left)
	
So the args for the call is:

```
lea	rcx, [rbp+136]	// First arg
lea	rdx, [rsp+96]	// Second arg
mov	r8b, 1		// Third arg
mov	[rsp+32], rax	// Fourth arg
```

Now we know that we use in total four arguments to call this function that make the call for HidD_SetFeature.

Looking back at the function `HidSetFeature_thing`, the thing we want to know is the value of this: ![image](https://user-images.githubusercontent.com/46232520/147921637-f98ceb1a-2eca-43ff-b84b-aa140fbe955f.png)

So let's make a brief pause and collect what we got:

	1. We know that to control the backlight we need to send something to a Hid device.
	2. We already know that the payload we need to send is 6 bytes in size and it's first byte is the value 204.
	3. Following from the function "HidSetFeature_thing" we know that the value of the other 5 bytes of the payload comes from the register "r12" and the value of "r12" comes from the register "rsp".
	4. The fourth arg is our payload.


Let's discover the value of our fourth arg, the value comes from this: `mov	[rsp+32], rax` and the value stored in the `rax` register is `lea rax, [rsp+96]`, so let's go and see what comes from this `rsp+96` (don't forget that the payload is 5 bytes, to we'll search from `rsp+96` until `rsp+100` or from `rsp+96` to `rsp+92`:

The range `rsp+96~rsp+92` is already discarted because we don't see anything that relate to these address so let's put it aside and work on the other range.

![image](https://user-images.githubusercontent.com/46232520/147924418-863cf72a-8125-4c2d-9df5-b80b21ca31e7.png)

From this picture we already got two bytes, the values of `rsp+96` and `rsp+100` so write that down:

	- "rsp+96" = 0
	- "rsp+100"
		- The value comes from the "bl" register.
		- Meaning that the value of the "rsp+100" is the byte 0 from the register "rbx".
		- You can see this instruction "mov edx, ebx	; Block number" (that we discovered a long time ago)
		- This means that the value in the register "ebx" (bytes 0-3 of the register "rbx" is the block number.
		- So I think we can assume that the "bl" register holds the block number.
	
![image](https://user-images.githubusercontent.com/46232520/147925444-c1373ee5-6388-4ae0-af0e-d9d54d21e0d0.png)

And now we found the other 3 bytes, `rsp+97`, `rsp+98` and `rsp+99`, let's collect everything and put in order:
	
	- Payload
		- First byte:	204
		- Second byte:	0	(rsp+96)
		- Third byte:	style	(rsp+97)
		- Fourth byte:	color	(rsp+98)
		- Fifth byte:	3	(rsp+99) We don't know what this is yet
		- Sixth byte:	block	(rsp+100)
	
First two bytes we just ignore them as is hard-coded into the thing we don't need to mess with that. I think the possible values for each byte is:

	- Third byte:	0~4	(Because we have 4 styles that we can select in the Lenovo Nerve Center)
	- Fourth byte:	0-19	(We have 19 colors in total to select, including the one that isn't a color)
	- Fifth byte:	3	(Later we'll be messing with this)
	- Sixth byte:	0~3	(This is not that hard to guess, the keyboard have four blocks that we can select the color, so the range 0~3)
	
Knowing that now we need to make a prototype, so let's do some code... First I do thing we need to find the correct HID device to send the payload. 

You can run this:

`for dir in */; do echo Device:$dir && cat /sys/class/hidraw/$dir/device/uevent && echo ; done` 

This is going to list all the hidraw devices, the output of this command is something like that:

```
izurii@pop-os:/sys/class/hidraw$ for dir in */; do echo Device:$dir && cat /sys/class/hidraw/$dir/device/uevent && echo ; done
Device:hidraw0/
DRIVER=hid-generic
HID_ID=0018:0000048D:0000837A
HID_NAME=ITE33D1:00 048D:837A
HID_PHYS=i2c-ITE33D1:00
HID_UNIQ=
MODALIAS=hid:b0018g0001v0000048Dp0000837A

Device:hidraw1/
DRIVER=logitech-djreceiver
HID_ID=0003:0000046D:0000C53F
HID_NAME=Logitech USB Receiver
HID_PHYS=usb-0000:00:14.0-1/input0
HID_UNIQ=
MODALIAS=hid:b0003g0001v0000046Dp0000C53F

Device:hidraw2/
DRIVER=logitech-djreceiver
HID_ID=0003:0000046D:0000C53F
HID_NAME=Logitech USB Receiver
HID_PHYS=usb-0000:00:14.0-1/input1
HID_UNIQ=
MODALIAS=hid:b0003g0001v0000046Dp0000C53F
```

From this list you can search device that the name starts with `ITE33D1...` that device will be the one wee need to send the payload.

Let's go back to coding, now we need to know [how to send a buffer to a HID device](https://lmgtfy.app/?q=how+to+send+a+buffer+to+a+hid+device). With the knowledge in mind we just code something really simple:

```
#include <sys/ioctl.h>
#include <linux/hidraw.h>
#include <fcntl.h>

int main() {
	
	int fileDescriptor = open("/dev/hidraw0", O_WRONLY);
	
	// Payload
	// First byte - 204
	// Second byte - 0
	// Third byte - block style
	// Fourth byte - block color
	// Fifth byte - 3
	// Sixth byte - block
	unsigned char buffer[6] = {204, 0, 1, 1, 3, 1};
	
	// Doing the system call
	ioctl(fileDescriptor, HIDIOCSFEATURE(6), buffer);

	return 0;
}
```

If we compile (to compile it just run a `gcc filename.cc -o executable`) and run this, you'll see nothing... Nothing has changed, we didn't get an error but the code doesn't work. What could be wrong??

Let's go back to the IDA and see if we missed something. I looked again at the two main functions that we found earlier `sub_1800286C0` (this is the function related to the `Y720LedSetHelper::SetLEDStatusEx`) and `HidSetFeature_thing`, I didn't find anything useful.

For the sake of curiosity, let's see who calls the function `sub_1800286C0`:

![image](https://user-images.githubusercontent.com/46232520/147994959-c27d6b57-78a4-409c-a046-a4b5145aa68a.png)

Okay, we have five different locations to go through, let's do one by one.

In the first XREF we have two calls to the function `sub_1800286C0` (in the end the first and second xref listed are in the same function):

![image](https://user-images.githubusercontent.com/46232520/147996070-83656863-3812-4573-8231-4f36a3b4de93.png)

The third and fourth XREF are in the same function too:

![image](https://user-images.githubusercontent.com/46232520/147996283-f909648d-8695-43d4-a13b-669a00683c46.png)

And the last one, the fifth XREF:

![image](https://user-images.githubusercontent.com/46232520/147996467-dd624f41-1668-4c48-ba9c-172784bf0cd1.png)
