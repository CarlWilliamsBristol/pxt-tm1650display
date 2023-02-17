bbc micro:bit class to drive cheap tm1650 based 4-digit 7-segment LED display such as Gravity brand.

The TM1650 display/keyboard adapter is a cheap 2-wire serial solution for simple display plus keyboard modules used in consumer electronics.

Various "maker" stores sell 4-digit 7-segment LED display units based on this chip or another in the series. They are labeled to suggest that they have an I2C interface and are noticeably cheaper than other I2C 4-digit displays. But this device isn't quite an I2C interface, and if you hook it up to the I2C lines on a BBC micro:bit, the micro:bit hangs during startup as the display confuses the I2C bus.

It turns out that this device doesn't have a device address and can't coexist with other devices on an I2C bus, and its transaction protocol is peculiar, too.

After a bit of head-scratching with the Chinese language datasheet (I don't speak or read Chinese) I've put together a rudimentary "bit banged" type driver for the display - I've lumped everything into a single class that can use any arbitrary pair of GPIOs as clock and data - there are no dependencies on I2C libraries or other stuff. The class includes the bit patterns for generating decimal and hex digits and a scatterin of other alphabetic characters and punctuation, as well as methods for writing numbers and strings to the display, turning it on and off, changing the brightness, and so on.

It's not the most elegant code, but it does work and it's self contained and the full source is here, written in Javascript.

A very brief overview of the communication protocol, for the curious:

It's "like" I2C. You have a clock line controlled by the host, and a biderectional data line (ideally open collector with a modest pull-up). For this class, the facility to read back from the display is effectively unused - ACK bits sent back during display updates are read but discarded and there are no methods included (at the moment) to support the keyboard aspect of the chip.

Clock and data lines start both set high (idle state).

In general, data line must not change while clock line is high, and data are clocked into the display when the clock line goes from high to low, so the general line sequence for a bit is, from a position where the clock is low, set data, take clock high, take clock low again, move to next bit.

Transactions are started with a "start" signal, which DOES change the data line with clock high - a high-to-low transition on the data line is a start signal.

After the start signal, eight bits are clocked out in big-endian order (most significant first) and then a further clock elicits an ACK bit from the display. Then a second group of eight bits are sent and a second ACK bit obtained on the nineth clock.

After two bytes are sent, the host sends a stop sequence which involves taking the clock highm waiting a bit, then taking data high (back to the idle state).

The two bytes are basically an address/data pair. They are either referred to as "command 1, command 2" or as "address, data" in the datasheet, depending on the behaviour. Turning the display on is achieved by sending 0x48 and a "display on" command. Writing to the display involves sending one of 4 addresses - one per digit - followed by a byte that represents a bit pattern that maps onto the segments.

This class contains tables of bit patterns and mappings from ASCII character codes to the paterns. It maintains a host copy of the raw state of each digit, to allow the decimal points to be switched on and off independently. It tries to be clever when displaying strings by not using, if it can avoid it, digit segments where decimal points/full stops are to be rendered, i.e. it will use 2 digits to show "2.4", not three.

Timings are hard-coded at the moment using the control.waitMicros() delay. Port numbers are configurable. It doesn't need to be very fast because updating the entire display only takes 8 bytes of serial traffic.

## Basic Usage

The function to initialise the display creates a named instance, attached to a specified pair of I/O pins. It also sets the current display instance to that created. 

The function to turn an initialised display on also sets the brightness level from 1 to 7 in increasing brightness, or 0 (default) max brightness. This function also sets the named display to be the default, or does nothing if the named display doesn't exist.

Other functions use the current default display instance. So if you have multiple displays initialised, switch between them using the "turn display on" function. Turning a display off makes it blank, but doesn't un-initialise or delete it. There is no "delete display" function - once instantiated, displays remain. Because these simple units don't have an ID, they can't share a pair of lines, unless you add some kind of additional hardware multiplexing. 

The underlying display type is a class that can just be used directly if desired.



> Open this page at [https://carlwilliamsbristol.github.io/pxt-tm1650display/](https://carlwilliamsbristol.github.io/pxt-tm1650display/)

## Use as Extension

This repository can be added as an **extension** in MakeCode.

* open [https://makecode.microbit.org/](https://makecode.microbit.org/)
* click on **New Project**
* click on **Extensions** under the gearwheel menu
* search for **https://github.com/carlwilliamsbristol/pxt-tm1650display** and import

## Edit this project ![Build status badge](https://github.com/carlwilliamsbristol/pxt-tm1650display/workflows/MakeCode/badge.svg)

To edit this repository in MakeCode.

* open [https://makecode.microbit.org/](https://makecode.microbit.org/)
* click on **Import** then click on **Import URL**
* paste **https://github.com/carlwilliamsbristol/pxt-tm1650display** and click import

## Blocks preview

This image shows the blocks code from the last commit in master.
This image may take a few minutes to refresh.

![A rendered view of the blocks](https://github.com/carlwilliamsbristol/pxt-tm1650display/raw/master/.github/makecode/blocks.png)

#### Metadata (used for search, rendering)

* for PXT/microbit
<script src="https://makecode.com/gh-pages-embed.js"></script><script>makeCodeRender("{{ site.makecode.home_url }}", "{{ site.github.owner_name }}/{{ site.github.repository_name }}");</script>
