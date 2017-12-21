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
    var flex = 0,
        hr = 0,
        oldHr = 0, 
        thresh = 50,
        bpm = 0,
        eda = 0;
    var prev = new Date().getTime()/1000;
    var now = new Date().getTime()/1000;
    var lastBeat = new Date().getTime()/1000;
    var delay = 20;
    var buffer = [];
    var bpmInit = false;

    socket.on('biosignal_data', function (data) {
        oldHr = hr;
        flex = data.flex; 
        hr = data.hr;
        eda = data.eda; 
        buffer.push(hr);
        if (bpmInit) {
          buffer.shift();
        }
        $('#flex').text(flex);
        $('#eda').text(eda);



        midiOutput.sendControlChange(2, Math.max(0, Math.min(127, ((flex-200) / 500) * 127 )));
        midiOutput.sendControlChange(3, Math.max(0, Math.min(127, (eda/300) * 127)));
        if (eda > 500) {
            midiOutput.playNote("B4", 11, {"duration": 100});
        }

        if(hr - oldHr > thresh && now - lastBeat > .4){
        //beatOn
        midiOutput.playNote("C2", 11, {"duration": 100});


          document.getElementById("channel-bpm").style.background = 'rgba(255,0,0,0.8)';
        lastBeat = new Date().getTime()/1000;
        } else {
          document.getElementById("channel-bpm").style.background = 'rgba(255,0,0,0.1)';
        }
        now = new Date().getTime()/1000;
        if (!bpmInit) {
          if(now - prev >= 60) { 
            processBPM(buffer, thresh);
            prev = now;
            bpmInit = true;
          }
        } else {
          if(now - prev >= 2) {
            processBPM(buffer, thresh);
            prev = now;
          }
        }
    });

    function setBPM(_bpm) {
      console.log("setBPM");
      $('#bpm').text(_bpm);

      midiOutput.sendControlChange(1, _bpm);
    }

    function processBPM(buffer, thresh) {
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
      setBPM(_bpm);
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
                
                // var degree = msgData["degree"];
                // var midiNotes = midiNotesBySong[getCurrSong()];
                // console.log(getCurrSong() + ": " + midiNotes);
                // var midiNote = midiNotes[Math.max(0, Math.min(degree, midiNotes.length))];
                // // var midiNote = midiNotes[Math.floor(Math.random() * midiNotes.length)];

                var keyChar = msgData["keyChar"];
                var midiNote = midiNotesByChar[keyChar];

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

    // MIDI notes for Praeludium
    var midiNotesByChar = {};
    var midiScale = ["C", "D", "E", "F", "G", "A", "B"];
    var midiBaseOctave = 1;
    var availableChars = Praeludium.alphabet.split("");
    for (var i=0; i<availableChars.length; i++) {
        var c = availableChars[i];
        var pitch = midiScale[i % midiScale.length]
        var octave = (Math.floor(i / midiScale.length) + midiBaseOctave).toString();
        var note = pitch + octave;
        midiNotesByChar[c] = note;
    }
    console.log(midiNotesByChar);

    var midiNumChannels = 8;
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
        }
    });

    function getCurrSong() {
        return currSong;
    }

});