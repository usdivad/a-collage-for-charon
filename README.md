a collage for charon
========

Basis for interactive sound installations involving smartphones and biosignals

Used in:
- *a collage for charon* at [A R E A Gallery](http://area.gallery)'s COLLAGE / [Yi and the Thousand Moons](http://yiandthethousandmoons.com/) OST release party, 12/1/2017
- *Praeludium* at A R E A Gallery's POSSIBLE, 12/18/2017
- Dance & Design Making Lab, MIT IAP workshop, 1/21/2018



## Dependencies
First, install:
- Python 3.x (https://www.python.org/downloads/)
- pip (https://pip.pypa.io/en/stable/installing/)
- Node.js (https://nodejs.org/en/download/)
- NPM (https://www.npmjs.com/get-npm)
- Ableton Live (https://www.ableton.com/en/trial/) or any DAW you prefer

Then, install all project dependencies:
```
# Python dependencies
pip install -r requirements.txt

# Node.js dependencies
npm install
```

## Usage (Biodance)

### Running things
1. Run the Node server, which receives data from the sensors via Bluetooth and sends it via WebSockets:
`node rfduino-js/index.js`
    - You should see "Node server started" in the terminal
    - If you have devices streaming data, the data should pop up in the terminal as well
2. Run the Flask server, which receives data from the Node server and sends MIDI:
`python app.py`
    - You should see "Flask server started" in the terminal
    - If you visit http://localhost:5000/biodance_conductor you should reach a page that displays Flex, BPM, and EDA on the right-hand side
3. Open *morse Project/biomorse_native.als* in Ableton
    - If you visit http://localhost:5000/biodance_player and tap the blocks, you should hear notes triggered from Ableton. This is a useful way to test basic MIDI functionality
        - The way the "players" work is that each device gets assigned a different MIDI channel, which corresponds to one of the instruments in the Ableton project. For more details check out `socket.on('my_response'` in *static/biodance_conductor.js*

### Editing things
You can add/edit musical mappings in `static/biodance_conductor.js`. It uses the WebMidi.js (https://github.com/cotejp/webmidi) library to send MIDI.



**IMPORTANT:** You'll have to change the MIDI device name in order to get MIDI from the server to Ableton. Look for `var midiOutputName = ` in *static/biodance_conductor.js*; as of 1/13/2018 it's currently set to "IAC Driver Bus 1" in line 237. Make sure that the name of `midiOutputName` matches the midi *input* device you're using in Ableton. On Macs you can go to Audio MIDI Setup to see available devices. You can also do:
```
for (var i=0; i < WebMidi.outputs.length; i++) {
    console.log(i + ": " + WebMidi.outputs[i].name);
}
```
in the JavaSript console to get a list of available MIDI outputs.

