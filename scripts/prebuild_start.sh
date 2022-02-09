#!/bin/bash

# shellcheck disable=SC1091
. ./scripts/.env

rm -rf "$DIST_JS_DIR"

yarn
yarn run build-libs
yarn run tsc

# Copying static files that don't need to be compiled
cp -r "$SRC_DIR"/assets "$DIST_JS_DIR"/
cp -r "$SRC_DIR"/resources "$DIST_JS_DIR"/
cp "$SRC_DIR"/index.html "$DIST_JS_DIR"/

# Copying compiled libs
cp "$HOTKEY_LIB_RELEASE_DIR"/hotkeyAddon.node "$DIST_JS_DIR"/addons/hotkey
cp "$LED_LIB_RELEASE_DIR"/ledAddon.node "$DIST_JS_DIR"/addons/led
