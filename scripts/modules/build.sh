#!/bin/bash

# shellcheck disable=SC1091
. ./scripts/.env

createY720ModuleMD5() {
	echo "Creating Y720 Module MD5 file..."
	md5sum "$EXTREME_COOLING_MODULE_DIR"/headers/ioctl_def.h \
	"$EXTREME_COOLING_MODULE_DIR"/src/Makefile \
	"$EXTREME_COOLING_MODULE_DIR"/src/y720_module.c > "$EXTREME_COOLING_MODULE_MD5"
	echo "Y720 Module MD5 file created"
}

createY720ModuleTestOnMD5() {
	echo "Creating Y720 Module test turn on extreme cooling MD5 file..."
	md5sum "$EXTREME_COOLING_MODULE_TEST_DIR"/src/turn_on_extreme_cooling.c \
	> "$EXTREME_COOLING_MODULE_TEST_TURN_ON_MD5"
	echo "Y720 Module test turn on extreme cooling MD5 file created"
}

createY720ModuleTestOffMD5() {
	echo "Creating Y720 Module test turn off extreme cooling MD5 file..."
	md5sum "$EXTREME_COOLING_MODULE_TEST_DIR"/src/turn_off_extreme_cooling.c > \
	"$EXTREME_COOLING_MODULE_TEST_TURN_OFF_MD5"
	echo "Y720 Module test turn off extreme cooling MD5 file created"
}

buildY720Module() {
	echo "Building Y720 Module"
	cd "$EXTREME_COOLING_MODULE_DIR"/src || exit
	if make build; then
		echo "Y720 Module built"
		cd ../../../ || exit
		createY720ModuleMD5
	else
		echo "Y720 Module build failed"
		exit 1
	fi
}

buildY720ModuleTestOn() {
	echo "Building Y720 Module turn on extreme cooling test"
	if make -C "$EXTREME_COOLING_MODULE_TEST_DIR"/ turn_on_test; then
		echo "Y720 Module turn on extreme cooling test built"
		createY720ModuleTestOnMD5
	else
		echo "Y720 Module turn on extreme cooling test build failed"
		exit 1
	fi
}

buildY720ModuleTestOff() {
	echo "Building Y720 Module test turn off extreme cooling test"
	if make -C "$EXTREME_COOLING_MODULE_TEST_DIR"/ turn_off_test; then
		echo "Y720 Module test turn off extreme cooling test built"
		createY720ModuleTestOffMD5
	else
		echo "Y720 Module test turn off extreme cooling test build failed"
		exit 1
	fi
}

if test -f "$EXTREME_COOLING_MODULE_TEST_TURN_ON_FILE" && ! test -f "$EXTREME_COOLING_MODULE_TEST_TURN_OFF_FILE"; then
	echo "Executable of the test to turn on the extreme cooling exists, but the test to turn off the extreme cooling does not."
	buildY720ModuleTestOff
elif test -f "$EXTREME_COOLING_MODULE_TEST_TURN_OFF_FILE" && ! test -f "$EXTREME_COOLING_MODULE_TEST_TURN_ON_FILE"; then
	echo "Executable of the test to turn off the extreme cooling exists, but the test to turn on the extreme cooling does not."
	buildY720ModuleTestOn
elif ! test -f "$EXTREME_COOLING_MODULE_TEST_TURN_ON_FILE" && ! test -f "$EXTREME_COOLING_MODULE_TEST_TURN_ON_FILE"; then
	echo "Both tests doesn't exist. Building both"
	buildY720ModuleTestOn
	buildY720ModuleTestOff
else
	echo "Both test executables exist. Checking MD5 sums"

	if test -f "$EXTREME_COOLING_MODULE_TEST_TURN_ON_MD5" && test -f "$EXTREME_COOLING_MODULE_TEST_TURN_OFF_MD5"; then
		echo "MD5 files exist. Checking MD5sums..."

		CHECK_MD5_EXTREME_COOLING_MODULE_TEST_TURN_ON=$(md5sum -c "$EXTREME_COOLING_MODULE_TEST_TURN_ON_MD5")
		CHECK_MD5_EXTREME_COOLING_MODULE_TEST_TURN_OFF=$(md5sum -c "$EXTREME_COOLING_MODULE_TEST_TURN_OFF_MD5")

		case "$CHECK_MD5_EXTREME_COOLING_MODULE_TEST_TURN_ON" in
			*"WARNING"*|*"FAILED"*)
				echo "Turn on extreme cooling test is not up to date"
				buildY720ModuleTestOn
				;;
			*)
				echo "Turn on extreme cooling test not changed. Skipping build."
				;;
		esac

		case "$CHECK_MD5_EXTREME_COOLING_MODULE_TEST_TURN_OFF" in
			*"WARNING"*|*"FAILED"*)
				echo "Turn off extreme cooling test is not up to date"
				buildY720ModuleTestOff
				;;
			*)
				echo "Turn off extreme cooling test not changed. Skipping build."
				;;
		esac

		echo "MD5sums checked. OK!"

	else
		echo "MD5 files do not exist."
		buildY720ModuleTestOn
		buildY720ModuleTestOff
	fi
fi

if test -f "$EXTREME_COOLING_MODULE_FILE"; then
	echo "Y720 Module exists. Checking MD5 sum..."

	CHECK_MD5_EXTREME_COOLING_MODULE=$(md5sum -c "$EXTREME_COOLING_MODULE_MD5")

	case "$CHECK_MD5_EXTREME_COOLING_MODULE" in
		*"WARNING"*|*"FAILED"*)
			echo "Y720 Module is not up to date"
			buildY720Module
			;;
		*)
			echo "Y720 Module not changed. Skipping build."
			;;
	esac

	echo "MD5 sum checked. OK!"
else
	echo "Y720 Module does not exist. Building..."
	buildY720Module
fi