#!/bin/bash

# shellcheck disable=SC1091
. ./scripts/.env

create_extreme_cooling_module_md5() {
	echo "Creating Extreme Cooling Module MD5 file..."
	md5sum "$EXTREME_COOLING_MODULE_DIR"/headers/ioctl_def.h \
	"$EXTREME_COOLING_MODULE_DIR"/src/Makefile \
	"$EXTREME_COOLING_MODULE_DIR"/src/extreme_cooling.c > "$EXTREME_COOLING_MODULE_MD5"
	echo "Extreme Cooling Module MD5 file created"
}

create_extreme_cooling_module_test_on_md5() {
	echo "Creating Extreme Cooling Module test turn on MD5 file..."
	md5sum "$EXTREME_COOLING_MODULE_TEST_DIR"/src/turn_on_extreme_cooling.c \
	> "$EXTREME_COOLING_MODULE_TEST_TURN_ON_MD5"
	echo "Extreme Cooling Module test turn on MD5 file created"
}

create_extreme_cooling_module_test_off_md5() {
	echo "Creating Extreme Cooling Module test turn off MD5 file..."
	md5sum "$EXTREME_COOLING_MODULE_TEST_DIR"/src/turn_off_extreme_cooling.c > \
	"$EXTREME_COOLING_MODULE_TEST_TURN_OFF_MD5"
	echo "Extreme Cooling Module test turn off MD5 file created"
}

build_extreme_cooling_module() {
	echo "Building Extreme Cooling Module"
	cd "$EXTREME_COOLING_MODULE_DIR"/src || exit
	if make build; then
		echo "Extreme Cooling Module built"
		cd ../../../ || exit
		create_extreme_cooling_module_md5
	else
		echo "Extreme Cooling Module build failed"
		exit 1
	fi
}

buildExtremeCoolingModuleTestOn() {
	echo "Building Extreme Cooling Module turn on extreme cooling test"
	if make -C "$EXTREME_COOLING_MODULE_TEST_DIR"/ turn_on_test; then
		echo "Extreme Cooling Module turn on extreme cooling test built"
		create_extreme_cooling_module_test_on_md5
	else
		echo "Extreme Cooling Module turn on extreme cooling test build failed"
		exit 1
	fi
}

build_extreme_cooling_module_test_off() {
	echo "Building Extreme Cooling Module test turn off extreme cooling test"
	if make -C "$EXTREME_COOLING_MODULE_TEST_DIR"/ turn_off_test; then
		echo "Extreme Cooling Module test turn off extreme cooling test built"
		create_extreme_cooling_module_test_off_md5
	else
		echo "Extreme Cooling Module test turn off extreme cooling test build failed"
		exit 1
	fi
}

if test -f "$EXTREME_COOLING_MODULE_TEST_TURN_ON_FILE" && ! test -f "$EXTREME_COOLING_MODULE_TEST_TURN_OFF_FILE"; then
	echo "Executable of the test to turn on the extreme cooling exists, but the test to turn off the extreme cooling does not."
	build_extreme_cooling_module_test_off
elif test -f "$EXTREME_COOLING_MODULE_TEST_TURN_OFF_FILE" && ! test -f "$EXTREME_COOLING_MODULE_TEST_TURN_ON_FILE"; then
	echo "Executable of the test to turn off the extreme cooling exists, but the test to turn on the extreme cooling does not."
	build_extreme_cooling_module_test_on
elif ! test -f "$EXTREME_COOLING_MODULE_TEST_TURN_ON_FILE" && ! test -f "$EXTREME_COOLING_MODULE_TEST_TURN_ON_FILE"; then
	echo "Both tests doesn't exist. Building both"
	build_extreme_cooling_module_test_on
	build_extreme_cooling_module_test_off
else
	echo "Both test executables exist. Checking MD5 sums"

	if test -f "$EXTREME_COOLING_MODULE_TEST_TURN_ON_MD5" && test -f "$EXTREME_COOLING_MODULE_TEST_TURN_OFF_MD5"; then
		echo "MD5 files exist. Checking MD5sums..."

		CHECK_MD5_EXTREME_COOLING_MODULE_TEST_TURN_ON=$(md5sum -c "$EXTREME_COOLING_MODULE_TEST_TURN_ON_MD5")
		CHECK_MD5_EXTREME_COOLING_MODULE_TEST_TURN_OFF=$(md5sum -c "$EXTREME_COOLING_MODULE_TEST_TURN_OFF_MD5")

		case "$CHECK_MD5_EXTREME_COOLING_MODULE_TEST_TURN_ON" in
			*"WARNING"*|*"FAILED"*)
				echo "Turn on extreme cooling test is not up to date"
				build_extreme_cooling_module_test_on
				;;
			*)
				echo "Turn on extreme cooling test not changed. Skipping build."
				;;
		esac

		case "$CHECK_MD5_EXTREME_COOLING_MODULE_TEST_TURN_OFF" in
			*"WARNING"*|*"FAILED"*)
				echo "Turn off extreme cooling test is not up to date"
				build_extreme_cooling_module_test_off
				;;
			*)
				echo "Turn off extreme cooling test not changed. Skipping build."
				;;
		esac

		echo "MD5sums checked. OK!"

	else
		echo "MD5 files do not exist."
		build_extreme_cooling_module_test_on
		build_extreme_cooling_module_test_off
	fi
fi

if test -f "$EXTREME_COOLING_MODULE_FILE"; then
	echo "Extreme Cooling Module exists. Checking MD5 sum..."

	CHECK_MD5_EXTREME_COOLING_MODULE=$(md5sum -c "$EXTREME_COOLING_MODULE_MD5")

	case "$CHECK_MD5_EXTREME_COOLING_MODULE" in
		*"WARNING"*|*"FAILED"*)
			echo "Extreme Cooling Module is not up to date"
			build_extreme_cooling_module
			;;
		*)
			echo "Extreme Cooling Module not changed. Skipping build."
			;;
	esac

	echo "MD5 sum checked. OK!"
else
	echo "Extreme Cooling Module does not exist. Building..."
	build_extreme_cooling_module
fi