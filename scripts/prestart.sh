#!/bin/sh

# shellcheck disable=SC1091
. ./scripts/.env

yarn run build-libs

cp "$HOTKEY_LIB_RELEASE_DIR"/hotkeyAddon.node "$SRC_DIR"/addons/hotkey
cp "$LED_LIB_RELEASE_DIR"/ledAddon.node "$SRC_DIR"/addons/led

yarn run tsc