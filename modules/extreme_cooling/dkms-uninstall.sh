#!/bin/bash
EXTREME_COOLING_MODULE_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# shellcheck disable=SC1091
. "${EXTREME_COOLING_MODULE_DIR}"/.env

if sudo dkms remove -m "${MODULE_NAME}" -v "${MODULE_VERSION}" --all; then
	echo "Extreme Cooling Module removed"
	if sudo rm -rf /usr/src/"${MODULE_NAME}"*; then
		echo "Extreme Cooling Module source removed"
	else
		echo "Extreme Cooling Module source removal failed"
		exit 1
	fi
fi