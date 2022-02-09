#!/bin/bash

# shellcheck disable=SC1091
. ./scripts/.env

sudo ./"${EXTREME_COOLING_MODULE_DIR}"/dkms-uninstall.sh