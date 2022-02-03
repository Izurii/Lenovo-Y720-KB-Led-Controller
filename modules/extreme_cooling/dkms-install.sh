#!/bin/bash
EXTREME_COOLING_MODULE_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# shellcheck disable=SC1091
. "${EXTREME_COOLING_MODULE_DIR}"/.env

DKMS_CONF="PACKAGE_NAME=extreme_cooling
PACKAGE_VERSION=${MODULE_VERSION}
MAKE=\"make -C src/ build\"
CLEAN=\"make -C src/ clean\"
BUILT_MODULE_NAME=extreme_cooling
BUILT_MODULE_LOCATION=out/
DEST_MODULE_NAME=${MODULE_NAME}
DEST_MODULE_LOCATION=\"/kernel/drivers/misc/y720/\"
MODULES_CONF=\"install ${MODULE_NAME} /sbin/modprobe --ignore-install ${MODULE_NAME}\"
AUTOINSTALL=\"yes\"
"

if rm -rf /usr/src/"${MODULE_NAME}"*; then
	echo "Extreme Cooling Module source removed for new install"
else
	echo "Extreme Cooling Module source removal failed"
	exit 1
fi

if mkdir /usr/src/"${MODULE_NAME}"-"${MODULE_VERSION}"; then
	echo "Extreme Cooling Module source directory created"
else
	echo "Extreme Cooling Module source directory creation failed"
	exit 1
fi

if echo "$DKMS_CONF" > /usr/src/"${MODULE_NAME}"-"${MODULE_VERSION}"/dkms.conf; then
	echo "Extreme Cooling Module dkms.conf file created"
else
	echo "Extreme Cooling Module dkms.conf file creation failed"
	exit 1
fi

if	\
	cp -R "${EXTREME_COOLING_MODULE_DIR}"/src /usr/src/"${MODULE_NAME}"-"${MODULE_VERSION}" && \
	cp -R "${EXTREME_COOLING_MODULE_DIR}"/headers /usr/src/"${MODULE_NAME}"-"${MODULE_VERSION}"; then
	echo "Extreme Cooling Module source copied"
else
	echo "Extreme Cooling Module source copy failed"
	exit 1
fi

if sudo dkms install -m "${MODULE_NAME}" -v "${MODULE_VERSION}"; then
	echo "Extreme Cooling Module installed"
else
	echo "Extreme Cooling Module install failed"
	exit 1
fi