#include <napi.h>
#include <thread>
#include <dirent.h>
#include <string>
#include <fcntl.h>
#include <unistd.h>
#include "../libs/libevdev.h"

using namespace Napi;
using namespace std;

thread nativeThread;
ThreadSafeFunction tsfn;

#define SYS_CLASS_INPUT_PATH "/sys/class/input"
#define DEVICE_INPUT_PATH "/dev/input/"
#define KEYBOARD_VENDOR_ID "48d"
#define KEYBOARD_PRODUCT_ID "c100"

const int HOTKEY_FN_SPACE = 786512;
const int HOTKEY_7 = 786515;

string _getInputDevice(const Env &env)
{
	string inputDevice = "";

	DIR *directory;
	struct dirent *entry;
	directory = opendir(SYS_CLASS_INPUT_PATH);

	if (!directory)
	{
		throw Error::New(env, "Error opening input directory");
	}

	bool isDeviceProductCorrect, isDeviceVendorCorrect = false;
	while ((entry = readdir(directory)) != NULL)
	{

		if (isDeviceProductCorrect && isDeviceVendorCorrect)
		{
			break;
		}

		if (strcmp(entry->d_name, ".") != 0 && strcmp(entry->d_name, "..") != 0 && strstr(entry->d_name, "event"))
		{
			string devicePath = string(SYS_CLASS_INPUT_PATH) + "/" + entry->d_name + "/device/id/";

			string deviceProductPath = devicePath + "product";
			string deviceVendorPath = devicePath + "vendor";

			FILE *deviceProductFp = fopen(deviceProductPath.c_str(), "r");
			FILE *deviceVendorFp = fopen(deviceVendorPath.c_str(), "r");

			if (!deviceProductFp || !deviceVendorFp)
			{
				throw Error::New(env, "Error opening input file");
			}

			char line[256] = {0};
			while (fgets(line, sizeof(line), deviceProductFp))
			{
				if (strstr(line, KEYBOARD_PRODUCT_ID))
				{
					isDeviceProductCorrect = true;
					break;
				}
			}
			fclose(deviceProductFp);

			if (isDeviceProductCorrect)
			{
				char line[256] = {0};
				while (fgets(line, sizeof(line), deviceVendorFp))
				{
					if (strstr(line, KEYBOARD_VENDOR_ID))
					{
						isDeviceVendorCorrect = true;
						inputDevice = entry->d_name;
						break;
					}
				}
				fclose(deviceVendorFp);
			}
		}
	}
	closedir(directory);

	if (inputDevice.length() <= 0)
	{
		throw Error::New(env, "Input device not found");
	}

	return inputDevice;
}

String getInputDevice(const CallbackInfo &info)
{
	Env env = info.Env();
	string inputDevice = _getInputDevice(env);
	return Napi::String::From(env, inputDevice);
}

void _threadCallback(int err, libevdev *dev, input_event ev)
{
	int hotkeyPressedValue;
	bool hotkeyPressed = false;

	auto callback = [&](Napi::Env env, Function jsCallback, int *value)
	{
		if (jsCallback.IsFunction())
		{
			jsCallback.Call({Number::New(env, *value)});
		}
		hotkeyPressedValue = 0;
	};

	do
	{

		err = libevdev_next_event(dev, LIBEVDEV_READ_FLAG_NORMAL, &ev);

		if (err == 0)
		{
			if (ev.type == EV_MSC && (ev.value == HOTKEY_FN_SPACE || ev.value == HOTKEY_7))
			{
				if (!hotkeyPressed)
				{
					hotkeyPressed = true;
					hotkeyPressedValue = ev.value;
				}
			}
			else if (ev.type == EV_KEY && ev.value == 0 && hotkeyPressed)
			{
				napi_status status = tsfn.BlockingCall(&hotkeyPressedValue, callback);

				hotkeyPressed = false;

				if (status != napi_ok)
				{
					break;
				}
			}
		}
		this_thread::sleep_for(chrono::milliseconds(100));
	} while (err == 1 || err == 0 || err == -EAGAIN);
	tsfn.Release();
}

void _listenHotkey(const CallbackInfo &info)
{
	Env env = info.Env();
	Function callback;

	if (info[0].IsFunction())
	{
		callback = info[0].As<Function>();
	}
	else
	{
		throw Error::New(env, "Callback is not a function");
	}

	string eventDevicePath = string(DEVICE_INPUT_PATH) + _getInputDevice(env);

	const int fd = open(eventDevicePath.c_str(), O_RDONLY | O_NONBLOCK);

	if (fd < 0)
	{
		close(fd);
		throw Error::New(env, "Error opening input device");
	}

	struct libevdev *dev;
	struct input_event ev;

	int err = libevdev_new_from_fd(fd, &dev);

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
		});

	nativeThread = thread(_threadCallback, err, dev, ev);
}

void listenHotkey(const CallbackInfo &info)
{
	_listenHotkey(info);
}

Object Init(Env env, Object exports)
{
	exports.Set(String::New(env, "getInputDevice"), Function::New(env, getInputDevice));
	exports.Set(String::New(env, "listenHotkey"), Function::New(env, listenHotkey));
	return exports;
}

NODE_API_MODULE(hotkeyAddon, Init)