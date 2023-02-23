## Display driver for 4-digit 7-segment displays using Titan Micro Electronics TM1650

This is a BBC micro:bit MakeCode extension and class to drive 4-digit 7-segment LED display based on the Titan Micro Electronics TM1650 chip. Written for and tested with a "DFROBOT" branded unit from PiHut, with a "Gravity" connector labeled IIC. see: https://thepihut.com/products/gravity-4-digit-red-seven-segment-led-display-module. 

**Note:** I have no affiliation with, or sposorship from, either the PiHut, Titan Micro Electronics or DFRobot. The timing diagram below is excerpted and modified from the Titanmec datasheet under fair use guidelines. All trademarks are acknowledged.

Displays based on this or similar chips are available from various "maker" stores and they tend to be cheaper than typical I2C display modules. Display modules that include push-buttons are also available, but this extension does not support reading back push-button values from the TM1650 (although it could readily be extended to do so). 

The TM1650 is intended for use in consumer electronics as a single display and push-button interface. It has a 2-wire serial interface, clocked by the host, that resembles I2C, but isn't, exactly, even though the DFROBOT display with this chip is labeled "IIC" on the board. In particular, the TM1650 has no device ID and its serial interface bit order is opposite to other 16xx and I2C devices. It can't readily share a bus with other devices, not even other TM1650 devices, at least not without some additional hardware to mimic I2C type behaviour. If you hook one of these up to the I2C lines on a BBC micro:bit, the micro:bit hangs during startup, presumably because the TM1650 reacts with ACK bits as the micro:bit tries to query/configure other devices on the bus. 

This extension includes a rudimentary "bit-banged" driver for these displays, written in Typescript. I've lumped everything into a single class that can use any arbitrary pair of I/O pins for clock and data, so multiple displays can be supported on multiple pairs of pins without having to build multiplexing hardware. There are no dependencies on I2C libraries or any other stuff. The extension includes pre-defined bit patterns for generating decimal and hex digits and a scattering of other characters, and methods for writing numbers and strings to the display, turning it on and off, changing the brightness, and so on. There's also a method for writing raw segment patterns to the display, and functions for reading back display data, albeit from a buffer rather than the display itself.

