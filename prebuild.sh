#!/bin/sh

SRC_DIR=./src
DIST_JS_DIR=./dist/js

# Libs
LIBS_DIR=./libs

HOTKEY_LIB_DIR=$LIBS_DIR/hotkey
HOTKEY_LIB_RELEASE_DIR=$HOTKEY_LIB_DIR/build/Release

LED_LIB_DIR=$LIBS_DIR/led
LED_LIB_RELEASE_DIR=$LED_LIB_DIR/build/Release

rm -rf $DIST_JS_DIR

yarn run build-libs
yarn run tsc

# Copying static files that don't need to be compiled
cp -r $SRC_DIR/assets $DIST_JS_DIR/
cp -r $SRC_DIR/resources $DIST_JS_DIR/
cp $SRC_DIR/index.html $DIST_JS_DIR/

# Copying compiled libs
cp $HOTKEY_LIB_RELEASE_DIR/hotkeyAddon.node $DIST_JS_DIR/addons/hotkey/hotkeyAddon.node
cp $LED_LIB_RELEASE_DIR/ledAddon.node $DIST_JS_DIR/addons/led/ledAddon.node