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



    // Event handler for server sent data.
    // The callback function is invoked whenever the server emits data
    // to the client. The data is then displayed in the "Received"
    // section of the page.
    socket.on('my_response', function(msg) {
        // $('#log').append('<br>' + $('<div/>').text('Received #' + msg.count + ': ' + msg.data).html());
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

    // ================================
    // David's additions

    // Construct keyboard layout
    var availableChars = Praeludium.alphabet.split("");
    shuffle(availableChars);
    var numCharsPerRow = 4;
    var keyboardLayout = [];
    for (var i=0; i<availableChars.length; i++) {
        var rowNum = Math.floor(i / numCharsPerRow);
        while (keyboardLayout.length <= rowNum) {
            keyboardLayout.push([]);
        }
        keyboardLayout[rowNum].push(availableChars[i]);
    }
    keyboardLayout.push([["space", "space"]]);

    // Bind keyboard
    $("#inline").keyboard({
        layout: keyboardLayout
    });

    // Adjust style
    $(".btn").css("width", "4.4em");
    $(".btn").css("height", "4em");
    $(".jqbtk-space").css("width", "13.2em");
    $(".keyboard-container").css("height", "1200px");

    // Generate session ID
    // From https://stackoverflow.com/a/19964557/4438760
    var sessionIdAlphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var sessionId = Array(12).join().split(',').map(function() { return sessionIdAlphabet.charAt(Math.floor(Math.random() * sessionIdAlphabet.length)); }).join("");

    // Stop recording if idle for a given amount of time
    var isRecording = false;
    var mostRecentTapTimestamp = 0;
    var tapIdleThreshold = 2500;
    window.setInterval(function(e) {
        if (isRecording) {
            var timestamp = Date.now();
            if (timestamp - mostRecentTapTimestamp >= tapIdleThreshold) {
                isRecording = false;
                var data = {
                    "id": sessionId,
                    "timestamp": timestamp,
                    "message": "stop"
                };
                socket.emit("my_broadcast_event", {
                    "data": JSON.stringify(data)
                });
                console.log(data);
            }
        }
    }, 100);

    // Send tap data to server
    // TODO:
    // - Figure out a better way to pass scale degree into handleTap()...
    // - Incorporate tap length using both touchstart and touchend?

    // $("#tappy0").bind("touchstart mousedown", function(event) {
    //     handleTap(0);
    //     return false;
    // });
    // $("#tappy1").bind("touchstart mousedown", function(event) {
    //     handleTap(1);
    //     return false;
    // });
    // $("#tappy2").bind("touchstart mousedown", function(event) {
    //     handleTap(2);
    //     return false;
    // });
    // $("#tappy3").bind("touchstart mousedown", function(event) {
    //     handleTap(3);
    //     return false;
    // });
    // $("#tappy4").bind("touchstart mousedown", function(event) {
    //     handleTap(4);
    //     return false;
    // });
    // $("#tappy5").bind("touchstart mousedown", function(event) {
    //     handleTap(5);
    //     return false;
    // });


    // Send keyboard data to server
    $(document).on("touchstart mousedown", ".jqbtk-row .btn", function(e) {
        var keyChar = $(this).attr("data-value");
        handleTap(keyChar);
        //console.log($(this).attr("data-value")); // this.getAttribute("data-value")
        return false;
    });


    function handleTap(keyChar) {
        // Construct tap data with timestamp
        var timestamp = Date.now();
        var tapData = {
            "id": sessionId,
            "timestamp": timestamp,
            "message": "tap",
            "keyChar": keyChar // Character
        }

        // Send start message if necessary
        if (!isRecording) {
            var startData = {
                "id": sessionId,
                "timestamp": timestamp,
                "message": "start"
            };

            socket.emit("my_broadcast_event", {
                "data": JSON.stringify(startData)
            });
            console.log(startData);
        }

        // Send tap data
        socket.emit("my_broadcast_event", {
            "data": JSON.stringify(tapData)
        });
        console.log(tapData);

        // Update
        isRecording = true;
        mostRecentTapTimestamp = timestamp;
    }

    // Fisher-Yates shuffle (thanks https://stackoverflow.com/a/6274381/4438760!)
    function shuffle(a) {
        var j, x, i;
        for (i = a.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            x = a[i];
            a[i] = a[j];
            a[j] = x;
    }
} 
});