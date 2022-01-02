#!/bin/bash

# shellcheck disable=SC1091
. ./scripts/.env

buildLedAddon() {
	echo "Building LED addon"
	if ! yarn --cwd ./libs/ run build-led-addon; then
		echo "LED addon build failed"
		exit 1
	else
		createLedAddonMD5
	fi
}

buildHotkeyAddon() {
	echo "Building hotkey addon"
	if ! yarn --cwd ./libs/ run build-hotkey-addon; then
		echo "Hotkey addon build failed. Stopping script"
		exit 1
	else
		createHotkeyAddonMD5
	fi
}

buildAll() {
	buildLedAddon
	buildHotkeyAddon
}

createLedAddonMD5() {
	echo "Creating LED addon MD5 file..."
	md5sum "$LED_LIB_DIR"/binding.gyp "$LED_LIB_DIR"/package.json "$LED_LIB_DIR"/src/main.cc > "$LED_ADDON_MD5"
	echo "LED addon MD5 file created"
}

createHotkeyAddonMD5() {
	echo "Creating Hotkey addon MD5 file..."
	md5sum "$HOTKEY_LIB_DIR"/binding.gyp "$HOTKEY_LIB_DIR"/package.json \
	"$HOTKEY_LIB_DIR"/src/main.cc  "$HOTKEY_LIB_DIR"/libs/libevdev-uinput.h \
	"$HOTKEY_LIB_DIR"/libs/libevdev.h "$HOTKEY_LIB_DIR"/libs/libevdev.so > "$HOTKEY_ADDON_MD5"
	echo "Hotkey addon MD5 file created"
}

if test -f "$HOTKEY_ADDON_FILE" && ! test -f "$LED_ADDON_FILE"; then
	echo "Hotkey addon file exists, but LED addon file does not. Building LED addon"
	buildLedAddon
elif test -f "$LED_ADDON_FILE" && ! test -f "$HOTKEY_ADDON_FILE"; then
	echo "LED addon file exists, but Hotkey addon file does not. Building Hotkey addon"
	buildHotkeyAddon
elif ! test -f "$HOTKEY_ADDON_FILE" && ! test -f "$LED_ADDON_FILE"; then
	echo "Both addon files do not exist. Building both"
	buildAll
	exit 0
else
	echo "Both addon files exist. Checking MD5 sums"
fi

if test -f "$HOTKEY_ADDON_MD5" && test -f "$LED_ADDON_MD5"; then
	echo "MD5 files exist. Checking MD5sums..."

	CHECK_MD5_HOTKEY=$(md5sum -c "$HOTKEY_ADDON_MD5")
	CHECK_MD5_LED=$(md5sum -c "$LED_ADDON_MD5")

	case "$CHECK_MD5_HOTKEY" in
		*"WARNING"*|*"FAILED"*)
			echo "Hotkey addon is not up to date"
			buildHotkeyAddon
			;;
		*)
			echo "Hotkey addon not changed. Skipping build."
			;;
	esac

	case "$CHECK_MD5_LED" in
		*"WARNING"*|*"FAILED"*)
			echo "LED addon is not up to date"
			buildLedAddon
			;;
		*)
			echo "LED addon not changed. Skipping build."
			;;
	esac

	echo "MD5sums checked. OK!"

else
	echo "MD5 files do not exist."
	buildAll
	exit 0
fi