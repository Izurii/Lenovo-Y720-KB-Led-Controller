#include <napi.h>
#include <stdio.h>
#include <errno.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <err.h>
#include <dirent.h>
#include <string>
#include <thread>
#include <chrono>
#include "../libs/libevdev.h"

using namespace Napi;
using namespace std;

thread nativeThread;
ThreadSafeFunction tsfn;

#define SYS_CLASS_INPUT_PATH "/sys/class/input"
#define DEVICE_INPUT_PATH "/dev/input/"

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

	bool foundDevice = false;
	while ((entry = readdir(directory)) != NULL)
	{

		if (foundDevice)
		{
			break;
		}

		if (strcmp(entry->d_name, ".") != 0 && strcmp(entry->d_name, "..") != 0)
		{
			if (strstr(entry->d_name, "event"))
			{
				string filePath = string(SYS_CLASS_INPUT_PATH) + "/" + entry->d_name + "/device/uevent";
				FILE *fp = fopen(filePath.c_str(), "r");

				if (!fp)
				{
					throw Error::New(env, "Error opening input file");
				}

				if (fp)
				{
					char line[256] = {0};
					while (fgets(line, sizeof(line), fp))
					{
						if (strstr(line, "Keyboard") && strstr(line, "8910"))
						{
							foundDevice = true;
							inputDevice = entry->d_name;
							break;
						}
					}
					fclose(fp);
				}
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

void _listenHotkey(const CallbackInfo &info)
{
	Env env = info.Env();
	Function callback;

	if (info[0].IsFunction())
	{
		callback = info[0].As<Function>();
	}

	string eventDevicePath = string(DEVICE_INPUT_PATH) + _getInputDevice(env);

	const int fd = open(eventDevicePath.c_str(), O_RDONLY | O_NONBLOCK);

	if (fd < 0)
		throw Error::New(env, "Error opening input device");

	tsfn = ThreadSafeFunction::New(
		env,
		callback,
		"Resource Name",
		0,
		1,
		[](Napi::Env)
		{
			nativeThread.join();
		});

	nativeThread = thread([&]
						  {
							  auto callback = [](Napi::Env env, Function jsCallback)
							  {
								  if (jsCallback.IsFunction())
								  {
									  jsCallback.Call({});
								  }
							  };

							  struct libevdev *dev;
							  struct input_event ev;

							  int err = libevdev_new_from_fd(fd, &dev);

							  if (err < 0)
								  throw Error::New(env, "Error cannot associate input device");

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
							  tsfn.Release();
						  });
}

Object Init(Env env, Object exports)
{
	exports.Set(String::New(env, "getInputDevice"), Function::New(env, getInputDevice));
	exports.Set(String::New(env, "listenHotkey"), Function::New(env, _listenHotkey));
	return exports;
}

NODE_API_MODULE(hotkeyAddon, Init)