# Extreme cooling module

This is a kernel module that allow us to control if the extreme cooling is on or off.

The extreme cooling mode came from the Lenovo Nerve Center software, I did some magic and made this.

**I RECOMMEND THAT YOU BUILD THE MODULE USING THE YARN SCRIPT AT THE ROOT FOLDER**

# Requirements to build

- make
- Linux kernel headers

You can install all using this command line: `sudo apt install build-essential linux-headers-$(uname -r)`

# How to build the Extreme Cooling Module

Enter the  `src/` folder and

```
make build
```

This should take care of eveything. The `ko` file should be on the `src/out/` folder.

# How to build the tests for Extreme Cooling Module

Enther the `tests/` folder and 

```
make build
```

The same thing as above, the only difference is that the executables is going to be in `tests/bin` folder. You're going to have two executables, one that turns on the extreme cooling mode and one that turns off.

# How I accomplished that

First think I though is that the piece of software that enable/disable the extreme cooling mode was going to be some DLL like the LED, in a way it's but it's not, we indeed have a DLL that is used in the Lenovo Nerve Center software:

 - FanManagerPlugin.dll (is a good candidate)
 - ... I didn't find another thing that sounds like a Fan Manager thing 

So let's open IDA Pro and get our hands dirty.

