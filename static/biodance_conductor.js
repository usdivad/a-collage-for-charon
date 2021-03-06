$(document).ready(function() {
    // Use a "/test" namespace.
    // An application can open a connection on multiple namespaces, and
    // Socket.IO will multiplex all those connections on a single
    // physical channel. If you don't care about multiple channels, you
    // can set the namespace to an empty string.
    namespace = '/test';

    // Connect to the Socket.IO server.
    // The connection URL has the following format:
    //     http[s]://<domain>:<port>[/<namespace>]
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + namespace);

    // Event handler for new connections.
    // The callback function is invoked when a connection with the
    // server is established.
    socket.on('connect', function() {
        socket.emit('my_event', {data: 'I\'m connected!'});
        });
    var flex = [0, 0, 0, 0, 0],
        hr = [0, 0, 0, 0, 0],
        oldHr = [0, 0, 0, 0, 0],
        thresh = 50,
        bpm = [0, 0, 0, 0, 0],
        eda = [0, 0, 0, 0, 0];
    var _prev = new Date().getTime()/1000;
    var _now = new Date().getTime()/1000;
    var _lastBeat = new Date().getTime()/1000;
    var prev = [_prev, _prev, _prev, _prev, _prev];
    var now = [_now, _now, _now, _now, _now];
    var lastBeat = [_lastBeat, _lastBeat, _lastBeat, _lastBeat, _lastBeat];
    var delay = 20;
    var buffer = [[], [], [], [], []];
    var bpmInit = [false, false, false, false, false];
    var midiParams = {
      "channel": [1,2,3,4,5],
      "flexCC": [1,2,3,4,5],
      "hrCC": [6,7,8,9,10],
      "edaCC": [11,12,13,14,15],
      "bpmCC": [16, 17, 18, 19, 20],
      "edaNote": ["C1", "G1", "C2", "G2", "C3"],
      "heartbeatNote": ["C4", "G4", "C4", "G4", "C4"]
    };
    var midiNoteDur = 300;
    var sensorIds = [];


    // Conductor triggerin
    var conductorMidiNotes = [
        "C3", "D3", "E3", "G3", "A3",
        "C4", "D4", "E4", "G4", "A4",
        "C5"
    ];


    // BIOSIGNAL HANDLER
    socket.on('biosignal_data', function (data) {
        // Update biosignal values
        id = data.id;
        _id = id + 1;
        oldHr[id] = hr[id];
        flex[id] = data.flex;
        hr[id] = data.hr;
        eda[id] = data.eda;
        console.log("id: " + id);
        // console.log(id);
        //

        if (!sensorIds.includes(id)) {
            sensorIds.push(id);

            $("#sensorIdsDisp").text("found " + sensorIds.length + " sensors: [" + sensorIds.toString() + "]");
        }

        // MIDI params
        var midiChannel = midiParams["channel"][id];
        var midiCCFlex = midiParams["flexCC"][id];
        var midiCCHr = midiParams["hrCC"][id];
        var midiCCEda = midiParams["edaCC"][id];
        var midiEdaNote = midiParams["edaNote"][id];
        var midiHeartbeatNote = midiParams["heartbeatNote"][id];

        buffer[id].push(hr);

        if (bpmInit) {
          buffer[id].shift();
        }
        flex_id = '#flex-' + _id;
        if (eda[id] == 1023) {
          console.log(_id);
        }
        eda_id = '#eda-' + _id;
        $(flex_id).text(flex[id]);
        $(eda_id).text(eda[id]);


        // --------------------------------
        // SEND MIDI

        if (!midiEnabled) {
            return;
        }

        // CC

        // Scale and send flex data stream as CC
        // midiOutput.sendControlChange(2, Math.max(0, Math.min(127, ((flex[id]-200) / 500) * 127 )));
        if (isMidiTurnedOn) {
          midiOutput.sendControlChange(midiCCFlex, scaleBiosignalToMidi(flex[id], "flex"));
          console.log("flex: (cc" + midiCCFlex + "): " + flex[id] + " --> " + scaleBiosignalToMidi(flex[id], "flex"));
        }

        // Scale and send EDA data stream as CC
        // midiOutput.sendControlChange(3, Math.max(0, Math.min(127, (eda[id]/300) * 127)));
        if (isMidiTurnedOn) {
          midiOutput.sendControlChange(midiCCEda, scaleBiosignalToMidi(eda[id], "eda"));
          console.log("eda (cc" + midiCCEda + "): " + eda[id] + " --> " + scaleBiosignalToMidi(eda[id], "eda"));
        }

        // Scale and send heart rate data stream as CC
        if (isMidiTurnedOn) {
          midiOutput.sendControlChange(midiCCHr, scaleBiosignalToMidi(hr[id], "hr"));
          console.log("hr (cc" + midiCCHr + "): " + hr[id] + " --> " + scaleBiosignalToMidi(hr[id], "hr"));
        }

        // Notes

        // If EDA exceeds a given threshold, play note on MIDI channel
        if (eda[id] > 500) {
            if (isMidiTurnedOn) {
              midiOutput.playNote(midiEdaNote, midiChannel, {"duration": midiNoteDur});
              console.log("edaNote: " + midiEdaNote + ", channel " + midiChannel);
            }
        }

        // If a heartbeat is detected, play note on MIDI channel
        channel_id = 'channel-bpm-' + _id;
        console.log(lastBeat, hr, oldHr, now);
        if(hr[id] - oldHr[id] > thresh && now[id] - lastBeat[id] > .4){
            console.log("beat: " + _id);
            //beatOn
            if (isMidiTurnedOn) {
              midiOutput.playNote(midiHeartbeatNote, midiChannel, {"duration": midiNoteDur});
              console.log("heartbeatNote: " + midiHeartbeatNote + ", channel " + midiChannel);
            }
            document.getElementById(channel_id).style.background = 'rgba(255,0,0,0.8)';
            lastBeat[id] = new Date().getTime()/1000;
        } else {
            console.log("no beat: " + _id);
            document.getElementById(channel_id).style.background = 'rgba(255,0,0,0.1)';
        }


        // Calculate BPM
        now[id] = new Date().getTime()/1000;
        if (!bpmInit[id]) {
          if(now - prev >= 60) {
            processBPM(buffer[id], thresh, _id);
            prev[id] = now[id];
            bpmInit[id] = true;
          }
        } else {
          if(now[id] - prev[id] >= 2) {
            processBPM(buffer[id], thresh, _id);
            prev[id] = now[id];
          }
        }
    });

    function setBPM(_bpm, id) {
      console.log("setBPM");
      bpm_id = '#bpm-' + id;
      $(bpm_id).text(_bpm);
      midiCCBpm = midiParams["bpmCC"][id];

      midiOutput.sendControlChange(midiCCBpm, scaleBiosignalToMidi(_bpm, "bpm"));
      console.log("bpm (cc" + midiCCBpm + "): " + _bpm + " --> " + scaleBiosignalToMidi(_bpm, "bpm"));
    }

    function processBPM(buffer, thresh, id) {
      _bpm = 0;
      _prev = 0;
      lastBeat = -3;
      var i;
      for (i = 1; i < buffer.length; i++) {
        _now = buffer[i];
        _prev = buffer[i-1];
        if (_now - _prev > thresh && i - lastBeat > 4) {
          _bpm++;
          lastBeat = i;
        }
      }
      setBPM(_bpm, id);
    }

    function scaleBiosignalToMidi(biosignal, biosignalType) {
        var denom = 1024;

        switch (biosignalType) {
          case "flex":
            denom = 500;
            break;
          case "eda":
            denom = 60;
            break;
          case "hr":
            denom = 100;
            break;
          case "bpm":
            denom = 200;
          default:
            // pass
        }

        var midiValue = (biosignal / denom) * 127;
        midiValue = Math.floor(Math.max(0, Math.min(midiValue, 127)));
        return midiValue;
    }

// Event handler for server sent data.
    // The callback function is invoked whenever the server emits data
    // to the client. The data is then displayed in the "Received"
    // section of the page.
    socket.on('my_response', function(msg) {
        // Send MIDI
        // TODO: Construct list and Markov chain and all that good stuff
        if (midiEnabled) {
            // Message data
            console.log(msg.data);
            var msgData = {};
            try {
                msgData = JSON.parse(msg.data);
            }
            catch (e) {
                console.log("ERROR when parsing data for message '" + msg.data + "': " + e);
                return;
            }

            // Only send MIDI if it's a tap
            if (msgData["message"] == "tap") {
                // Note
                // TODO:
                // - Current song selection
                // - Markov
                // var midiNote = midiNotes[Math.floor(msgData["degree"] * midiNotes.length)]
                var degree = msgData["degree"];
                var midiNotes = midiNotesBySong[getCurrSong()];
                console.log(getCurrSong() + ": " + midiNotes);
                var midiNote = midiNotes[Math.max(0, Math.min(degree, midiNotes.length))];
                // var midiNote = midiNotes[Math.floor(Math.random() * midiNotes.length)];

                // Channel
                // TODO: Increment channel num and use modulo
                var midiChannelNum = 0;
                var sessionId = msgData["id"];
                if (sessionIdToMidiChannelNum.hasOwnProperty(sessionId)) {
                    midiChannelNum = sessionIdToMidiChannelNum[sessionId];
                }
                else {
                    midiChannelNum = (numSessions % midiNumChannels) + 1;
                    console.log("new session: " + numSessions);

                    numSessions++;

                    // midiChannelNum = Math.floor(Math.random()*midiNumChannels) + 1;
                    sessionIdToMidiChannelNum[sessionId] = midiChannelNum;
                }

                // Send the MIDI output!
                if (!midiOutput) {
                  return;
                }
                midiOutput.playNote(midiNote, midiChannelNum, {"duration": "100"});
                console.log(sessionId + "," + midiNote + "," + midiChannelNum);
                // midiOutput.playNote("C4");
            }
        }

        // $('#log').append('<br>' + $('<div/>').text('Received #' + msg.count + ': ' + msg.data).html());
        // $('#log').html('Received #' + msg.count + ': ' + msg.data);

        var logMsg = "[" + new Date().toJSON() + "]: #" + msg.count + ": " + msg.data;
        if (mostRecentTaps.length >= numMostRecentTaps) {
            // mostRecentTaps[msg.count % numMostRecentTaps] = logMsg;
            mostRecentTaps.pop();
        }
        // else {
            mostRecentTaps.unshift(logMsg);
        // }
        $("#log").html(mostRecentTaps.join("<br>"));
    });

    // Interval function that tests message latency by sending a "ping"
    // message. The server then responds with a "pong" message and the
    // round trip time is measured.
    var ping_pong_times = [];
    var start_time;
    window.setInterval(function() {
        start_time = (new Date).getTime();
        socket.emit('my_ping');
    }, 1000);

    // Handler for the "pong" message. When the pong is received, the
    // time from the ping is stored, and the average of the last 30
    // samples is average and displayed.
    socket.on('my_pong', function() {
        var latency = (new Date).getTime() - start_time;
        ping_pong_times.push(latency);
        ping_pong_times = ping_pong_times.slice(-30); // keep last 30 samples
        var sum = 0;
        for (var i = 0; i < ping_pong_times.length; i++)
            sum += ping_pong_times[i];
        $('#ping-pong').text(Math.round(10 * sum / ping_pong_times.length) / 10);
    });

    // Handlers for the different forms in the page.
    // These accept data from the user and send it to the server in a
    // variety of ways
    $('form#emit').submit(function(event) {
        socket.emit('my_event', {data: $('#emit_data').val()});
        return false;
    });
    $('form#broadcast').submit(function(event) {
        socket.emit('my_broadcast_event', {data: $('#broadcast_data').val()});
        return false;
    });
    $('form#join').submit(function(event) {
        socket.emit('join', {room: $('#join_room').val()});
        return false;
    });
    $('form#leave').submit(function(event) {
        socket.emit('leave', {room: $('#leave_room').val()});
        return false;
    });
    $('form#send_room').submit(function(event) {
        socket.emit('my_room_event', {room: $('#room_name').val(), data: $('#room_data').val()});
        return false;
    });
    $('form#close').submit(function(event) {
        socket.emit('close_room', {room: $('#close_room').val()});
        return false;
    });
    $('form#disconnect').submit(function(event) {
        socket.emit('disconnect_request');
        return false;
    });

    // Update currSong with selected song
    $("#songSelect").change(function() {
        currSong = $("#songSelect option:selected").val();
        console.log(currSong);
    });

    // ================================
    // David's additions
    var midiEnabled = false;
    var midiOutputName = "IAC Driver Bus 1";
    var midiOutput;
    // var midiNotes = ["E4", "G4", "A4", "B4", "D5", "E5"];
    var midiNotesBySong = {
        "02. Moondrops_8x.mp3": ["E4", "G4", "A4", "B4", "D5", "E5"],
        "04. Orange Grey Skies_8x.mp3": ["G4", "Bb4", "C5", "D5", "F5", "G5"],
        "06. Poster Child_8x.mp3": ["C4", "Eb4", "F4", "G4", "Bb4", "C5"],
        "08. Interlude_8x.mp3": ["G4", "Bb4", "C5", "D5", "F5", "G5"],
        "10. Chant of the Craftspeople_8x.mp3": ["D4", "F4", "G4", "A4", "C5", "D5"],
        "12. A New Home_8x.mp3": ["A3", "D4", "G4", "A4", "C5", "D5"],
        "13. Orange Grey Skies (Reprise)_8x.mp3": ["A4", "B4", "C#5", "E5", "F#5", "A5"],
    };
    var midiNumChannels = 10;
    var sessionIdToMidiChannelNum = {};
    var numSessions = 0;
    var currSong = "02. Moondrops_8x.mp3";

    var mostRecentTaps = [];
    var numMostRecentTaps = 25;

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

    function getCurrSong() {
        return currSong;
    }

    // MIDI on/off button
    var isMidiTurnedOn = true;
    $("#midiOnOff").bind("mousedown touchstart", function(e) {
      isMidiTurnedOn = !isMidiTurnedOn;
      console.log("mmm");
      $("#midiOnOffDisp").text(isMidiTurnedOn ? "midi is ON" : "midi is OFF");
    });


    // Conductor triggering
    $("body").keyup(function(e) {
        var k = e.keyCode;
        // console.log(k);

        var channel = k - 48; // key code 49 -> MIDI channel 1
        if (channel > 0 && channel <= midiParams["channel"].length) {
            var triggerNote = conductorMidiNotes[Math.floor(Math.random() * conductorMidiNotes.length)];

            midiOutput.playNote(triggerNote, channel, {"duration": midiNoteDur});

            console.log("conductor triggered note " + triggerNote + " on channel " + channel);
        }
    });

});
