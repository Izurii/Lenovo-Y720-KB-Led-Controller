#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/ioctl.h>
#include "../../headers/ioctl_def.h"

int main()
{
	int fd;
	int32_t value, number;

	fd = open("/dev/y720", O_RDONLY);
	if (fd < 0)
	{
		printf("Cannot open Y720 device file...\n");
		return 0;
	}

	ioctl(fd, TURN_ON_EXTREME_COOLING);

	close(fd);
}