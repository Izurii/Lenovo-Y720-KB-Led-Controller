CUR_DIR:=$(strip $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST)))))
OUT_DIR := ../out
obj-m += extreme_cooling.o

KDIR := /lib/modules/$(shell uname -r)/build

build: | $(OUT_DIR)
	$(MAKE) -C $(KDIR) M=$(CUR_DIR) modules
	cp extreme_cooling.ko $(OUT_DIR)
	make clean

clean:
	$(MAKE) -C $(KDIR) M=$(CUR_DIR) clean

$(OUT_DIR):
	mkdir -p $(OUT_DIR)