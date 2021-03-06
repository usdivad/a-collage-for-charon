#!/usr/bin/env python
import datetime
import os
import time
from threading import Lock
from flask import Flask, render_template, session, request
from flask_socketio import SocketIO, emit, join_room, leave_room, \
    close_room, rooms, disconnect
from flask_jsglue import JSGlue

# Set this variable to "threading", "eventlet" or "gevent" to test the
# different async modes, or leave it set to None for the application to choose
# the best option based on installed packages.
async_mode = None

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode=async_mode)
thread = None
thread_lock = Lock()
jsglue = JSGlue(app)


def background_thread():
    """Example of how to send server generated events to clients."""
    count = 0
    while True:
        socketio.sleep(10)
        count += 1
        # socketio.emit('my_response',
        #               {'data': 'Server generated event', 'count': count},
        #               namespace='/test')


@app.route('/')
def index():
    return render_template('index.html', async_mode=socketio.async_mode)

@app.route("/listener")
def listen():
    return render_template("listener.html", async_mode=socketio.async_mode)

@app.route('/praeludium')
def praeludium_player():
    return render_template('praeludium_player.html', async_mode=socketio.async_mode)

@app.route('/praeludium_conductor')
def praeludium_conductor():
    return render_template('praeludium_conductor.html', async_mode=socketio.async_mode)

@app.route('/biodance_player')
def biodance_player():
    return render_template('biodance_player.html', async_mode=socketio.async_mode)

@app.route('/biodance_conductor')
def biodance_conductor():
    return render_template('biodance_conductor.html', async_mode=socketio.async_mode)

@app.route('/midi_mapping_helper')
def midi_mapping_helper():
    return render_template('midi_mapping_helper.html', async_mode=socketio.async_mode)

@app.route('/bfp_player')
def bfp_player():
    return render_template('bfp_player.html', async_mode=socketio.async_mode)

@app.route('/bfp_conductor')
def bfp_conductor():
    return render_template('bfp_conductor.html', async_mode=socketio.async_mode)



# ================================================================

@socketio.on('my_event', namespace='/test')
def test_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': message['data'], 'count': session['receive_count']})

@socketio.on('biosignals', namespace='/test')
def get_biosignals(message):
  st = datetime.datetime.fromtimestamp(time.time()).strftime('%Y-%m-%d %H:%M:%S')
  print(st + ": " + str(message))
  emit('biosignal_data', message, broadcast=True)


@socketio.on('my_broadcast_event', namespace='/test')
def test_broadcast_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': message['data'], 'count': session['receive_count']},
         broadcast=True)


@socketio.on('join', namespace='/test')
def join(message):
    join_room(message['room'])
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': 'In rooms: ' + ', '.join(rooms()),
          'count': session['receive_count']})


@socketio.on('leave', namespace='/test')
def leave(message):
    leave_room(message['room'])
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': 'In rooms: ' + ', '.join(rooms()),
          'count': session['receive_count']})


@socketio.on('close_room', namespace='/test')
def close(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response', {'data': 'Room ' + message['room'] + ' is closing.',
                         'count': session['receive_count']},
         room=message['room'])
    close_room(message['room'])


@socketio.on('my_room_event', namespace='/test')
def send_room_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': message['data'], 'count': session['receive_count']},
         room=message['room'])


@socketio.on('disconnect_request', namespace='/test')
def disconnect_request():
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': 'Disconnected!', 'count': session['receive_count']})
    disconnect()


@socketio.on('my_ping', namespace='/test')
def ping_pong():
    emit('my_pong')


@socketio.on('connect', namespace='/test')
def test_connect():
    global thread
    with thread_lock:
        if thread is None:
            thread = socketio.start_background_task(target=background_thread)
    emit('my_response', {'data': 'Connected', 'count': 0})

@socketio.on('disconnect', namespace='/test')
def test_disconnect():
    print('Client disconnected', request.sid)


if __name__ == '__main__':
    print("Flask server started")
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, port=port, debug=True)
