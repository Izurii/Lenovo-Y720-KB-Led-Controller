#include <linux/init.h>
#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/proc_fs.h>
#include <linux/slab.h>
#include <linux/uaccess.h>
#include <linux/fs.h>
#include <linux/acpi.h>
#include <linux/ioctl.h>
#include <linux/types.h>
#include <linux/cdev.h>
#include <linux/miscdevice.h>
#include "../headers/ioctl_def.h"

MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("Module that exposes two IOCTL calls to turn on/off the extreme cooling mode of the Lenovo Legion Y720");
MODULE_AUTHOR("Heitor Massarente <heitor_massarente@msn.com>");
MODULE_VERSION("1.0.0");

// Get the ACPI handle
static int get_acpi_handle(acpi_handle *handle)
{
	acpi_status status;
	char *method = NULL;

	method = "\\_SB.PCI0.LPCB.EC0.LCMD";
	status = acpi_get_handle(NULL, (acpi_string)method, handle);

	if (ACPI_FAILURE(status))
	{
		printk(KERN_ERR "Y720 - Extreme Cooling Module: Could not get handle for method %s\n", method);
		return -1;
	}
	return 1;
}

// Turn on extreme cooling mode
static void turn_on_extreme_cooling(void)
{

	acpi_handle handle;
	acpi_status status;

	struct acpi_buffer buffer = {ACPI_ALLOCATE_BUFFER, NULL};

	union acpi_object args[2];
	struct acpi_object_list acpiObjectList = {2, args};

	if (get_acpi_handle(&handle) < 0)
		return;

	args[0].type = ACPI_TYPE_INTEGER;
	args[0].integer.value = 89;
	args[1].type = ACPI_TYPE_INTEGER;
	args[1].integer.value = 119;

	status = acpi_evaluate_object(handle, NULL, &acpiObjectList, &buffer);
	if (ACPI_FAILURE(status))
	{
		printk(KERN_ERR "Y720 - Extreme Cooling Module: Method call to turn on extreme cooling failed\n");
		return;
	}
	printk(KERN_INFO "Y720 - Extreme Cooling Module: Extreme Cooling mode turned on\n");
}

// Turn off extreme cooling mode
static void turn_off_extreme_cooling(void)
{

	acpi_handle handle;
	acpi_status status;

	struct acpi_buffer buffer = {ACPI_ALLOCATE_BUFFER, NULL};

	union acpi_object args[2];
	struct acpi_object_list acpiObjectList = {2, args};

	if (get_acpi_handle(&handle) < 0)
		return;

	args[0].type = ACPI_TYPE_INTEGER;
	args[0].integer.value = 89;
	args[1].type = ACPI_TYPE_INTEGER;
	args[1].integer.value = 118;

	status = acpi_evaluate_object(handle, NULL, &acpiObjectList, &buffer);
	if (ACPI_FAILURE(status))
	{
		printk(KERN_ERR "Y720 - Extreme Cooling Module: Method call to turn off extreme cooling failed\n");
		return;
	}
	printk(KERN_INFO "Y720 - Extreme Cooling Module: Extreme Cooling mode turned off\n");
}

static int open(struct inode *inode, struct file *filp)
{

	printk(KERN_DEBUG "Y720 - Extreme Cooling Module: Device file opened\n");
	return 0;
}

static int release(struct inode *inode, struct file *filp)
{
	printk(KERN_DEBUG "Y720 - Extreme Cooling Module: Device file closed\n");
	return 0;
}

static long ioctl(struct file *file, unsigned int cmd, unsigned long arg)
{
	printk(KERN_DEBUG "Y720 - Extreme Cooling Module: IOCTL called\n");
	switch (cmd)
	{
	case TURN_ON_EXTREME_COOLING:
		turn_on_extreme_cooling();
		break;
	case TURN_OFF_EXTREME_COOLING:
		turn_off_extreme_cooling();
		break;
	default:
		printk(KERN_DEBUG "Y720 - Extreme Cooling Module: Nothing to see here\n");
		break;
	}
	return 0;
}

static struct file_operations fops =
	{
		.owner = THIS_MODULE,
		.open = open,
		.unlocked_ioctl = ioctl,
		.release = release,
};

static struct miscdevice misc_device_y720 = {
	.minor = MISC_DYNAMIC_MINOR,
	.name = "y720",
	.fops = &fops,
	.mode = 0604,
};

static int __init extreme_cooling_module_init(void)
{
	int error;
	error = misc_register(&misc_device_y720);
	if (error)
	{
		printk(KERN_ERR "Y720 - Extreme Cooling Module: Unable to register \"y720\" misc device\n");
		return error;
	}

	printk(KERN_DEBUG "Y720 - Extreme Cooling Module: \"y720\" misc device registered\n");
	printk(KERN_INFO "Y720 - Extreme Cooling Module: Module loaded\n");

	return 0;
}

static void __exit extreme_cooling_module_exit(void)
{
	misc_deregister(&misc_device_y720);
	printk(KERN_DEBUG "Y720 - Extreme Cooling Module: \"y720\" misc device removed\n");
	printk(KERN_INFO "Y720 - Extreme Cooling Module: Unloaded!\n");
}

module_init(extreme_cooling_module_init);
module_exit(extreme_cooling_module_exit);