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

As soon as I was looking through the list of files and dirs I thing I saw something named "LED..."

-   ./bin/x64/LedSettingsPlugin.dll

Take note of that DLL, but looking at the rest, nothing rings a bell, just some led profiles, and other dlls, exe...

So let's get our hands dirty, open IDA and load the `LedSettingsPlugin.dll` file.

First thing that may appear is to load some other DLL `OLEAUT32`, I grab this dll from the System32 folder inside my Windows installation and load into IDA and now we wait a bit to IDA do his things.

Pressing Shift+F12 IDA should show you a lot of strings that he found on the file you loaded. So let's search what we're looking for.

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

This is what the function `sub_180004380` look like:

![image](https://user-images.githubusercontent.com/46232520/147892696-5aa718a5-32d2-4497-9463-06a25bd97fe5.png)

To me this function just appears to be some kind of validation for a string or something like that, so let's name it `stringValidation`.

After that we have a bit more of `mov`, `lea` and a `call` for `sub_1800E740`, let's take a look at `sub_1800E740`.

![image](https://user-images.githubusercontent.com/46232520/147892801-78b10fba-a5f7-4207-9fb4-8582d03db020.png)

This is what I think we need to look:

![image](https://user-images.githubusercontent.com/46232520/147892816-9b96efc2-6189-49f0-8e62-1cab7396b4be.png)

The call for the [`HidD_SetFeature`](https://docs.microsoft.com/en-us/windows-hardware/drivers/ddi/hidsdi/nf-hidsdi-hidd_setfeature), this is the function that sends something to a Hid device. 

But what he sends? Idk at this point. Reading through the Microsoft documentation about that function we see that we need three arguments to call this function:

 - A handle of a Hid device object (some kind of file descriptor from linux)
 - A pointer to a report buffer
 - The size in bytes of the report buffer

So I know that in the register `rcx` we have the `Hid device object`, `rdx` we have the report buffer and `r8d` the report buffer length. What we are interested is the `rdx` that contains the buffer, so let's follow him;

`mov     rdx, rsi` (moving the value of `rsi` to `rdx`)

Here we have a memcpy

```
lea     rcx, [rsi+1]	; Destination 		// Loading the address of register "rsi+1" into "rcx"
mov     r9d, 5		; SourceSize		// Source size = 5
mov     r8, r12		; Source		// Moving value of r12 to r8, so the source is r12
mov     edx, r9d	; DestinationSize	// Destination size = 5 (same register of source size r9d)
call    cs:memcpy_s				// Call to memcpy_s
```

Ok, so now we know that the value of the `rsi` register is the buffer report, but it's missing one byte `lea	rcx, [rsi+1]` from this we can assume that is going to copy 5 bytes from `r12` and place it starting from the address of the value of `rsi` **+ 1**, so now we gotta find the first byte of `rsi` (and from this we can assume that the buffer in total have 6 bytes: 5 bytes from the memcpy and + 1 byte from ??) 

![image](https://user-images.githubusercontent.com/46232520/147917011-76ef6738-5bd2-4da4-8306-52b347fcbac9.png)

Just above the section that contains the call to HidD_SetFeature we have a block of instructions and the first instruction is `mov	byte ptr [rsi], 204`, that's it, the value 204 (decimal) is the value of the first byte of `rsi`

So now let's write down what we know about the buffer.

We know that is 6 bytes in size, the first byte is the value **204** and the other 5 bytes is something that comes from `r12`(the memcpy call that we saw before). 

Let's find out the value of this `r12` register. 

![image](https://user-images.githubusercontent.com/46232520/148063840-8ad066e2-ee32-4dd1-a5df-52beaaae2bc4.png)

This is the initial block of the function `sub_18000E740`. Look at the highlighted `r12`: `mov	r12, [rsp+176]` and `push r12`

From that we know that the value of `r12` comes from the `rsp` register. Let's go back to where we call this function we're seeing right now (aka. sub_18000E740).

![image](https://user-images.githubusercontent.com/46232520/148064252-3041b59e-384b-4160-895d-8cd531296e4e.png))

I renamed the `sub_18000E740` to `HidSetFeature_thing`. This block I posted above is the call to the function and it's args, so let's look at it a bit:

The function `HidSetFeature_thing` have the signature of a [`__fastcall`](https://docs.microsoft.com/en-us/cpp/cpp/fastcall?view=msvc-170) (__fastcall is a calling convention) this means that the order of the args is made of:

	1. RCX
	2. RDX
	-  All other args are passed on the stack (right to left)
	
So the args for the call is:

```
lea	rcx, [rbp+136]	// First arg
lea	rdx, [rsp+96]	// Second arg
mov	r8b, 1		// Third arg
mov	[rsp+32], rax	// Fourth arg
```

Now we know that we use in total four arguments to call this function that make the call for HidD_SetFeature.

Looking back at the function `HidSetFeature_thing`, the thing we want to know is the value of this: ![image](https://user-images.githubusercontent.com/46232520/148064512-526fef48-f3d6-4e20-a0a0-05a145703589.png)

So let's make a brief pause and collect what we got:

	1. We know that to control the backlight we need to send something to a Hid device.
	2. We already know that the payload we need to send is 6 bytes in size and it's first byte is the value 204.
	3. Following from the function "HidSetFeature_thing" we know that the value of the other 5 bytes of the payload comes from the register "r12" and the value of "r12" comes from the register "rsp".
	4. The fourth arg is our payload.

Let's discover the value of our fourth arg, the value comes from this: `mov	[rsp+32], rax` and the value stored in the `rax` register is `lea rax, [rsp+96]`, so let's go and see what comes from this `rsp+96` (don't forget that the payload is 5 bytes, so we'll search from `rsp+96` until `rsp+100` or from `rsp+92` to `rsp+96`:

The range `rsp+92~rsp+96` is already discarted because we don't see anything that relate to these address so let's put it aside and work on the other range.

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
		- Third byte:	??	(rsp+97)
		- Fourth byte:	??	(rsp+98)
		- Fifth byte:	3	(rsp+99)
		- Sixth byte:	block number	(rsp+100)
	
The value `rsp+97` comes from `sil` if you look at the block that send things to the `debugThing`:

`mov	r9d, esi`

From this we can assume that `esi` holds the value of the block style and `sil` is the byte 0 so I thing the `rsp+97` is the block style. Following this order `rsp+98` is going to be the block color. Let's rewrite our table above:

	- Payload
		- First byte:	204
		- Second byte:	0	(rsp+96)
		- Third byte:	block style	(rsp+97)
		- Fourth byte:	block color	(rsp+98)
		- Fifth byte:	3	(rsp+99)
		- Sixth byte:	block number	(rsp+100)
	
First two bytes we just ignore them as is hard-coded into the thing we don't need to mess with that. I think the possible values for each byte is:

	- Third byte:	0~4	(Because we have 4 styles that we can select in the Lenovo Nerve Center)
	- Fourth byte:	0-19	(We have 19 colors in total to select, including the one that isn't a color)
	- Fifth byte:	3	(Later we'll be messing with this)
	- Sixth byte:	0~3	(This is not that hard to guess, the keyboard have four blocks that we can select the color, so the range 0~3)
	
Knowing that, now we need to make a prototype, so let's do some code... First I do thing we need to find the correct HID device to send the payload. 

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

Let's go back to coding, now we need to know [how to send a buffer to a HID device](https://lmgtfy.app/?q=how+to+send+a+buffer+to+a+hid+device). With the knowledge in hands we just code something simple:

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
	// Sixth byte - block number
	unsigned char buffer[6] = {204, 0, 1, 1, 3, 1};
	
	// Doing the system call
	ioctl(fileDescriptor, HIDIOCSFEATURE(6), buffer);

	return 0;
}
```

If we compile (to compile it just run a `g++ filename.cc -o executable_name`) and run the compiled executable, you'll see nothing... Nothing has changed in the keyboard, we didn't get an error but the code doesn't work. What could be wrong??

Let's go back to the IDA and see if we missed something. I looked again at the two main functions that we found earlier `sub_1800286C0` (this is the function related to the `Y720LedSetHelper::SetLEDStatusEx`, I renamed it to `SetLedStatus`) and `HidSetFeature_thing`, I didn't find anything useful.

For the sake of curiosity, let's see who calls the function `SetLedStatus`:

![image](https://user-images.githubusercontent.com/46232520/148065931-cfe6346f-30f4-4803-bb79-642e0342aa92.png)

Okay, we have five different locations to go through, let's do one by one.

In the first XREF we have two calls to the function `SetLedStatus` (in the end the first and second xref listed are in the same function):

![image](https://user-images.githubusercontent.com/46232520/148066075-f1cc41e0-80b0-45cb-8eb4-148128b622b7.png)

The third and fourth XREF are in the same function too:

![image](https://user-images.githubusercontent.com/46232520/148066165-109d8d3c-4d8d-430a-b33b-2e5f18bd7202.png)

And the last one, the fifth XREF:

![image](https://user-images.githubusercontent.com/46232520/148066446-4ec9acc5-7a7d-4d08-ba40-d674e320b2d2.png)

What I noticed while taking a look at the screenshots are that the first/second and third/fourth xref is somewhat similar, the thing that really caught my eyes is that after the call for the function `SetLedStatus` we have a call to the function `sub_180028810` in both first/second and third/fourth xref, so let's take a look at that before we go to the fifth xref.

![image](https://user-images.githubusercontent.com/46232520/147997210-f647478f-40dc-43fb-a7d7-70162249e486.png)

That's looking promising, we have a call to the `stringValidation` we renamed earlier and the `HidSetFeature_thing`, so after the payload is sent the driver send something more. Before we go any further, let's just take a peek of the fifth xref.

At the beginning of the function `sub_180027D90` (fifth xref) we have a call to the function `sub_180028DD0`, after this we have some debug logging thing and at the end we have the call for the function `SetLedStatus`, so no call to the `sub_180028810` that we found in the others xrefs. So we just need to see the function `sub_180028DD0` to completely discard the fifth xref:

![image](https://user-images.githubusercontent.com/46232520/147997630-54ce1ccd-f4eb-4995-91e7-826bd9b00ab7.png)

I did check all things I could see in this function and I could not see anything that caught my attention, just a bunch of windows registry things, so let's go back to `sub_180028810` that we found before.

Let's decode what's is being sent to function `HidSetFeature_thing` and if possible, code into our prototype.

From what we saw earlier, we can assume that:

	- The fourth arg is the payload
	- The payload has 6 bytes in size
	- The first byte is **204**
	
We just need to discover what's the value of the 5 other bytes.

```
nop
lea     rcx, [rbx+136]
lea     rax, [rsp+96]
mov     [rsp+32], rax
mov     r8b, 1
lea     rdx, [rsp+48]
call    HidSetFeature_thing
```

This is the same thing we saw before when we're analysing the payload sent to change the color, style etc. So what we want is the value of `rsp+32` that comes from  `rax` and `rax` is the address of`rsp+96` (don't forget that the payload is 5 bytes, so we'll search from `rsp+96` until `rsp+100` or from `rsp+92` to `rsp+96`):

The range `rsp+92~rsp+96` is already discarted because we don't see anything that relate to these address so let's put it aside and work on the other range.

```
mov     byte ptr [rsp+96], 9
```

The function `sub_180028810` is relatively small so we didn't spent much time searching for this. That instruction is the only thing that I think the payload is, so we have only 2 bytes??

So now we got a payload that is only two bytes in size, weird but let's follow through and see what happens if we just send a payload of 2 bytes in size.

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
	// Sixth byte - block number
	unsigned char buffer[6] = {204, 0, 1, 1, 3, 1};
	
	// Doing the system call
	ioctl(fileDescriptor, HIDIOCSFEATURE(6), buffer);

	unsigned char twoBytesBuffer[2] = {204, 9};

	// Doing the weird 2 bytes thing
	ioctl(fileDescriptor, HIDIOCSFEATURE(2), twoBytesBuffer);

	return 0;
}
```

With this thing compiled let's test if it's working or not...

![image](https://user-images.githubusercontent.com/46232520/148061056-55f34bd2-ce6f-43c1-a994-c03b40915677.png)

Yesss, it worked!! Idk what those two bytes means but it worked so I'm not questioning it.

Let's collect our things and see what we've got at this point: 

	- We succeded in changing something in the backlight
	- The payload:
		- Is 6 bytes in size
		- The first two bytes are hard-coded (204 and 0)
		- The other four bytes defines:
			- 3º The block style
			- 4º The block color
			- 5º ???
			- 6º The block
	- After we send the payload we need to "end" or "save" our changes using a payload of two bytes
		- The payload is hard-coded:
			- The first byte is 204
			- The second byte is 9
			
That's really good, so now we gotta discover what the fifth byte of the payload is and we're done. To test it, I just wrote a simple code:

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
	// Sixth byte - block number
	
	unsigned char bufferToFirstBlock[6] = {204, 0, 1, 1, 0, 0};
	unsigned char bufferToSecondBlock[6] = {204, 0, 1, 1, 1, 1};
	unsigned char bufferToThirdBlock[6] = {204, 0, 1, 1, 2, 2};
	unsigned char bufferToFourthBlock[6] = {204, 0, 1, 1, 3, 3};
	
	// Doing the system calls
	ioctl(fileDescriptor, HIDIOCSFEATURE(6), bufferToFirstBlock);
	ioctl(fileDescriptor, HIDIOCSFEATURE(6), bufferToSecondBlock);
	ioctl(fileDescriptor, HIDIOCSFEATURE(6), bufferToThirdBlock);
	ioctl(fileDescriptor, HIDIOCSFEATURE(6), bufferToFourthBlock);
	
	// Save buffer??
	unsigned char twoBytesBuffer[2] = {204, 9};

	// Doing the weird save/end 2 bytes thing
	ioctl(fileDescriptor, HIDIOCSFEATURE(2), twoBytesBuffer);

	return 0;
}
```

Just to test it out I put the same color and style in every block of the keyboard, just changing the value of the fifth byte. I tried to capture a photo but the difference is so subtle that my camera can't differentiate anything, but I'll tell you what I found. The fifth byte is the brightness of the block, further testing I saw that we can go up until five, beyond that point I couldn't see any difference at all. 

So our driver is better than the Lenovo one, we can config each block brightness individually. 

That's all folks. The rest is up to you.

# Useful links

 - About Calling conventions
 	- [From Microsoft](https://docs.microsoft.com/en-us/cpp/build/x64-calling-convention?view=msvc-170)
 	- [Good article, easier to understand than Microsoft's one](https://www.vanimpe.eu/2018/01/25/understanding-calling-conventions-malware-analysis/) 
 - HID (Human Interface Device)
 	- [Introduction to HID - Microsoft](https://docs.microsoft.com/en-us/windows-hardware/drivers/hid/)
 	- [A bit more of HID development - Microsoft](https://docs.microsoft.com/en-us/windows-hardware/drivers/ddi/_hid/#io-control-codes)
 	- [HID - Linux Kernel](https://www.kernel.org/doc/html/latest/hid/index.html)
 	- [About RAW access to HID - Linux Kernel](https://www.kernel.org/doc/html/latest/hid/hidraw.html)
 - Cheat sheets
 	- [Tips for Reverse-Engineer](https://zeltser.com/media/docs/reverse-engineering-malicious-code-tips.pdf)
 	- [x86/Win32 Reverse Engineer](https://trailofbits.github.io/ctf/vulnerabilities/references/X86_Win32_Reverse_Engineering_Cheat_Sheet.pdf)
 	- [NASM x64 Assembly](https://www.cs.uaf.edu/2017/fall/cs301/reference/x86_64.html)
 - IDA (I used the IDA Freeware in the whole process in making this, so no need of IDA Pro or anything more than that)
 	- [IDA Default Shortcuts](https://hex-rays.com/wp-content/static/products/ida/support/freefiles/IDA_Pro_Shortcuts.pdf)
 	- [Introduction to IDA](https://resources.infosecinstitute.com/topic/basics-of-ida-pro-2/) 
