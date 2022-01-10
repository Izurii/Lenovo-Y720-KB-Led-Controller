OUT_DIR := ../out
obj-m += y720_module.o

KDIR := /lib/modules/$(shell uname -r)/build

build: | $(OUT_DIR)
	$(MAKE) -C $(KDIR) M=$(PWD) modules
	cp y720_module.ko $(OUT_DIR)
	make clean

clean:
	$(MAKE) -C $(KDIR) M=$(PWD) clean

$(OUT_DIR):
	mkdir -p $(OUT_DIR)