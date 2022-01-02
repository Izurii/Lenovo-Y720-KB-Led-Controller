# Files

-   `./.env` (contains all the variables used by the scripts listed below)
-   `./prebuild.sh` (used to install and check all things needed for building/starting the application, trigged by `yarn run build`)
-   `./libs/build.sh` (used to check and build the libs used by the application to control the leds and hotkey)

## ./prebuild_start.sh

-   The script loads the `.env` file so it can use the variables
-   Delete the output dir of the typescript
-   Run `yarn` to install all the modules needed
-   Run the script `build-libs` using `yarn run build-libs`, this yarn script is going to build the libs needed for the app.
-   Copy the static files that don't need to be compile to the output dir of typescript
-   Copy the compiled libs to the output dir of typescript
-   Compile the typescript into JS

## ./libs/build.sh

-   The script loads the `.env` file so it can use the variables
-   Functions
    -   buildLedAddon
        -   Build the led addon using `yarn --cwd ./libs/ run build-led-addon` if the build succeeds is created a file containing the md5 hash of the files important on the build process, if it fails the script exits with the code 1.
    -   buildHotkeyAddon
        -   Build the hotkey addon using `yarn --cwd ./libs/ run build-hotkey-addon` if the build succeeds is created a file containing the md5 hash of the files important on the build process, if it fails the script exits with the code 1.
    -   buildAll
        -   Run those two functions described above.
    -   createLedAddonMD5
        -   Use this command to create the file with the md5 hash: `md5sum $LED_LIB_DIR/binding.gyp $LED_LIB_DIR/package.json $LED_LIB_DIR/src/main.cc > "$LED_ADDON_MD5"`
    -   createHotkeyAddonMD5
        -   Use this command to create the file with the md5 hash: `md5sum $HOTKEY_LIB_DIR/binding.gyp $HOTKEY_LIB_DIR/package.json $HOTKEY_LIB_DIR/src/main.cc $HOTKEY_LIB_DIR/libs/libevdev-uinput.h $HOTKEY_LIB_DIR/libs/libevdev.h $HOTKEY_LIB_DIR/libs/libevdev.so > "$HOTKEY_ADDON_MD5"`
-   Now that I described all the functions that is in the script, I'll be explaining what it's going on with the rest.

    -   ```
        if test -f "$HOTKEY_ADDON_FILE"  &&  !  test  -f  "$LED_ADDON_FILE"; then
        	echo  "Hotkey addon file exists, but LED addon file does not. Building LED addon"
        	buildLedAddon
        elif test -f "$LED_ADDON_FILE"  &&  !  test  -f  "$HOTKEY_ADDON_FILE"; then
        	echo  "LED addon file exists, but Hotkey addon file does not. Building Hotkey addon"
        	buildHotkeyAddon
        elif  !  test  -f  "$HOTKEY_ADDON_FILE"  &&  !  test  -f  "$LED_ADDON_FILE"; then
        	echo  "Both addon files do not exist. Building both"
        	buildAll
        	exit  0
        else
        	echo  "Both addon files exist. Checking MD5 sums"
        fi
        ```
        This section here check if the compiled files already exists, if it doesn't the script calls the respective function to build the addons. In the case that either of the addons is compiled he calls `buildAll` and exit because we don't need to check the MD5 if we don't event had compiled before.

    ***

    -   ```
        if test -f "$HOTKEY_ADDON_MD5"  &&  test  -f  "$LED_ADDON_MD5"; then
        	echo  "MD5 files exist. Checking MD5sums..."

        	CHECK_MD5_HOTKEY=$(md5sum -c "$HOTKEY_ADDON_MD5")
        	CHECK_MD5_LED=$(md5sum -c "$LED_ADDON_MD5")

        	case  "$CHECK_MD5_HOTKEY"  in
        		*"WARNING"*)
        			echo  "Hotkey addon is not up to date"
        			buildHotkeyAddon
        			;;
        		*)
        			echo  "Hotkey addon not changed. Skipping build."
        			;;
        	esac

        	case  "$CHECK_MD5_LED"  in
        		*"WARNING"*)
        			echo  "LED addon is not up to date"
        			buildHotkeyAddon
        			;;
        		*)
        			echo  "LED addon not changed. Skipping build."
        			;;
        	esac

        	echo  "MD5sums checked. OK!"

        else
        	echo  "MD5 files do not exist."
        	buildAll
        	exit  0
        fi
        ```

        This section is responsible for checking if the MD5 is the same, if not the script build the addon again, if it's the same he skip the build of that specific addon.

        ***

        Let's divide this section in more sections so I can explain how this works:

        -   `if test -f "$HOTKEY_ADDON_MD5" && test -f "$LED_ADDON_MD5"; then` this checks if both md5 files exists, if exists he proceeds to check those files, if not he's going to build the addons again and create the md5 files.
        -   ```
            CHECK_MD5_HOTKEY=$(md5sum -c "$HOTKEY_ADDON_MD5")
            CHECK_MD5_LED=$(md5sum -c "$LED_ADDON_MD5")
            ```
            These two lines are two variables that stores the value of the `md5sum -c` command.
        -   ```
            case  "$CHECK_MD5_HOTKEY"  in
            	*"WARNING"*|*"FAILED"*)
            		echo  "Hotkey addon is not up to date"
            		buildHotkeyAddon
            		;;
            	*)
            		echo  "Hotkey addon not changed. Skipping build."
            		;;
            esac
            ```
            This case statement checks if the result of the `md5sum -c` stored in the respective variable has the word `WARNING`anywhere, if it has he's going to build the respective addon again, if not he's going to skip the build of that addon.
