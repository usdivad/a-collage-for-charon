$(document).ready(function() {
    console.log("moo");

    // Setup MIDI
    var midiEnabled = false;
    var midiOutputName = "IAC Driver Bus 1";
    var midiOutput;

    WebMidi.enable(function(err) {
        if (err) {
            console.log("ERROR: " + err);
            return;
        }
        else {
            midiEnabled = true;
            console.log("WebMidi enabled");

            // console.log(WebMidi.inputs);
            // console.log(WebMidi.outputs);

            midiOutput = WebMidi.getOutputByName(midiOutputName);
            //midiOutput.sendControlChange(3, 5);
        }
    });


    // UI
    $("#midiCCTrigger").bind("mousedown touchstart", function(e) {
        var midiCCNum = parseInt($("#midiCCNum").val());
        if (midiEnabled) {
            midiOutput.sendControlChange(midiCCNum, 60);
            console.log("Triggered CC " + midiCCNum);
        }
    });

    $("#midiNoteTrigger").bind("mousedown touchstart", function(e) {
        var midiNoteName = $("#midiNoteName").val();
        if (midiEnabled) {
            midiOutput.playNote(midiNoteName, 1, {"duration": 100});
            console.log("Triggered note " + midiNoteName);
        }
    });
});