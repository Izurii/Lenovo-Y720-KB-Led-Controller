#include <napi.h>
#include <sys/ioctl.h>
#include <linux/hidraw.h>
#include <fcntl.h>
#include <dirent.h>

using namespace Napi;
using namespace std;

#define SYS_CLASS_HIDRAW_PATH "/sys/class/hidraw"
#define HIDRAW_DEVICE "HID_NAME=ITE33D1:00 048D:837A"

string _getHidrawDevice(const Env &env)
{
	string hidrawDevice = "";

	DIR *directory;
	struct dirent *entry;
	directory = opendir(SYS_CLASS_HIDRAW_PATH);

	if (directory)
	{
		while ((entry = readdir(directory)) != NULL)
		{
			if (strcmp(entry->d_name, ".") != 0 && strcmp(entry->d_name, "..") != 0)
			{
				string filePath = string(SYS_CLASS_HIDRAW_PATH) + "/" + entry->d_name + "/device/uevent";
				FILE *fp = fopen(filePath.c_str(), "r");

				if (!fp)
				{
					throw Error::New(env, "Error opening hidraw file");
				}

				if (fp)
				{
					char line[256] = {0};
					while (fgets(line, sizeof(line), fp))
					{
						if (strstr(line, HIDRAW_DEVICE))
						{
							hidrawDevice = entry->d_name;
						}
					}
					fclose(fp);
				}
			}
		}
		closedir(directory);
	}
	else
	{
		throw Error::New(env, "Error opening hidraw directory");
	}

	if (hidrawDevice.length() <= 0)
	{
		throw Error::New(env, "Hidraw device not found");
	}

	return hidrawDevice;
}

String getHidrawDevice(const CallbackInfo &info)
{
	Env env = info.Env();
	string hidrawDevice = _getHidrawDevice(env);
	return Napi::String::From(env, hidrawDevice);
}

Boolean setKeyboardOptions(const CallbackInfo &info)
{
	Env env = info.Env();

	// Modo do backlight
	int backlightMode = info[0].ToNumber().Int32Value();

	if (backlightMode < 0 || backlightMode > 4)
	{
		throw Error::New(env, "backlightMode must be a number between 0 and 4");
	}

	/*
		Array de opções a serem mandadas para o fd
		Estrutura da array (descrito como se fosse Typescript):
		Array<{
				segmentColor: number,
				segmentBrightness: number,
		}>
	*/
	int options[4][2];

	Array keyboardOptions = info[1].As<Array>();
	for (auto keyboardOption : keyboardOptions)
	{
		Object segmentOption = static_cast<Value>(keyboardOption.second).As<Object>();

		// Cor para o segmento
		int segmentColor = segmentOption.Get("segmentColor").ToNumber().Int32Value();
		// Brilho para o segmento
		int segmentBrightness = segmentOption.Get("segmentBrightness").ToNumber().Int32Value();

		if (
			segmentColor < 0 || segmentColor > 19)
		{
			throw Error::New(env, "segmentColor must be a number between 0 and 10");
		}

		if (
			segmentBrightness < 0 || segmentBrightness > 5)
		{
			throw Error::New(env, "segmentBrightness must be a number between 0 and 10");
		}

		int optionIndex = static_cast<Value>(keyboardOption.first).ToNumber().Int32Value();

		options[optionIndex][0] = segmentColor;
		options[optionIndex][1] = segmentBrightness;
	}

	// Caminho pro dispositivo hidraw
	string hidrawDevicePath = "/dev/" + _getHidrawDevice(env);

	// File descriptor do hidraw
	int fd = open(hidrawDevicePath.c_str(), O_WRONLY);

	if (!fd)
	{
		throw Error::New(env, "Error opening hidraw device");
	}

	// Enviando payload para o fd
	for (int i = 0; i < 4; i++)
	{
		unsigned char buffer[6] = {
			204,
			0,
			static_cast<unsigned char>(backlightMode), // style
			static_cast<unsigned char>(options[i][0]), // color
			static_cast<unsigned char>(options[i][1]), // brightness
			static_cast<unsigned char>(i)};			   // block

		ioctl(fd, HIDIOCSFEATURE(6), buffer);
	}

	unsigned char finalBuffer[2] = {204, 9};
	ioctl(fd, HIDIOCSFEATURE(2), finalBuffer);

	return Boolean::New(env, true);
}

Object Init(Env env, Object exports)
{
	exports.Set(String::New(env, "setKeyboardOptions"), Function::New(env, setKeyboardOptions));
	exports.Set(String::New(env, "getHidrawDevice"), Function::New(env, getHidrawDevice));
	return exports;
}

NODE_API_MODULE(ledAddon, Init)