It's not the most elegant code, but it does work, it's self contained, covers just the one target chip, and the full source is here, so it could be taken and cut down for use in e.g. ATTiny or similar (by getting rid of everything that's not strictly necessary).

The display I have appears to work fine at the fastest speed the simple bit-banged approach allows, around 100kbps. The datasheet suggests that it can cope with clock cycles down to 200ns (5mbps). A full display update takes only 8 bytes of serial data, so even at very slow speeds it's an awful lot faster to display numbers on one of these displays than it is to scroll them on the micro:bit's built in LED array. Using this simplistic approach, I'm hoping the code will be more useful to people who want to drive these displays than something that depends on UART or I2C hardware or libraries, or tries to support a massive range of different devices.

## TM1650 communication protocol 

A very brief overview of the communication protocol, for the curious:

It's "like" I2C. You have a clock line controlled by the host, and a biderectional data line. For this extension, the facility to read back from the display is effectively un-used - ACK bits sent back during display updates are discarded and there are no methods included (at the moment) to support the keyboard reading aspect of the chip.

Clock and data lines start both set high (idle state).

In general, the data line must not change while the clock line is high, and data are clocked into the display when the clock line goes from high to low, so the general line sequence for a bit is, from a position where the clock is low, set data, take clock high, take clock low again, move on to the next bit. Bytes are sent starting with the most significant bit (MSB first). 

The beginning of a transaction is signaled with a "start" sequence, which is distinguished by violating the rule about not changing the data line while the clock is high. A high-to-low transition on the data line while the clock line is high represents "start". At the end of a transaction, taking data from high to low while clock is high signifies "stop". Every complete transation comprises "start", then two bytes, then "stop". Each byte includes an extra clock pulse for an ACK bit that is signalled on the data line by the TM1650.

![diagram excerpt from Titanmec datasheet (c) Titan Micro Electronics used without permission under fair use quotation guidelines](https://github.com/carlwilliamsbristol/pxt-tm1650display/raw/master/bit_sequence.png)

In more detail: after the start signal, eight bits are clocked out in big-endian order (most significant first) and then a further ninth clock in effect acknowledges an ACK bit from the display, which can be read on SDA by the host during the ninth clock period. (**Note**: According to the data sheet, after the falling edge of the 8th clock, the TM1650 drives SDA low if the transaction was successful. It appears, on examination with an oscilloscope, to release the line again roughly half a clock period after the falling edge of the ninth clock.) A second group of eight bits are sent, and a second ACK bit obtained. After the two bytes are sent, the host sends a stop sequence which involves taking the clock high, then taking data high, in that order. The communication lines are then back in the "idle" state. 

The two bytes are basically an address/data pair. They are either referred to as "command 1, command 2" or as "address, data" in the datasheet, depending on the first byte. Turning the display on is achieved by sending 0x48 as "command 1" and a "display on" code as "command 2". Writing segment data to the display involves sending one of four addresses - one for each digit - followed by a byte that represents a bit pattern that maps onto the segments.

This extension contains tables of bit patterns and mappings from ASCII character codes to the patterns. It maintains a host copy of the raw state of each digit, to allow the decimal points to be switched on and off independently while maintaining existing contents. It tries to be clever when displaying strings by not using, if it can avoid it, digit segments where decimal points/full stops are to be rendered, i.e. it will use 2 digits to show "2.4", not three. Leading decimal points or multiple adjacent full stops will consume additional digits, but where possible they are combined with the character to their left.

Serial data timing defaults to a data rate of about 4000kbps, timed using the control.waitMicros() delay. Port pin numbers and data rate are configurable. It doesn't need to be very fast because updating the entire display only takes 8 bytes of serial traffic. As you increase the speed, the "baud rate" is increasingly inaccurate, because of overheads with the bit-banged approach. Actual data rate is always slower than that set, both in raw clock timing terms and because of additional ACK bits and so on. With speeds around 100kbps or more, some of the sub-bit timings reduce to a call to control.waitMicros() for a zero delay, i.e. just the function call overhead. The display I tested this with works fine at the fastest speed I could achieve using this approach, nominally a bit over 100kbps, the maximum setting allowed by the extension is 200kbps but it can't achieve that in reality. It will probably be quicker, at the faster rates, on a Micro:bit V2. Exact speed isn't critical, and there's no need to use "standard" baud rates, speed can be changed at any time (even mid-transaction, theoretically). 

## Basic Usage

**tm1650Display.configure(_name_, _scl_, _sda_)** - The function to initialise the display creates a named instance, attached to a specified pair of I/O pins. It also sets the "current display" to the instance created. The _name_ argument is an arbitrary string and should be a seachable unique name for the display instance. _scl_ and _sda_ Arguments are of type `DigitalPin`, e.g. `DigitalPin.P1`, representing the clock and data line pins.

**tm1650Display.displayOn(_name_, _brightness_)** - Turns on the named display. Also sets the currently selected display to that named. If it can't find a display instance with that name, or if no displays have been configured, it does nothing. The _brightness_ parameter sets the display brightness - zero means full brightness, 1 to 7 means less than full brightness with 1 being the least bright. You can use this `displayOn()` function to set the current display among multiple displays, and to change the brightness, it can be called as often as you like on a configured display.

**tm1650Display.setSpeed(_baud_)** - Sets the communication speed of the currently selected display. Can be set at any time on a configured display, needn't remain the same once set, needn't use "standard" baud rates.

**tm1650Display.displayClear()** - blank all digits of the currently selected display by writing zero data to them.

**tm1650Display.displayOff()**   - blank all digits of the currently selected display by turning it off. Display retains its current digit contents. Does not change the currently selected display. Display won't show any changes until turned back on with `displayOn()`, but re-writing the digit contents should work even though it remains dark while off. 

**tm1650Display.showNumber(_n_), showDecimal(_n_), showHex(_n_)** - display numbers using all four digits. See individual tooltips/comments.

**tm1650Display.showChar(_pos_, _c_)** - show an individual character, given as an ASCII character code, at display digit _pos_, where _pos_ is 0 to 3, with 0 as the leftmost digit. Obviously the range of characters is limited - see comments/tooltips. 

**tm1650Display.showString(_s_)** - show a string. Strings are truncated to fit in four digits. Decimal points/full stops are where possible combined with adjacent characters to use fewer digits and look more the way you'd expect. Obviously the range of characters is limited, see tooltips/comments.

**tm1650Display.digitRaw(_pos_)** - return segment data for the given digit position, 0 to 3, 0 is leftmost. Returns a number representing the bit pattern set at the given digit of the display, with '1' bits corresponding to the segments lit. Does not read from the display, just from an internal buffer.

**tm1650Display.digitChar(_pos_)** - return a character code corresponding to the bit pattern set at the given digit position. Works by interpreting bit pattern and returns the first matching character, so something that was written as a letter I will read back as a figure 1, for example. Returns zero for spaces and unrecognized patterns.

**tm1650Display.digits()** - returns a four character string representing the contents of the display with the same caveats as `digitChar()`, above.

Unless otherwise stated, all functions use the currently selected display instance, which can be altered only by `configure()` or `displayOn()`. So if you have multiple displays initialised, switch between them using the `displayOn()` function. Turning a display off makes it blank, but doesn't un-initialise or delete it. There is no "delete display" function - once instantiated, displays remain. Because these simple units don't have an ID, they can't share a pair of lines, unless you add some kind of additional hardware multiplexing.

The underlying display type is a class that can just be used directly if desired. Character and digit address tables were originally in the class but have been taken outside to make them const. The code is deliberately simple and generic so that it can readily be repurposed for other platforms/languages.

## Examples

The following will configure, turn on and display "HELO" on a tm1650 based 4-digit display with its clock line connected to pin P1 and its data line connected to in P0:
```
    tm1650Display.configure("display1", DigitalPin.P1, DigitalPin.P0)
    tm1650Display.displayOn("display1", 5)
    tm1650Display.showString("HEL0")
```    
The following will configure two displays using pins P1 and P0 for one, P3 and P2 for the other, and display "HELO" on one and "3.141" on the other.
```
    tm1650Display.configure("disp1", DigitalPin.P1, DigitalPin.P0)  /* disp1 is now the selected display */
    tm1650Display.configure("disp2", DigitalPin.P3, DigitalPin.P2)  /* now disp2 is the selected display */
    tm1650Display.displayOn("disp1", 5)                             /* disp1 is again the selected display */
    tm1650Display.showString("HEL0")
    tm1650Display.displayOn("disp2", 3)   /* disp2 is now the selected display, and a bit dimmer than disp1 */
    tm1650Display.showDecimal(3.141)
```

## General

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

![A rendered view of the blocks](https://github.com/carlwilliamsbristol/pxt-tm1650display/raw/master/block_preview.png)

#### Metadata (used for search, rendering)

* for PXT/microbit
<script src="https://makecode.com/gh-pages-embed.js"></script><script>makeCodeRender("{{ site.makecode.home_url }}", "{{ site.github.owner_name }}/{{ site.github.repository_name }}");</script>
