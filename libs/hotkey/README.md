# Requirements

-   Described in the main README

# How to build

Inside the same folder that this README is run: `yarn run build` or go back one folder and run `yarn run build-hotkey-addon`.

The compiled file is located inside the folder `./build/Release`

# How it works

This is a node native addon, so this is written in C++.

The way it works it's not that complicated, we get a hold of the input device (aka. keyboard) and as soon as the user presses (Fn+Space) the addon will call the callback function passed as an argument to the function and you do what you want with that.

So let's enter in the best part, the details of it.

We have two main functions in the source code:

-   `_getInputDevice`
    -   Tries to find the correct input device so we can listen for the hotkey.
-   `_listenHotkey`
    -   Listen for the hotkey, when the hotkey get detected call the callback function passed as an argument to the function.

---

## How `_getInputDevice` works

First we open the directory `/sys/class/input` (this is where linux kernel put the symbolic links of the actual input devices).

From there we read the content of the directory, applying some rules (the directory name can't be "**.**", "**..**" and needs to contain the word "**event**").

For each directory that we found we're going to read a specfic file inside it (/sys/class/input/**DIRECTORY_FOUND**/device/uevent) and as soons as the script found a file that contains these two strings `Keyboard` and `8910` we stop the search and store the name of the directory where we found the file that contains these strings.

Why those two strings `Keyboard` and `8910`?

Because that's how the keyboard of the Lenovo Legion Y720 is identified in the system, example:

-   This is the output of the command `cat /sys/class/input/event11/device/uevent` (in this case, the keyboard device is the `event11` folder)
    -   ```
        izurii@pop-os:~$ cat /sys/class/input/event11/device/uevent
        PRODUCT=3/48d/c100/110
        NAME="ITE Tech. Inc. ITE Device(8910) Keyboard"
        PHYS="usb-0000:00:14.0-9/input0"
        ...
        ```

Now we just return the stored directory name as a **std::string** value. This completes the `_getInputDevice` method.

---

## How `_listenHotkey` works

This function keep listening to a specific input device (keyboard in this case) and it triggers something as soon it detects that a specific combination of keys got pressed.

The big problem with doing something like that (an infinite loop) with Node.JS is blocking the event loop and therefore freezing the whole application.

Ok, so we know that we can't run an infinite loop in the main thread or we're going to stop our electron app from working.

So let's run this operation in another thread and problem is solved.

And that's where the `ThreadSafeFunction` from `NAPI` enters, we need to use something like that so we don't block the main thread.

With all of this explained, the code is not really that complicated. We're going to use `libevdev` as it is just above the kernel layer, so I think that's the right choice for this task (listening the keyboard).

The path we're going to pass to `libevdev` is `/dev/input/DIRECTORY_FOUND`, remember that variable we return from the function `_getInputDevice`, that's where it's used:

```
string eventDevicePath = string(DEVICE_INPUT_PATH) + _getInputDevice(env);

const int fd = open(eventDevicePath.c_str(), O_RDONLY | O_NONBLOCK);
```

Using the `open` method from the `fcntl` library , we get the file descriptor for the file we needed.

Now we use `libevdev` to listen to the keyboard using our file descriptor that we just got.

```
struct libevdev *dev;
struct input_event ev;

int err = libevdev_new_from_fd(fd, &dev);
```

All things ready to listen the keyboard. Now we declare and start the thread.

```
tsfn = ThreadSafeFunction::New(
	env,
	callback,
	"Resource Name",
	0,
	1,
	[fd](Napi::Env)
	{
		close(fd);
		nativeThread.join();
	}
);

nativeThread = thread(_threadCallback, err, dev, ev);
```

Let's get into the function `_threadCallback`

---

## How `_threadCallback` works

Here's the infinite loop I talked before, the infinite loop that keeps listening to events from the event device (our input device)

```
do
{

	err = libevdev_next_event(dev, LIBEVDEV_READ_FLAG_NORMAL, &ev);

	if (err == 0 && ev.type == EV_KEY && ev.value == EV_KEY && ev.code == 240)
	{
		napi_status status = tsfn.BlockingCall(callback);
		if (status != napi_ok)
		{
			break;
		}
	}
	this_thread::sleep_for(chrono::milliseconds(100));
} while (err == 1 || err == 0 || err == -EAGAIN);
```

This doesn't need much explanation, is just a do-while loop that runs until we get some error from the event.

Ok. So where we filter which keys the user has pressed?

```
if (err == 0 && ev.type == EV_KEY && ev.value == EV_KEY && ev.code == 240)
```

This if statement right here, here we check if we got an error from the event, the event type, and the event code (which is 240, that's the code for the combination `Fn+Space`).

As soon as the user presses the combination of keys, the code is going to call a function from the `ThreadSafeFunction` and that function is going to call the callback we send as an argument via JS.

```
addon.listenHotkey(() => {
	// This only get called when the user presses Fn+Space
	console.log("Callback here");
})
```

---

The other functions are just for exporting to JS via the NAPI interface.

-   `listenHotkey`
-   `getInputDevice`
